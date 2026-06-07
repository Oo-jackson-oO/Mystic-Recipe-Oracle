const MOBILE_PROTOCOLS = new Set(["capacitor:", "ionic:", "file:"]);

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function previewText(text: string, maxLength = 120) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function resolveApiUrl(path: string) {
  const normalizedPath = normalizePath(path);
  const explicitBase = import.meta.env.VITE_API_BASE_URL?.trim();

  if (explicitBase) {
    return `${trimTrailingSlash(explicitBase)}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    const { protocol, origin } = window.location;
    if (!MOBILE_PROTOCOLS.has(protocol)) {
      return new URL(normalizedPath, origin).toString();
    }
  }

  throw new Error(
    "当前运行环境未配置可用的 API 地址。移动端请在构建时设置 VITE_API_BASE_URL，或在真机调试时通过 CAPACITOR_SERVER_URL 指向可访问的开发服务器。"
  );
}

export async function apiJson<T>(path: string, init?: RequestInit) {
  const url = resolveApiUrl(path);
  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const rawText = await response.text().catch(() => "");
    throw new Error(
      `接口请求失败 (${response.status})。请求地址：${url}。响应类型：${contentType || "unknown"}。响应片段：${previewText(rawText)}`
    );
  }

  if (!contentType.toLowerCase().includes("application/json")) {
    const rawText = await response.text().catch(() => "");
    throw new Error(
      `接口返回了非 JSON 响应。请求地址：${url}。响应类型：${contentType || "unknown"}。响应片段：${previewText(rawText)}`
    );
  }

  const data = (await response.json()) as T;
  return { data, response, url };
}
