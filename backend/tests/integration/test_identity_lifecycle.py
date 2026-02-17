from fastapi.testclient import TestClient


def _events_for_user(client: TestClient, admin_headers: dict[str, str], user_id: int) -> list[dict]:
    res = client.get("/admin/events", headers=admin_headers)
    assert res.status_code == 200, res.text
    return [e for e in res.json() if e.get("entity_type") == "user" and e.get("entity_id") == str(user_id)]


def test_first_login_forces_password_change_and_rotates_credentials(
    client: TestClient,
    user_factory,
    admin_headers: dict[str, str],
):
    created = user_factory(
        role="lab_operator",
        username="identity.first.login",
        full_name="Identity First Login",
        email="identity.first.login@example.com",
    )

    first_login = client.post("/auth/login", json={"username": created["username"], "password": "Tatneft123"})
    assert first_login.status_code == 200, first_login.text
    first_login_data = first_login.json()
    assert first_login_data["must_change_password"] is True
    token = first_login_data["token"]

    change = client.post(
        "/auth/change-password",
        json={"current_password": "Tatneft123", "new_password": "IdentityStrong123"},
        headers={"authorization": f"Bearer {token}"},
    )
    assert change.status_code == 200, change.text
    assert change.json()["must_change_password"] is False

    old_password_login = client.post("/auth/login", json={"username": created["username"], "password": "Tatneft123"})
    assert old_password_login.status_code == 401

    new_password_login = client.post("/auth/login", json={"username": created["username"], "password": "IdentityStrong123"})
    assert new_password_login.status_code == 200
    assert new_password_login.json()["must_change_password"] is False

    events = _events_for_user(client, admin_headers, created["id"])
    assert any(e.get("action") == "password_changed" and e.get("details") == "self_service" for e in events)


def test_password_recovery_requires_matching_username_and_email(
    client: TestClient,
    user_factory,
    admin_headers: dict[str, str],
):
    one = user_factory(
        role="warehouse_worker",
        username="identity.dup.1",
        full_name="Identity Dup One",
        email="identity.dup@example.com",
    )
    two = user_factory(
        role="lab_operator",
        username="identity.dup.2",
        full_name="Identity Dup Two",
        email="identity.dup@example.com",
    )

    wrong_pair = client.post(
        "/auth/request-password-reset",
        json={"username": "identity.unknown", "email": "identity.dup@example.com"},
    )
    assert wrong_pair.status_code == 200
    assert wrong_pair.json().get("reset_token") in (None, "")

    request_reset = client.post(
        "/auth/request-password-reset",
        json={"username": two["username"], "email": "identity.dup@example.com"},
    )
    assert request_reset.status_code == 200, request_reset.text
    token = request_reset.json().get("reset_token")
    assert token

    confirm_reset = client.post(
        "/auth/confirm-password-reset",
        json={"token": token, "new_password": "IdentityRecovered123"},
    )
    assert confirm_reset.status_code == 200, confirm_reset.text
    assert confirm_reset.json()["must_change_password"] is False

    reused_token = client.post(
        "/auth/confirm-password-reset",
        json={"token": token, "new_password": "AnotherPassword123"},
    )
    assert reused_token.status_code == 400

    old_password_login = client.post("/auth/login", json={"username": two["username"], "password": "Tatneft123"})
    assert old_password_login.status_code == 401
    new_password_login = client.post("/auth/login", json={"username": two["username"], "password": "IdentityRecovered123"})
    assert new_password_login.status_code == 200

    events = _events_for_user(client, admin_headers, two["id"])
    assert any(e.get("action") == "password_reset_requested" for e in events)
    assert any(e.get("action") == "password_reset_completed" for e in events)
    assert one["id"] != two["id"]


def test_password_recovery_rejects_same_password(
    client: TestClient,
    user_factory,
):
    created = user_factory(
        role="lab_operator",
        username="identity.same.password",
        full_name="Identity Same Password",
        email="identity.same.password@example.com",
    )

    request_reset = client.post(
        "/auth/request-password-reset",
        json={"username": created["username"], "email": created["email"]},
    )
    assert request_reset.status_code == 200, request_reset.text
    token = request_reset.json().get("reset_token")
    assert token

    same_password_reset = client.post(
        "/auth/confirm-password-reset",
        json={"token": token, "new_password": "Tatneft123"},
    )
    assert same_password_reset.status_code == 400
    assert "different" in (same_password_reset.json().get("detail") or "").lower()
