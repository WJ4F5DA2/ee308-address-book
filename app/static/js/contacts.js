import { api } from "./data-source.js";
import { confirmAction, getInitial, methodLabel, readableError, showToast } from "./common.js";
import { matchesSearch } from "./validation.js";
import { openContactForm } from "./contact-form.js";

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function starIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z");
  svg.append(path);
  return svg;
}

export function initContactsPage({ favoritesOnly = false } = {}) {
  const listElement = document.getElementById("contact-list");
  const detailElement = document.getElementById("contact-detail");
  const searchElement = document.getElementById("contact-search");
  const countElement = document.getElementById("contact-count");
  let contacts = [];
  let selectedId = null;

  function visibleContacts() {
    return contacts.filter((contact) => matchesSearch(contact, searchElement.value));
  }

  function primaryMethod(contact) {
    return contact.methods?.find((method) => method.type === "phone") ?? contact.methods?.[0];
  }

  function renderList() {
    const visible = visibleContacts();
    listElement.replaceChildren();
    listElement.setAttribute("aria-busy", "false");
    countElement.textContent = `${visible.length} 位联系人`;
    if (!visible.length) {
      const empty = node("div", "empty-state");
      empty.append(node("strong", "", searchElement.value ? "没有匹配的联系人" : favoritesOnly ? "还没有收藏联系人" : "通讯录还是空的"));
      empty.append(node("span", "", searchElement.value ? "尝试姓名、公司或联系方式中的其他关键词。" : favoritesOnly ? "在全部联系人中点击星标即可添加收藏。" : "点击“新增联系人”建立第一条记录。"));
      listElement.append(empty);
      return;
    }
    visible.forEach((contact) => {
      const row = node("article", `contact-row${contact.id === selectedId ? " is-selected" : ""}`);
      row.dataset.contactId = String(contact.id);
      const identity = node("div", "contact-identity");
      identity.append(node("span", "avatar", getInitial(contact.name)));
      const nameButton = node("button", "contact-name-button");
      nameButton.type = "button";
      nameButton.dataset.action = "select";
      nameButton.setAttribute("aria-label", `查看 ${contact.name} 的详情`);
      nameButton.append(node("strong", "", contact.name));
      nameButton.append(node("small", "", [contact.company, contact.position].filter(Boolean).join(" · ") || "未填写公司"));
      identity.append(nameButton);
      const method = primaryMethod(contact);
      const methodElement = node("div", "primary-method");
      if (method) {
        methodElement.append(document.createTextNode(method.value));
        methodElement.append(node("small", "", `${methodLabel(method.type)}${contact.methods.length > 1 ? ` · 另有 ${contact.methods.length - 1} 条` : ""}`));
      } else {
        methodElement.textContent = "未填写联系方式";
      }
      const actions = node("div", "row-actions");
      const favorite = node("button", "favorite-button");
      favorite.type = "button";
      favorite.dataset.action = "favorite";
      favorite.setAttribute("aria-pressed", String(Boolean(contact.is_favorite)));
      favorite.setAttribute("aria-label", contact.is_favorite ? `取消收藏 ${contact.name}` : `收藏 ${contact.name}`);
      favorite.append(starIcon());
      const edit = node("button", "edit-button", "编辑");
      edit.type = "button";
      edit.dataset.action = "edit";
      edit.setAttribute("aria-label", `编辑 ${contact.name}`);
      actions.append(favorite, edit);
      row.append(identity, methodElement, actions);
      listElement.append(row);
    });
  }

  function renderDetail(contact) {
    detailElement.replaceChildren();
    if (!contact) {
      const placeholder = node("div", "detail-placeholder");
      placeholder.append(node("span", "placeholder-mark", "C"), node("h2", "", "选择一位联系人"), node("p", "", "在左侧索引中选择联系人，查看完整资料和所有联系方式。"));
      detailElement.append(placeholder);
      return;
    }
    const header = node("header", "detail-header");
    header.append(node("span", "avatar", getInitial(contact.name)), node("h2", "", contact.name));
    header.append(node("p", "", [contact.company, contact.position].filter(Boolean).join(" · ") || "未填写公司与职位"));
    const favorite = node("button", "favorite-button");
    favorite.type = "button";
    favorite.dataset.detailAction = "favorite";
    favorite.setAttribute("aria-pressed", String(Boolean(contact.is_favorite)));
    favorite.setAttribute("aria-label", contact.is_favorite ? "取消收藏" : "收藏联系人");
    favorite.append(starIcon());
    header.append(favorite);
    const methods = node("section", "detail-section");
    methods.append(node("h3", "", `联系方式 / ${contact.methods?.length ?? 0}`));
    const dl = document.createElement("dl");
    (contact.methods ?? []).forEach((method) => {
      const item = node("div", "method-detail");
      item.append(node("dt", "", methodLabel(method.type)));
      const value = node("dd", "", method.value);
      if (method.label) value.append(node("small", "", method.label));
      item.append(value);
      dl.append(item);
    });
    methods.append(dl);
    const remark = node("section", "detail-section");
    remark.append(node("h3", "", "备注"), node("p", "detail-remark", contact.remark || "暂无备注"));
    const actions = node("div", "detail-actions");
    const edit = node("button", "button button-dark", "编辑资料");
    edit.type = "button";
    edit.dataset.detailAction = "edit";
    const remove = node("button", "button button-quiet", "删除联系人");
    remove.type = "button";
    remove.dataset.detailAction = "delete";
    actions.append(edit, remove);
    detailElement.append(header, methods, remark, actions);
  }

  async function loadContacts(preferredId = selectedId) {
    listElement.setAttribute("aria-busy", "true");
    try {
      contacts = await api.list(favoritesOnly);
      if (!Array.isArray(contacts)) contacts = contacts?.items ?? [];
      selectedId = contacts.some((item) => item.id === preferredId) ? preferredId : contacts[0]?.id ?? null;
      renderList();
      renderDetail(contacts.find((item) => item.id === selectedId));
    } catch (error) {
      contacts = [];
      listElement.setAttribute("aria-busy", "false");
      listElement.replaceChildren(node("p", "error-state", readableError(error)));
      countElement.textContent = "读取失败";
      renderDetail(null);
    }
  }

  async function toggleFavorite(contact) {
    try {
      await api.setFavorite(contact.id, !contact.is_favorite);
      showToast(contact.is_favorite ? `已取消收藏 ${contact.name}` : `已收藏 ${contact.name}`);
      await loadContacts(contact.id);
    } catch (error) {
      showToast(readableError(error), "error");
    }
  }

  listElement.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const row = button.closest("[data-contact-id]");
    const contact = contacts.find((item) => item.id === Number(row.dataset.contactId));
    if (!contact) return;
    if (button.dataset.action === "favorite") await toggleFavorite(contact);
    if (button.dataset.action === "edit") openContactForm(contact, async (saved) => loadContacts(saved.id));
    if (button.dataset.action === "select") {
      selectedId = contact.id;
      renderList();
      renderDetail(contact);
    }
  });

  detailElement.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-detail-action]");
    const contact = contacts.find((item) => item.id === selectedId);
    if (!button || !contact) return;
    if (button.dataset.detailAction === "favorite") await toggleFavorite(contact);
    if (button.dataset.detailAction === "edit") openContactForm(contact, async (saved) => loadContacts(saved.id));
    if (button.dataset.detailAction === "delete") {
      if (!await confirmAction(`确定删除“${contact.name}”吗？其全部联系方式也会一并删除。`)) return;
      try {
        await api.remove(contact.id);
        showToast(`已删除 ${contact.name}`);
        await loadContacts(null);
      } catch (error) {
        showToast(readableError(error), "error");
      }
    }
  });

  searchElement.addEventListener("input", renderList);
  document.getElementById("add-contact")?.addEventListener("click", () => openContactForm(null, async (saved) => loadContacts(saved.id)));
  loadContacts();
}

if (document.body.dataset.page === "contacts") initContactsPage();
