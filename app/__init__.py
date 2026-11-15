from pathlib import Path

from flask import Flask, render_template, request
from werkzeug.exceptions import HTTPException, NotFound

from .api import api, response
from .db import SCHEMA, close_db, get_db
from .excel import MAX_FILE_SIZE, download_workbook


def create_app(config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        DATABASE=Path(app.instance_path) / "contacts.sqlite",
        MAX_CONTENT_LENGTH=MAX_FILE_SIZE + 1024 * 1024,
    )
    if config is not None:
        app.config.update(config)

    Path(app.config["DATABASE"]).parent.mkdir(parents=True, exist_ok=True)
    app.teardown_appcontext(close_db)
    with app.app_context():
        get_db().executescript(SCHEMA)

    app.register_blueprint(api)

    @app.errorhandler(HTTPException)
    def http_error(error):
        if not request.path.startswith("/api/"):
            return error
        message = {
            400: "请求格式无效。",
            404: "联系人或接口不存在。",
            405: "此接口不支持该请求方法。",
            413: "Excel 文件不能超过 10 MB。",
        }.get(error.code, "请求失败。")
        return response(message=message, status=error.code)

    @app.get("/static/samples/contacthub-template.xlsx")
    def excel_template():
        return download_workbook("contacthub-template.xlsx")

    def page(template):
        if not (Path(app.root_path) / "templates" / template).is_file():
            raise NotFound()
        return render_template(template)

    @app.get("/")
    def index():
        return page("index.html")

    @app.get("/favorites")
    def favorites():
        return page("favorites.html")

    @app.get("/excel")
    def excel():
        return page("excel.html")

    @app.get("/about")
    def about():
        return page("about.html")

    return app
