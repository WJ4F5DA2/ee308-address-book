import sqlite3

from flask import current_app, g

SCHEMA = """
CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    remark TEXT NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS contact_methods (
    id INTEGER PRIMARY KEY,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    value TEXT NOT NULL,
    label TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_methods_contact_id ON contact_methods(contact_id);
"""
CONTACT_FIELDS = ("name", "company", "position", "remark")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(current_app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def list_contacts(contact_id=None, favorites_only=False):
    query = """
        SELECT c.*, m.type AS method_type, m.value AS method_value, m.label AS method_label
        FROM contacts AS c
        LEFT JOIN contact_methods AS m ON c.id = m.contact_id
    """
    params = ()
    if contact_id is not None:
        query += " WHERE c.id = ?"
        params = (contact_id,)
    elif favorites_only:
        query += " WHERE c.is_favorite = 1"

    contacts = {}
    for row in get_db().execute(query + " ORDER BY c.id, m.id", params):
        if row["id"] not in contacts:
            contacts[row["id"]] = {
                "id": row["id"],
                **{field: row[field] for field in CONTACT_FIELDS},
                "is_favorite": bool(row["is_favorite"]),
                "methods": [],
            }
        if row["method_type"] is not None:
            contacts[row["id"]]["methods"].append({
                "type": row["method_type"],
                "value": row["method_value"],
                "label": row["method_label"],
            })
    return list(contacts.values())


def get_contact(contact_id):
    contacts = list_contacts(contact_id=contact_id)
    return contacts[0] if contacts else None


def insert_contact(db, contact):
    fields = tuple(contact[field] for field in CONTACT_FIELDS)
    cursor = db.execute(
        "INSERT INTO contacts (name, company, position, remark, is_favorite) VALUES (?, ?, ?, ?, ?)",
        (*fields, contact.get("is_favorite", False)),
    )
    insert_methods(db, cursor.lastrowid, contact["methods"])
    return cursor.lastrowid


def insert_methods(db, contact_id, methods):
    db.executemany(
        "INSERT INTO contact_methods (contact_id, type, value, label) VALUES (?, ?, ?, ?)",
        [(contact_id, method["type"], method["value"], method["label"]) for method in methods],
    )


def update_contact(db, contact_id, contact):
    fields = tuple(contact[field] for field in CONTACT_FIELDS)
    cursor = db.execute(
        "UPDATE contacts SET name = ?, company = ?, position = ?, remark = ? WHERE id = ?",
        (*fields, contact_id),
    )
    if cursor.rowcount == 0:
        return None
    # 在同一事务中替换联系方式，避免联系人只更新一半。
    db.execute("DELETE FROM contact_methods WHERE contact_id = ?", (contact_id,))
    insert_methods(db, contact_id, contact["methods"])
    return get_contact(contact_id)
