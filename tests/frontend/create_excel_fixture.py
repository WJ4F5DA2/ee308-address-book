"""Create the frontend Excel template and browser-test upload fixture."""
from pathlib import Path

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[2]
HEADERS = ["姓名", "公司", "职位", "电话", "其他电话", "邮箱", "社交账号", "邮寄地址", "是否收藏", "备注"]


def create_workbook(path: Path, rows: list[list[str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "联系人"
    sheet.append(HEADERS)
    for row in rows:
        sheet.append(row)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = f"A1:J{max(1, sheet.max_row)}"
    for column, width in zip("ABCDEFGHIJ", [16, 22, 18, 20, 20, 30, 24, 32, 12, 30]):
        sheet.column_dimensions[column].width = width
    workbook.save(path)


if __name__ == "__main__":
    create_workbook(ROOT / "app" / "static" / "samples" / "contacthub-template.xlsx", [
        ["张三", "某科技公司", "软件工程师", "13800000000", "13900000000", "zhangsan@example.com", "微信：zhangsan", "福州大学", "是", "大学同学"],
    ])
    create_workbook(ROOT / "tests" / "fixtures" / "valid-contacts.xlsx", [
        ["测试用户", "测试公司", "测试工程师", "13800000000;13900000000", "", "test@example.com", "微信：test", "福州", "否", "浏览器自动化测试"],
    ])
