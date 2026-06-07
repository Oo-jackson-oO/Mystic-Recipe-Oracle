[OPEN] Android JSON parse debug session

## Session

- session_id: `android-json-parse`
- symptom: 真机调试时报错 `Unexpected token '<', "<! doctype "... is not valid JSON`
- expectation: 前端请求接口时应返回 JSON，而不是 HTML 文档

## Hypotheses

1. 真机环境下 `/api/*` 请求命中了静态页面入口并返回 `index.html`
2. Capacitor 真机运行时未连接到本地 Express 服务
3. 相对路径接口在 Android WebView 中解析基址错误
4. 某个接口错误分支返回 HTML，前端仍执行 `response.json()`

## Evidence Plan

- 检查前端所有 `fetch` 调用与 `response.json()` 使用点
- 检查 Capacitor 配置与 Android 真机访问基址
- 检查服务端路由与 SPA fallback 是否会回退到 `index.html`
- 如需进一步确认，再做最小化日志插桩

## Status

- 当前阶段：静态排查
- 尚未修改业务逻辑

## Evidence

- `src/App.tsx` 使用相对路径请求：
  - `fetch("/api/recommend")`
  - `fetch("/api/recipes")`
- `src/` 内不存在 `API_BASE_URL`、`VITE_*` 或其他基址配置
- `capacitor.config.ts` 只有 `webDir: 'dist'`，没有 `server.url`
- Android 原生层只有 `BridgeActivity`，没有任何内嵌 Node/Express 运行机制
- `server.ts` 才是实际提供 `/api/*` 的地方，说明 API 只存在于 Node 进程中
- `server.ts` 生产模式对未知路由会回退 `index.html`，这与 “收到 HTML 后 JSON.parse 失败” 的症状一致

## Hypothesis Evaluation

1. 真机环境下 `/api/*` 请求命中了静态页面入口并返回 `index.html`
   - 状态：高度疑似成立
2. Capacitor 真机运行时未连接到本地 Express 服务
   - 状态：成立
3. 相对路径接口在 Android WebView 中解析基址错误
   - 状态：成立
4. 某个接口错误分支返回 HTML，前端仍执行 `response.json()`
   - 状态：部分成立，前端确实无保护直接解析 JSON

## Interim Conclusion

- 根因不是返回数据格式偶发错误，而是双端架构缺少统一 API 基址设计
- 现状只适合 Web 同机开发，不适合直接打包为可独立运行的移动端 App

## Fix Applied

- 新增 `src/api.ts`
  - 统一解析 API 基址
  - Web 端默认同域
  - 移动端要求显式配置 `VITE_API_BASE_URL`，或通过 `CAPACITOR_SERVER_URL` 走真机调试
  - 在解析 JSON 前检查 `content-type`
  - 如果后端返回 HTML，抛出可读错误而不是原生 JSON 解析异常
- 更新 `src/App.tsx`
  - 所有 `/api/*` 请求改为通过统一 API 层发送
  - 保留最小化调试上报点，采集请求 URL 与响应类型
- 更新 `server.ts`
  - `PORT` 改为支持环境变量
  - 增加基础 CORS 头，支持双端访问独立后端
  - 增加 `/api` 兜底 JSON 404，避免 API 错误路径落回 `index.html`
- 更新 `capacitor.config.ts`
  - 支持通过 `CAPACITOR_SERVER_URL` 连接真机调试服务器
- 更新 `.env.example`
  - 增加 `VITE_API_BASE_URL`
  - 增加 `CAPACITOR_SERVER_URL`
  - 增加 `CORS_ORIGIN`

## Verification

- `npm run lint` 已通过
- 尚待用户在真机环境执行 `pre-fix` / `post-fix` 体验验证
