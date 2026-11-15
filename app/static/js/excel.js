import { api } from "./data-source.js";
import { downloadBlob, readableError, showToast } from "./common.js";
import { validateExcelFile } from "./validation.js";

const fileInput = document.getElementById("excel-file");
const importButton = document.getElementById("import-contacts");
const exportButton = document.getElementById("export-contacts");
const selectedFile = document.getElementById("selected-file");
const errorBox = document.getElementById("import-errors");
const resultBox = document.getElementById("import-result");
const dropzone = document.getElementById("file-dropzone");
let currentFile = null;

function setError(message = "") {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

function selectFile(file) {
  currentFile = file ?? null;
  const error = validateExcelFile(currentFile);
  setError(error ?? "");
  selectedFile.textContent = currentFile ? `${currentFile.name} · ${(currentFile.size / 1024).toFixed(1)} KB` : "尚未选择文件";
  importButton.disabled = Boolean(error);
  resultBox.hidden = true;
}

fileInput.addEventListener("change", () => selectFile(fileInput.files[0]));
["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
}));
["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
}));
dropzone.addEventListener("drop", (event) => selectFile(event.dataTransfer.files[0]));

importButton.addEventListener("click", async () => {
  const error = validateExcelFile(currentFile);
  if (error) { setError(error); return; }
  importButton.disabled = true;
  importButton.textContent = "正在导入…";
  setError();
  try {
    const result = await api.importExcel(currentFile);
    const succeeded = result?.success_count ?? result?.imported ?? 0;
    const failed = result?.failed_count ?? result?.failed ?? 0;
    const errors = result?.errors ?? [];
    resultBox.replaceChildren();
    const title = document.createElement("strong");
    title.textContent = `导入完成：成功 ${succeeded} 条，失败 ${failed} 条`;
    resultBox.append(title);
    if (errors.length) {
      const list = document.createElement("ul");
      errors.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = typeof item === "string" ? item : `第 ${item.row ?? "—"} 行：${item.message ?? item.reason ?? "格式错误"}`;
        list.append(li);
      });
      resultBox.append(list);
    }
    resultBox.hidden = false;
    showToast(`成功导入 ${succeeded} 条联系人`);
  } catch (error) {
    setError(readableError(error));
  } finally {
    importButton.disabled = false;
    importButton.textContent = "开始导入";
  }
});

exportButton.addEventListener("click", async () => {
  exportButton.disabled = true;
  exportButton.textContent = "正在导出…";
  try {
    const { blob, filename } = await api.exportExcel();
    downloadBlob(blob, filename || "ContactHub.xlsx");
    showToast("Excel 文件已生成并开始下载");
  } catch (error) {
    showToast(readableError(error), "error");
  } finally {
    exportButton.disabled = false;
    exportButton.textContent = "导出全部联系人";
  }
});
