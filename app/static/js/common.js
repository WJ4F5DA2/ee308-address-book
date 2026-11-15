export const isMockMode = new URLSearchParams(window.location.search).get("mock") === "1";

export const methodLabels = {
  phone: "电话",
  email: "邮箱",
  social: "社交账号",
  address: "邮寄地址",
};

export function methodLabel(type) {
  return methodLabels[type] ?? type;
}

export function getInitial(name) {
  return Array.from((name || "?").trim())[0]?.toUpperCase() ?? "?";
}

export function showToast(message, type = "success") {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const toast = document.createElement("div");
  toast.className = `toast${type === "error" ? " toast-error" : ""}`;
  toast.textContent = message;
  region.append(toast);
  window.setTimeout(() => toast.remove(), 3600);
}

export function confirmAction(message) {
  const dialog = document.getElementById("confirm-dialog");
  document.getElementById("confirm-message").textContent = message;
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function readableError(error) {
  if (error instanceof TypeError) return "无法连接服务器，请检查后端是否已启动。";
  return error?.message || "操作失败，请稍后重试。";
}

function initializeShell() {
  const page = document.body.dataset.page;
  const active = document.querySelector(`[data-nav="${page}"]`);
  active?.setAttribute("aria-current", "page");
  const mode = document.getElementById("runtime-mode");
  if (mode) mode.textContent = isMockMode ? "演示模式 · 无数据库" : "同源 API 模式";
  if (isMockMode) {
    const banner = document.createElement("div");
    banner.className = "demo-banner";
    banner.textContent = "前端演示模式：数据仅保留在当前浏览器标签页，不会写入数据库。";
    document.body.append(banner);
  }
}

initializeShell();
