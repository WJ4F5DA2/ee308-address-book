import re

METHOD_TYPES = ("phone", "email", "social", "address")
INVALID_CELL_CHAR = re.compile(r"[\x00-\x08\x0b-\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]")
PHONE = re.compile(r"[0-9+()\-\s]{5,30}")
EMAIL = re.compile(r"[^\s@]+@[^\s@]+\.[^\s@]+")


def text_field(data, key, title, limit, required=False):
    value = data.get(key, "")
    if not isinstance(value, str):
        raise ValueError(f"{title}必须是文本。")
    value = value.strip()
    if required and not value:
        raise ValueError(f"{title}不能为空。")
    if len(value) > limit or INVALID_CELL_CHAR.search(value):
        raise ValueError(f"{title}只能填写不超过 {limit} 个字符的有效文本。")
    return value


def validate_contact(data):
    if not isinstance(data, dict):
        raise ValueError("请提交联系人数据。")

    contact = {
        "name": text_field(data, "name", "姓名", 100, required=True),
        "company": text_field(data, "company", "公司", 100),
        "position": text_field(data, "position", "职位", 100),
        "remark": text_field(data, "remark", "备注", 32_767),
    }
    entries = data.get("methods")
    if not isinstance(entries, list) or not 1 <= len(entries) <= 50:
        raise ValueError("请填写 1 至 50 条联系方式。")

    methods = []
    for index, entry in enumerate(entries, start=1):
        title = f"第 {index} 条联系方式"
        if not isinstance(entry, dict) or entry.get("type") not in METHOD_TYPES:
            raise ValueError(f"{title}的类型无效。")
        kind = entry["type"]
        value = text_field(entry, "value", f"{title}的内容", 255, required=True)
        label = text_field(entry, "label", f"{title}的标签", 50)
        if kind == "phone" and not PHONE.fullmatch(value):
            raise ValueError(f"{title}的电话格式不正确。")
        if kind == "email" and not EMAIL.fullmatch(value):
            raise ValueError(f"{title}的邮箱格式不正确。")
        methods.append({"type": kind, "value": value, "label": label})

    return {**contact, "methods": methods}
