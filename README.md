# Mystic Recipe Oracle / 食运通

一个带有强烈玄学叙事风格的 AI 菜谱应用。

用户上传一张图片，再结合属相、星座、心情、口味和幸运数字，服务端会调用大模型生成一份“命理契合”的专属灵膳推荐，并支持：

- 生成神秘风格的菜谱文案与食材清单
- 生成菜品视觉图
- 将结果保存到本地 SQLite
- 查看历史灵膳记录
- 导出结果图片
- 通过 Capacitor 打包到 Android

## 技术栈

- 前端：React 19 + TypeScript + Vite + Tailwind CSS v4
- 动效：Motion
- 后端：Express + TSX
- 数据库：better-sqlite3（本地 `recipes.db`）
- 移动端：Capacitor Android
- AI 能力：
  - SiliconFlow 聊天补全接口，用于生成菜谱结构化内容
  - 火山引擎 Ark 图像生成接口，用于生成菜品视觉图

## 功能概览

- 首页上传图片并填写命理偏好
- 调用 `/api/recommend` 生成 AI 灵膳推荐
- 调用 `/api/recipes` 保存、查询、删除历史记录
- 本地持久化用户签到/修炼状态
- 支持将推演结果导出为 JPG 图片

## 目录结构

```text
.
├─ src/                 # React 前端
├─ server.ts            # Express 服务与 SQLite/AI 接口
├─ android/             # Capacitor Android 工程
├─ capacitor.config.ts  # Capacitor 配置
├─ .env.example         # 环境变量模板
└─ recipes.db           # 运行后生成的本地数据库文件
```

## 环境要求

- Node.js 20+
- npm 10+
- Android Studio（仅在需要构建 Android 时）

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量模板

```bash
cp .env.example .env
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env
```

3. 按需填写 `.env`

至少建议配置：

- `SILICONFLOW_API_KEY`
- `PORT`

4. 启动开发环境

```bash
npm run dev
```

默认会启动 Express 服务，并通过 Vite 中间件提供前端页面。

访问地址：

- `http://localhost:3000`

## 可用脚本

```bash
npm run dev      # 启动本地开发服务
npm run build    # 构建前端并打包 Node 服务到 dist/
npm run start    # 运行生产构建产物
npm run preview  # 预览 Vite 前端
npm run lint     # TypeScript 类型检查
```

注意：`package.json` 中的 `clean` 脚本使用了类 Unix 命令 `rm -rf`，在 Windows PowerShell 下默认不可直接使用，如需清理可手动删除 `dist/`。

## 环境变量说明

参考 [`.env.example`](./.env.example)。

当前项目最重要的变量如下：

- `PORT`：服务监听端口，默认可设为 `3000`
- `NODE_ENV`：运行环境，生产构建时通常为 `production`
- `SILICONFLOW_API_KEY`：用于生成菜谱内容
- `SILICONFLOW_MODEL`：用于指定聊天模型，必须显式配置
- `ARK_API_KEY`：用于生成菜品图片
- `ARK_MODEL`：用于指定图像模型，必须显式配置

说明：

- 服务启动时会严格校验上述关键环境变量，缺失任意一项都会直接报错退出。
- 项目运行后会在根目录生成 `recipes.db`，用于保存历史灵膳记录。

## Android 构建

首次同步依赖并生成前端产物：

```bash
npm run build
npx cap sync android
```

在 Android Studio 中打开原生工程：

```bash
npx cap open android
```

常见流程：

1. 修改 Web 代码
2. 执行 `npm run build`
3. 执行 `npx cap sync android`
4. 回到 Android Studio 运行或打包

## API 概览

### `POST /api/recommend`

根据用户上传图片与偏好生成灵膳推荐。

请求体字段：

- `imageBase64`
- `taste`
- `mood`
- `zodiac`
- `constellation`
- `luckyNumber`

### `GET /api/recipes`

获取历史收藏记录。

### `POST /api/recipes`

保存一条菜谱记录。

### `DELETE /api/recipes/:id`

删除一条菜谱记录。

## 数据存储

- 数据库文件：`recipes.db`
- 数据表：`recipes`
- 存储内容：菜名、推荐理由、食材、步骤、注意事项、图片、创建时间

## 已知事项

- 当前服务端固定监听 `3000` 端口，若后续需要完全由环境变量控制，可再调整 `server.ts`
- 图像生成相关变量在当前实现中存在“模板已预留、代码待完全接线”的情况
- 该项目更适合作为创意展示、课程作业、Hackathon 或产品原型

## License

未单独声明许可证时，默认按仓库实际约定处理。
