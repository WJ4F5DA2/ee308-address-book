import os
from pathlib import Path

from app import create_app

DATABASE = Path(os.environ.get(
    "CONTACTHUB_DATABASE",
    Path(__file__).resolve().parent / "instance" / "contacts.sqlite",
))

app = create_app({"DATABASE": DATABASE})
