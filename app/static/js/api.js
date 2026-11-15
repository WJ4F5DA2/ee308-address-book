export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request(path, options = {}, fetchImplementation = fetch) {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetchImplementation(path, { ...options, headers });
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok || payload?.success === false) {
    throw new ApiError(payload?.message || `请求失败（HTTP ${response.status}）`, response.status, payload?.data);
  }
  return payload?.data ?? payload;
}

async function exportExcel(fetchImplementation = fetch) {
  const response = await fetchImplementation("/api/contacts/export");
  if (!response.ok) {
    let message = `导出失败（HTTP ${response.status}）`;
    try { message = (await response.json()).message || message; } catch { /* Non-JSON error response. */ }
    throw new ApiError(message, response.status);
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i)?.[1];
  return { blob: await response.blob(), filename: filename ? decodeURIComponent(filename) : "ContactHub.xlsx" };
}

export function createContactApi(fetchImplementation = fetch) {
  const call = (path, options) => request(path, options, fetchImplementation);
  return {
    list: (favoritesOnly = false) => call(favoritesOnly ? "/api/favorites" : "/api/contacts"),
    get: (id) => call(`/api/contacts/${encodeURIComponent(id)}`),
    create: (contact) => call("/api/contacts", { method: "POST", body: JSON.stringify(contact) }),
    update: (id, contact) => call(`/api/contacts/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(contact) }),
    remove: (id) => call(`/api/contacts/${encodeURIComponent(id)}`, { method: "DELETE" }),
    setFavorite: (id, favorite) => call(`/api/contacts/${encodeURIComponent(id)}/favorite`, { method: favorite ? "POST" : "DELETE" }),
    importExcel: (file) => {
      const body = new FormData();
      body.append("file", file);
      return call("/api/contacts/import", { method: "POST", body });
    },
    exportExcel: () => exportExcel(fetchImplementation),
  };
}

export const contactApi = createContactApi();
