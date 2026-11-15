const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\-\s]{5,30}$/;

export function validateContact(contact) {
  const errors = [];
  if (!contact.name?.trim()) errors.push("请填写联系人姓名。");
  if ((contact.name?.trim().length ?? 0) > 100) errors.push("姓名不能超过 100 个字符。");
  if (!Array.isArray(contact.methods) || contact.methods.length === 0) {
    errors.push("请至少添加一条联系方式。");
  }
  contact.methods?.forEach((method, index) => {
    const position = `第 ${index + 1} 条联系方式`;
    if (!method.value?.trim()) errors.push(`${position}的内容不能为空。`);
    if (method.type === "email" && method.value && !emailPattern.test(method.value.trim())) {
      errors.push(`${position}的邮箱格式不正确。`);
    }
    if (method.type === "phone" && method.value && !phonePattern.test(method.value.trim())) {
      errors.push(`${position}的电话格式不正确。`);
    }
  });
  return errors;
}

export function validateExcelFile(file) {
  if (!file) return "请选择要导入的 Excel 文件。";
  if (!/\.xlsx$/i.test(file.name)) return "文件格式错误，仅支持 .xlsx 文件。";
  if (file.size === 0) return "文件不能为空，请选择包含数据的 .xlsx 文件。";
  if (file.size > 10 * 1024 * 1024) return "文件不能超过 10 MB。";
  return null;
}

export function matchesSearch(contact, query) {
  const keyword = query.trim().toLocaleLowerCase("zh-CN");
  if (!keyword) return true;
  const values = [contact.name, contact.company, contact.position, contact.remark,
    ...(contact.methods ?? []).flatMap((method) => [method.value, method.label])];
  return values.some((value) => String(value ?? "").toLocaleLowerCase("zh-CN").includes(keyword));
}
