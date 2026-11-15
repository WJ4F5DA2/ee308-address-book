from io import BytesIO
import json
import re
from xml.etree.ElementTree import ParseError
from zipfile import BadZipFile, ZipFile

from defusedxml.common import DefusedXmlException
from flask import send_file
from openpyxl import Workbook, load_workbook
from openpyxl.utils.exceptions import InvalidFileException

from .validation import validate_contact

MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_UNCOMPRESSED_SIZE = 80 * 1024 * 1024
EXCEL_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
HEADERS = ("姓名", "公司", "职位", "电话", "其他电话", "邮箱",
           "社交账号", "邮寄地址", "是否收藏", "备注")
LABELS_HEADER = "联系方式标签"
METHOD_COLUMNS = {
    "phone": ("电话", "其他电话"),
    "email": ("邮箱",),
    "social": ("社交账号",),
    "address": ("邮寄地址",),
}


def split_values(value):
    chunks = re.findall(r"(?:\\[\\;]|[^;])+", value)
    return [re.sub(r"\\([\\;])", r"\1", chunk).strip() for chunk in chunks if chunk.strip()]


def join_values(values):
    # 保留联系方式里的分号和反斜杠，方便导出后重新导入。
    return ";".join(value.replace("\\", "\\\\").replace(";", "\\;") for value in values)


def cell_text(cell):
    if cell.data_type in ("f", "e"):
        raise ValueError("请使用文本或普通值填写单元格。")
    value = cell.value
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def read_row(cells):
    values = {header: cell_text(cell) for header, cell in cells.items()}
    if not any(values.values()):
        return None

    label_text = values.get(LABELS_HEADER, "")
    try:
        labels = json.loads(label_text) if label_text else {}
    except json.JSONDecodeError as error:
        raise ValueError("联系方式标签格式无效。") from error
    if not isinstance(labels, dict):
        raise ValueError("联系方式标签格式无效。")

    methods = []
    for kind, columns in METHOD_COLUMNS.items():
        entries = [value for column in columns for value in split_values(values.get(column, ""))]
        group_labels = labels.get(kind, [""] * len(entries))
        if not isinstance(group_labels, list) or len(group_labels) != len(entries):
            raise ValueError("联系方式与标签数量不匹配。")
        methods.extend(
            {"type": kind, "value": value, "label": label}
            for value, label in zip(entries, group_labels)
        )

    favorite = values.get("是否收藏", "").lower()
    if favorite not in ("", "是", "否", "true", "false", "1", "0"):
        raise ValueError("是否收藏请填写“是”或“否”。")
    record = validate_contact({
        "name": values.get("姓名", ""),
        "company": values.get("公司", ""),
        "position": values.get("职位", ""),
        "remark": values.get("备注", ""),
        "methods": methods,
    })
    return {**record, "is_favorite": favorite in ("是", "true", "1")}


def read_sheet(sheet):
    header_row = next(sheet.iter_rows(min_row=1, max_row=1, values_only=True), ())
    known_headers = (*HEADERS, LABELS_HEADER)
    columns = {}
    for index, header in enumerate(header_row):
        if isinstance(header, str) and header.strip() in known_headers:
            header = header.strip()
            if header in columns:
                raise ValueError(f"Excel 表头重复：{header}。")
            columns[header] = index
    if "姓名" not in columns:
        raise ValueError("Excel 缺少“姓名”列。")

    records, errors = [], []
    for row_number, row in enumerate(sheet.iter_rows(min_row=2, max_col=max(columns.values()) + 1), start=2):
        try:
            record = read_row({header: row[index] for header, index in columns.items()})
        except ValueError as error:
            errors.append({"row": row_number, "message": str(error)})
        else:
            if record is not None:
                records.append(record)
    return records, errors


def read_contacts(contents):
    try:
        with ZipFile(BytesIO(contents)) as archive:
            if sum(item.file_size for item in archive.infolist()) > MAX_UNCOMPRESSED_SIZE:
                raise ValueError("Excel 解压后的内容过大。")

        book = load_workbook(BytesIO(contents), read_only=True, keep_links=False)
        try:
            if not book.worksheets:
                raise ValueError("Excel 文件没有工作表。")
            return read_sheet(book.worksheets[0])
        finally:
            book.close()
    except (BadZipFile, InvalidFileException, ParseError, DefusedXmlException,
            OSError, EOFError, KeyError, IndexError, TypeError, NotImplementedError, RuntimeError) as error:
        raise ValueError("无法读取 Excel 文件，请检查文件是否损坏。") from error


def export_row(contact):
    values = {kind: [] for kind in METHOD_COLUMNS}
    labels = {kind: [] for kind in METHOD_COLUMNS}
    for method in contact["methods"]:
        values[method["type"]].append(method["value"])
        labels[method["type"]].append(method["label"])

    phones = values["phone"]
    return (
        contact["name"], contact["company"], contact["position"], join_values(phones[:1]),
        join_values(phones[1:]), join_values(values["email"]), join_values(values["social"]),
        join_values(values["address"]), "是" if contact["is_favorite"] else "否",
        contact["remark"], json.dumps(labels, ensure_ascii=False),
    )


def download_workbook(filename, contacts=(), *, include_labels=False):
    book = Workbook()
    sheet = book.active
    sheet.title = "联系人"
    sheet.freeze_panes = "A2"
    sheet.append((*HEADERS, LABELS_HEADER) if include_labels else HEADERS)
    for contact in contacts:
        sheet.append(export_row(contact))
        # 写成文本，保留电话的前导零，也避免把用户输入当作公式。
        for cell in sheet[sheet.max_row]:
            cell.data_type = "s"

    stream = BytesIO()
    book.save(stream)
    stream.seek(0)
    return send_file(stream, mimetype=EXCEL_TYPE, as_attachment=True, download_name=filename)
