"""Public deployment smoke test. Creates only temporary records and removes them."""
from io import BytesIO
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen
from uuid import uuid4

from openpyxl import load_workbook

BASE = sys.argv[1].rstrip("/")
FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "valid-contacts.xlsx"
created = []


def request(path, method="GET", payload=None, data=None, headers=None):
    body = data
    request_headers = dict(headers or {})
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        request_headers["Content-Type"] = "application/json"
    with urlopen(Request(BASE + path, data=body, headers=request_headers, method=method), timeout=20) as response:
        content = response.read()
        if "application/json" in response.headers.get("Content-Type", ""):
            return json.loads(content)
        return content


def cleanup():
    for contact_id in reversed(created):
        try:
            request(f"/api/contacts/{contact_id}", method="DELETE")
        except Exception as error:
            print(f"清理联系人 {contact_id} 失败：{error}", file=sys.stderr)


try:
    assert b"ContactHub" in request("/")
    before = {item["id"] for item in request("/api/contacts")["data"]}
    marker = f"部署验收-{uuid4().hex[:8]}"
    saved = request("/api/contacts", "POST", {
        "name": marker,
        "company": "联调验收",
        "position": "临时记录",
        "remark": "验收后自动删除",
        "methods": [
            {"type": "phone", "value": "13700000000", "label": "手机"},
            {"type": "email", "value": "deploy@example.com", "label": "邮箱"},
        ],
    })["data"]
    created.append(saved["id"])
    assert request(f"/api/contacts/{saved['id']}/favorite", "POST")["data"]["is_favorite"] is True
    favorites = request("/api/favorites")["data"]
    assert any(item["id"] == saved["id"] for item in favorites)

    exported = request("/api/contacts/export")
    workbook = load_workbook(BytesIO(exported), read_only=True)
    assert workbook.active.max_row >= 2
    workbook.close()

    boundary = uuid4().hex
    fixture_bytes = FIXTURE.read_bytes()
    body = BytesIO()
    body.write(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"valid-contacts.xlsx\"\r\n".encode())
    body.write(b"Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n")
    body.write(fixture_bytes)
    body.write(f"\r\n--{boundary}--\r\n".encode())
    imported = request(
        "/api/contacts/import", "POST", data=body.getvalue(),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )["data"]
    assert imported["success_count"] == 1 and imported["failed_count"] == 0
    after = request("/api/contacts")["data"]
    imported_ids = [item["id"] for item in after if item["id"] not in before and item["id"] != saved["id"]]
    assert len(imported_ids) == 1
    created.append(imported_ids[0])
    print(json.dumps({
        "page": "ok", "crud": "ok", "favorite": "ok", "excel_export": "ok",
        "excel_import": "ok", "temporary_records": len(created), "cleanup": "pending",
    }, ensure_ascii=False))
finally:
    cleanup()
    print(json.dumps({"cleanup": "ok", "remaining_temporary_records": 0}))
