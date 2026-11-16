"""Run the real Flask app with an isolated database for browser integration tests."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from app import create_app

DATABASE = ROOT / "test-results" / "integration" / "contacts.sqlite"
DATABASE.parent.mkdir(parents=True, exist_ok=True)
if DATABASE.exists():
    DATABASE.unlink()

app = create_app({"DATABASE": DATABASE, "TESTING": True})

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=4174, debug=False)
