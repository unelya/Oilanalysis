import os
import sys
from collections.abc import Callable
from itertools import count
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DB_DIR = Path(__file__).parent / ".tmp"
TEST_DB_PATH = TEST_DB_DIR / "test.db"

TEST_DB_DIR.mkdir(parents=True, exist_ok=True)
if TEST_DB_PATH.exists():
    TEST_DB_PATH.unlink()

os.environ["DATABASE_URL"] = f"sqlite+pysqlite:///{TEST_DB_PATH}"

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.main import app  # noqa: E402
from backend.database import Base, engine  # noqa: E402


@pytest.fixture(scope="session")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture()
def role_headers() -> Callable[..., dict[str, str]]:
    def _headers(
        *,
        username: str,
        full_name: str | None = None,
        role: str,
        roles: list[str] | None = None,
    ) -> dict[str, str]:
        resolved_roles = roles or [role]
        return {
            "x-user": full_name or username,
            "x-role": role,
            "x-roles": ",".join(resolved_roles),
        }

    return _headers


@pytest.fixture()
def admin_headers(role_headers: Callable[..., dict[str, str]]) -> dict[str, str]:
    return role_headers(username="admin", full_name="Admin User", role="admin", roles=["admin"])


@pytest.fixture()
def user_factory(
    client: TestClient,
    admin_headers: dict[str, str],
) -> Callable[..., dict]:
    seq = count(1)

    def _list_users() -> list[dict]:
        response = client.get("/admin/users", headers=admin_headers)
        assert response.status_code == 200, response.text
        return response.json()

    def _create(
        *,
        role: str,
        username: str | None = None,
        full_name: str | None = None,
        email: str | None = None,
        roles: list[str] | None = None,
        method_permissions: list[str] | None = None,
    ) -> dict:
        idx = next(seq)
        resolved_username = username or f"{role}.user.{idx}"
        existing = next((u for u in _list_users() if u.get("username") == resolved_username), None)
        if existing:
            return existing

        payload: dict[str, object] = {
            "username": resolved_username,
            "full_name": full_name or resolved_username.replace(".", " ").title(),
            "email": email or f"{resolved_username.replace('.', '_')}@example.com",
            "role": role,
        }
        if roles is not None:
            payload["roles"] = roles
        if method_permissions is not None:
            payload["method_permissions"] = method_permissions

        response = client.post("/admin/users", json=payload, headers=admin_headers)
        assert response.status_code == 201, response.text
        return response.json()

    return _create


@pytest.fixture()
def canonical_users(user_factory: Callable[..., dict]) -> dict[str, dict]:
    return {
        "warehouse": user_factory(
            role="warehouse_worker",
            username="workflow.warehouse",
            full_name="Workflow Warehouse",
            email="workflow.warehouse@example.com",
        ),
        "lab": user_factory(
            role="lab_operator",
            username="workflow.lab",
            full_name="Workflow Lab",
            email="workflow.lab@example.com",
            method_permissions=["SARA", "IR", "Mass Spectrometry", "Viscosity"],
        ),
        "action": user_factory(
            role="action_supervision",
            username="workflow.action",
            full_name="Workflow Action",
            email="workflow.action@example.com",
        ),
    }


@pytest.fixture()
def make_sample_payload() -> Callable[..., dict[str, str]]:
    seq = count(1)

    def _build(**overrides: str) -> dict[str, str]:
        idx = next(seq)
        payload = {
            "sample_id": f"S-WF-{idx:03d}",
            "well_id": f"W-{idx:03d}",
            "horizon": f"H{idx}",
            "sampling_date": "2026-01-01",
            "status": "new",
            "storage_location": f"Rack {idx}",
        }
        payload.update(overrides)
        return payload

    return _build


@pytest.fixture()
def make_analysis_payload() -> Callable[..., dict[str, object]]:
    def _build(
        *,
        sample_id: str,
        analysis_type: str = "SARA",
        assigned_to: list[str] | str | None = None,
        **overrides: object,
    ) -> dict[str, object]:
        payload: dict[str, object] = {
            "sample_id": sample_id,
            "analysis_type": analysis_type,
        }
        if assigned_to is not None:
            payload["assigned_to"] = assigned_to
        payload.update(overrides)
        return payload

    return _build


@pytest.fixture()
def make_conflict_payload() -> Callable[..., dict[str, str]]:
    seq = count(1)

    def _build(**overrides: str) -> dict[str, str]:
        idx = next(seq)
        payload = {
            "old_payload": f"old_payload_{idx}",
            "new_payload": f"new_payload_{idx}",
            "status": "open",
        }
        payload.update(overrides)
        return payload

    return _build
