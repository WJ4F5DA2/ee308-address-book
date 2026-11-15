from flask import Blueprint, jsonify, request
from werkzeug.exceptions import RequestEntityTooLarge

from .db import get_contact, get_db, insert_contact, list_contacts, update_contact
from .excel import MAX_FILE_SIZE, download_workbook, read_contacts
from .validation import validate_contact

api = Blueprint("contacts", __name__, url_prefix="/api")


def response(data=None, message="操作成功", status=200):
    return jsonify(success=status < 400, message=message, data=data), status


def missing_contact():
    return response(message="联系人不存在。", status=404)


@api.url_value_preprocessor
def check_id(_endpoint, values):
    if values and "contact_id" in values and values["contact_id"] > 2**63 - 1:
        values["contact_id"] = 0


@api.get("/contacts")
def contacts():
    return response(list_contacts())


@api.get("/contacts/<int:contact_id>")
def contact(contact_id):
    saved = get_contact(contact_id)
    return response(saved) if saved is not None else missing_contact()


@api.post("/contacts")
@api.put("/contacts/<int:contact_id>")
def save_contact(contact_id=None):
    try:
        data = validate_contact(request.get_json(silent=True))
    except ValueError as error:
        return response(message=str(error), status=400)

    db = get_db()
    with db:
        if contact_id is None:
            saved = get_contact(insert_contact(db, data))
            return response(saved, "联系人已创建", 201)
        saved = update_contact(db, contact_id, data)
    return response(saved, "联系人已更新") if saved is not None else missing_contact()


@api.delete("/contacts/<int:contact_id>")
def delete_contact(contact_id):
    db = get_db()
    with db:
        cursor = db.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    return response(message="联系人已删除") if cursor.rowcount else missing_contact()


@api.get("/favorites")
def favorites():
    return response(list_contacts(favorites_only=True))


@api.route("/contacts/<int:contact_id>/favorite", methods=["POST", "DELETE"])
def set_favorite(contact_id):
    db = get_db()
    with db:
        db.execute(
            "UPDATE contacts SET is_favorite = ? WHERE id = ?",
            (request.method == "POST", contact_id),
        )
        saved = get_contact(contact_id)
    return response(saved) if saved is not None else missing_contact()


@api.post("/contacts/import")
def import_excel():
    upload = request.files.get("file")
    if not upload or not upload.filename.lower().endswith(".xlsx"):
        return response(message="请选择 .xlsx 文件。", status=400)
    contents = upload.stream.read(MAX_FILE_SIZE + 1)
    if len(contents) > MAX_FILE_SIZE:
        raise RequestEntityTooLarge()
    try:
        records, errors = read_contacts(contents)
    except ValueError as error:
        return response(message=str(error), status=400)

    db = get_db()
    with db:
        for record in records:
            insert_contact(db, record)
    return response({
        "success_count": len(records),
        "failed_count": len(errors),
        "errors": errors,
    }, "导入完成")


@api.get("/contacts/export")
def export_excel():
    return download_workbook("ContactHub.xlsx", list_contacts(), include_labels=True)
