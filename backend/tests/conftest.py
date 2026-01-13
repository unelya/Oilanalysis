import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB_DIR = Path(__file__).parent / ".tmp"
TEST_DB_PATH = TEST_DB_DIR / "test.db"

TEST_DB_DIR.mkdir(parents=True, exist_ok=True)
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DB_PATH}"

from backend.main import app  # noqa: E402
from backend.database import Base, engine  # noqa: E402


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
