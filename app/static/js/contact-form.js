import { api } from "./data-source.js";
import { methodLabel, readableError, showToast } from "./common.js";
import { validateContact } from "./validation.js";

const dialog = document.getElementById("contact-dialog");
const form = document.getElementById("contact-form");
const methodList = document.getElementById("method-list");
const errorBox = document.getElementById("contact-form-errors");
let savedCallback = null;

function createField(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function addMethodRow(method = { type: "phone", value: "", label: "" }) {
  const row = createField("div", "method-row");
  const type = document.createElement("select");
  type.setAttribute("aria-label", "联系方式类型");
  ["phone", "email", "social", "address"].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = methodLabel(value);
    option.selected = method.type === value;
    type.append(option);
  });
  const value = document.createElement("input");
  value.setAttribute("aria-label", "联系方式内容");
  value.placeholder = "请输入联系方式";
  value.maxLength = 255;
  value.value = method.value ?? "";
  const label = document.createElement("input");
  label.setAttribute("aria-label", "联系方式标签");
  label.placeholder = "标签（可选）";
  label.maxLength = 50;
  label.value = method.label ?? "";
  const remove = createField("button", "method-remove", "×");
  remove.type = "button";
  remove.setAttribute("aria-label", "删除这条联系方式");
  remove.addEventListener("click", () => {
    if (methodList.children.length === 1) {
      type.value = "phone";
      value.value = "";
      label.value = "";
      value.focus();
    } else {
      row.remove();
    }
  });
  row.append(type, value, label, remove);
  methodList.append(row);
  value.focus();
  return row;
}

function renderErrors(errors) {
  errorBox.replaceChildren();
  if (!errors.length) {
    errorBox.hidden = true;
    return;
  }
  const list = document.createElement("ul");
  errors.forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    list.append(item);
  });
  errorBox.append(list);
  errorBox.hidden = false;
}

function readForm() {
  return {
    name: document.getElementById("contact-name").value.trim(),
    company: document.getElementById("contact-company").value.trim(),
    position: document.getElementById("contact-position").value.trim(),
    remark: document.getElementById("contact-remark").value.trim(),
    methods: Array.from(methodList.children).map((row) => {
      const [type, value, label] = row.querySelectorAll("select, input");
      return { type: type.value, value: value.value.trim(), label: label.value.trim() };
    }),
  };
}

export function openContactForm(contact = null, onSaved = null) {
  savedCallback = onSaved;
  form.reset();
  methodList.replaceChildren();
  renderErrors([]);
  document.getElementById("contact-id").value = contact?.id ?? "";
  document.getElementById("contact-dialog-title").textContent = contact ? "编辑联系人" : "新增联系人";
  document.getElementById("contact-name").value = contact?.name ?? "";
  document.getElementById("contact-company").value = contact?.company ?? "";
  document.getElementById("contact-position").value = contact?.position ?? "";
  document.getElementById("contact-remark").value = contact?.remark ?? "";
  (contact?.methods?.length ? contact.methods : [{ type: "phone", value: "", label: "" }]).forEach(addMethodRow);
  dialog.showModal();
  document.getElementById("contact-name").focus();
}

document.getElementById("add-method").addEventListener("click", () => addMethodRow());
["contact-form-close", "contact-form-cancel"].forEach((id) => {
  document.getElementById(id).addEventListener("click", () => dialog.close());
});
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const contact = readForm();
  const errors = validateContact(contact);
  if (errors.length) {
    renderErrors(errors);
    errorBox.focus();
    return;
  }
  const id = document.getElementById("contact-id").value;
  const saveButton = document.getElementById("contact-form-save");
  saveButton.disabled = true;
  saveButton.textContent = "正在保存…";
  renderErrors([]);
  try {
    const saved = id ? await api.update(id, contact) : await api.create(contact);
    dialog.close();
    showToast(id ? "联系人已更新" : "联系人已创建");
    savedCallback?.(saved);
  } catch (error) {
    renderErrors([readableError(error)]);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "保存联系人";
  }
});
