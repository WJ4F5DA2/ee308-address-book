from contextlib import closing
from io import BytesIO
from pathlib import Path
import sqlite3
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile

from openpyxl import Workbook, load_workbook

from app import create_app


HEADERS = ["姓名", "公司", "职位", "电话", "其他电话", "邮箱",
           "社交账号", "邮寄地址", "是否收藏", "备注"]


def workbook_bytes(*rows):
    book = Workbook()
    for row in rows:
        book.active.append(row)
    stream = BytesIO()
    book.save(stream)
    return stream.getvalue()


class BackendTest(unittest.TestCase):
    def setUp(self):
        temp = TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.database = Path(temp.name) / "contacts.sqlite"
        self.config = {"TESTING": True, "DATABASE": self.database}
        self.client = create_app(self.config).test_client()
        self.contact = {
            "name": "张三", "company": "公司", "position": "工程师", "remark": "备注",
            "methods": [
                {"type": "phone", "value": "01234567", "label": "手机"},
                {"type": "phone", "value": "13900000000", "label": "工作"},
                {"type": "email", "value": "test@example.com"},
                {"type": "social", "value": r"群;账号\备用", "label": '社交; "备注"'},
                {"type": "address", "value": "=A1;东门", "label": "办公室"},
            ],
        }

    def create_contact(self):
        response = self.client.post("/api/contacts", json=self.contact)
        self.assertEqual(response.status_code, 201)
        return response.json["data"]

    def upload(self, contents, filename="contacts.xlsx"):
        return self.client.post(
            "/api/contacts/import", data={"file": (BytesIO(contents), filename)}
        )

    def test_crud_favorites_and_data_after_restart(self):
        self.assertEqual(self.client.get("/api/contacts").json["data"], [])
        contact = self.create_contact()
        endpoint = f"/api/contacts/{contact['id']}"
        self.assertEqual(self.client.get(endpoint).json["data"], contact)
        self.assertFalse(contact["is_favorite"])
        for _ in range(2):
            self.assertTrue(self.client.post(endpoint + "/favorite").json["data"]["is_favorite"])
        update = {"name": "李四", "methods": [{"type": "address", "value": "福州"}]}
        saved = self.client.put(endpoint, json=update).json["data"]
        self.assertEqual(saved["methods"], [{"type": "address", "value": "福州", "label": ""}])
        self.assertTrue(saved["is_favorite"])
        reopened = create_app(self.config).test_client()
        self.assertEqual(reopened.get("/api/favorites").json["data"], [saved])
        for _ in range(2):
            self.assertFalse(reopened.delete(endpoint + "/favorite").json["data"]["is_favorite"])
        self.assertEqual(reopened.get("/api/favorites").json["data"], [])
        self.assertTrue(reopened.delete(endpoint).json["success"])
        self.assertEqual(reopened.get(endpoint).status_code, 404)
        with closing(sqlite3.connect(self.database)) as database:
            self.assertEqual(database.execute("SELECT count(*) FROM contact_methods").fetchone()[0], 0)

    def test_invalid_contacts_and_missing_ids_return_json(self):
        for change in (
            {"name": " "}, {"company": 123}, {"methods": []}, {"methods": [None]},
            {"methods": [{"type": "fax", "value": "01234"}]},
            {"methods": [{"type": "email", "value": "bad"}]},
            {"methods": [{"type": "phone", "value": "abcdef"}]},
        ):
            with self.subTest(change=change):
                response = self.client.post("/api/contacts", json=self.contact | change)
                self.assertEqual(response.status_code, 400)
                self.assertFalse(response.json["success"])
        self.assertEqual(self.client.post("/api/contacts", data="{", content_type="application/json").status_code, 400)
        self.assertEqual(self.client.put("/api/contacts/999", json=self.contact).status_code, 404)
        self.assertEqual(self.client.delete("/api/contacts/999/favorite").status_code, 404)
        self.assertEqual(self.client.get("/api/contacts").json["data"], [])

    def test_import_template_partial_rows_and_duplicate_names(self):
        contents = workbook_bytes(
            HEADERS,
            ["张三", "", "", "012345;13900000000", "1234567", "", "微信：账号", "", "是"],
            [],
            ["", "公司", "", "1234567"],
            ["张三", "", "", "", "", "test@example.com", "", "", "否"],
            ["王五", "", "", "", "", "bad@example"],
        )
        result = self.upload(contents).json["data"]
        self.assertEqual(result["success_count"], 2)
        self.assertEqual(result["failed_count"], 2)
        self.assertEqual([error["row"] for error in result["errors"]], [4, 6])
        favorite, other = self.client.get("/api/contacts").json["data"]
        self.assertEqual(favorite["name"], other["name"])
        self.assertEqual([item["value"] for item in favorite["methods"]],
                         ["012345", "13900000000", "1234567", "微信：账号"])
        self.assertTrue(favorite["is_favorite"])
        self.assertFalse(other["is_favorite"])

    def test_invalid_workbooks_return_errors_without_writes(self):
        for contents in (b"", b"corrupt", workbook_bytes(["公司"], ["某公司"])):
            with self.subTest(contents=contents[:10]):
                response = self.upload(contents)
                self.assertEqual(response.status_code, 400)
                self.assertFalse(response.json["success"])
        self.assertEqual(self.upload(b"file", "contacts.xls").status_code, 400)
        self.assertEqual(self.client.post("/api/contacts/import").status_code, 400)
        self.assertEqual(self.upload(b"x" * (10 * 1024 * 1024 + 1)).status_code, 413)
        self.assertEqual(self.client.get("/api/contacts").json["data"], [])

    def test_export_import_round_trip(self):
        self.contact["methods"].reverse()
        contact = self.create_contact()
        self.client.post(f"/api/contacts/{contact['id']}/favorite")
        response = self.client.get("/api/contacts/export")
        self.assertIn("ContactHub.xlsx", response.headers["Content-Disposition"])
        workbook = load_workbook(BytesIO(response.data))
        self.assertEqual(workbook.active.max_row, 2)
        self.assertEqual(workbook.active["E2"].value, "01234567")
        self.assertEqual(workbook.active["E2"].data_type, "s")
        self.assertEqual(workbook.active["H2"].data_type, "s")
        result = self.upload(response.data).json["data"]
        self.assertEqual(result, {"success_count": 1, "failed_count": 0, "errors": []})
        restored = self.client.get("/api/contacts").json["data"][1]
        self.assertEqual(restored, contact | {"id": restored["id"], "is_favorite": True})

    def test_download_blank_template(self):
        response = self.client.get("/static/samples/contacthub-template.xlsx")
        self.assertEqual(response.status_code, 200)
        workbook = load_workbook(BytesIO(response.data))
        self.assertEqual(list(workbook.active.values), [tuple(HEADERS)])
        self.assertEqual(workbook.active.column_dimensions["D"].number_format, "@")
        self.assertEqual(workbook.active.column_dimensions["E"].number_format, "@")

    def test_import_retains_zeros_from_numeric_phone_format(self):
        book = Workbook()
        book.active.append(HEADERS)
        book.active.append(["测试", "", "", 12345])
        book.active["D2"].number_format = "00000000"
        stream = BytesIO()
        book.save(stream)
        result = self.upload(stream.getvalue()).json["data"]
        self.assertEqual(result["success_count"], 1)
        method = self.client.get("/api/contacts").json["data"][0]["methods"][0]
        self.assertEqual(method["value"], "00012345")

    def test_import_reads_rows_beyond_reported_sheet_dimensions(self):
        contents = workbook_bytes(HEADERS, ["测试", "", "", "01234567"])
        stream = BytesIO()
        with ZipFile(BytesIO(contents)) as original, ZipFile(stream, "w") as workbook:
            for member in original.namelist():
                content = original.read(member)
                if member == "xl/worksheets/sheet1.xml":
                    content = content.replace(b'ref="A1:J2"', b'ref="A1:A1"', 1)
                workbook.writestr(member, content)
        result = self.upload(stream.getvalue()).json["data"]
        self.assertEqual(result["success_count"], 1)
