const seed = [
  { id: 1, name: "张三", company: "某科技公司", position: "软件工程师", remark: "大学同学，项目合作联系人。", is_favorite: true, methods: [
    { type: "phone", value: "13800000000", label: "个人手机" }, { type: "phone", value: "13900000000", label: "工作手机" },
    { type: "email", value: "zhangsan@example.com", label: "工作邮箱" }, { type: "social", value: "zhangsan123", label: "微信" },
  ] },
  { id: 2, name: "李敏", company: "福州大学", position: "产品经理", remark: "通讯录项目结对成员。", is_favorite: true, methods: [
    { type: "phone", value: "13600000000", label: "手机" }, { type: "email", value: "limin@example.com", label: "邮箱" },
  ] },
  { id: 3, name: "王强", company: "自由职业", position: "设计师", remark: "", is_favorite: false, methods: [
    { type: "social", value: "wangqiang_design", label: "微信" }, { type: "address", value: "福建省福州市", label: "通讯地址" },
  ] },
  { id: 4, name: "陈晨", company: "某网络公司", position: "测试工程师", remark: "负责质量验收。", is_favorite: false, methods: [
    { type: "email", value: "chenchen@example.com", label: "工作邮箱" },
  ] },
  { id: 5, name: "赵一", company: "", position: "", remark: "仅保存电话的测试联系人。", is_favorite: false, methods: [
    { type: "phone", value: "13500000000", label: "手机" },
  ] },
];

const copy = (value) => structuredClone(value);
const pause = () => new Promise((resolve) => setTimeout(resolve, 80));

export function createMockApi() {
  const storageKey = "contacthub-demo-contacts";
  let contacts = sessionStorage.getItem(storageKey)
    ? JSON.parse(sessionStorage.getItem(storageKey))
    : copy(seed);
  let nextId = Math.max(0, ...contacts.map((item) => item.id)) + 1;
  const persist = () => sessionStorage.setItem(storageKey, JSON.stringify(contacts));
  persist();
  return {
    async list(favoritesOnly = false) {
      await pause();
      return copy(favoritesOnly ? contacts.filter((item) => item.is_favorite) : contacts);
    },
    async get(id) {
      await pause();
      const contact = contacts.find((item) => item.id === Number(id));
      if (!contact) throw new Error("联系人不存在");
      return copy(contact);
    },
    async create(contact) {
      await pause();
      const created = { ...copy(contact), id: nextId++, is_favorite: false };
      contacts.push(created);
      persist();
      return copy(created);
    },
    async update(id, contact) {
      await pause();
      const index = contacts.findIndex((item) => item.id === Number(id));
      if (index < 0) throw new Error("联系人不存在");
      contacts[index] = { ...contacts[index], ...copy(contact), id: Number(id) };
      persist();
      return copy(contacts[index]);
    },
    async remove(id) {
      await pause();
      contacts = contacts.filter((item) => item.id !== Number(id));
      persist();
      return null;
    },
    async setFavorite(id, favorite) {
      await pause();
      const contact = contacts.find((item) => item.id === Number(id));
      if (!contact) throw new Error("联系人不存在");
      contact.is_favorite = favorite;
      persist();
      return copy(contact);
    },
    async importExcel(file) {
      await pause();
      return { success_count: 3, failed_count: file.name.includes("partial") ? 1 : 0, errors: file.name.includes("partial") ? [{ row: 4, message: "姓名为空" }] : [] };
    },
    async exportExcel() {
      const response = await fetch("/static/samples/contacthub-template.xlsx");
      return { blob: await response.blob(), filename: "ContactHub-demo.xlsx" };
    },
  };
}
