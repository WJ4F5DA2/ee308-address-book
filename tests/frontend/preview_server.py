"""Frontend-only preview server. It renders templates but provides no database or API."""
from pathlib import Path

from flask import Flask, render_template

ROOT = Path(__file__).resolve().parents[2]
app = Flask(
    __name__,
    template_folder=str(ROOT / "app" / "templates"),
    static_folder=str(ROOT / "app" / "static"),
    static_url_path="/static",
)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/favorites")
def favorites():
    return render_template("favorites.html")


@app.get("/excel")
def excel():
    return render_template("excel.html")


@app.get("/about")
def about():
    return render_template("about.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=4173, debug=False)
