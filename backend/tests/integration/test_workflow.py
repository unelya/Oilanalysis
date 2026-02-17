def test_auth_requires_valid_password_and_forces_password_change(client):
    login = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    assert login.status_code == 200
    data = login.json()
    assert data["role"] == "admin"
    assert data["must_change_password"] is True
    token = data["token"]

    invalid = client.post("/auth/login", json={"username": "admin", "password": "wrong-password"})
    assert invalid.status_code == 401

    changed = client.post(
        "/auth/change-password",
        json={"current_password": "admin", "new_password": "AdminStrong123"},
        headers={"authorization": f"Bearer {token}"},
    )
    assert changed.status_code == 200
    changed_data = changed.json()
    assert changed_data["must_change_password"] is False

    old_password_login = client.post("/auth/login", json={"username": "admin", "password": "admin"})
    assert old_password_login.status_code == 401

    new_password_login = client.post("/auth/login", json={"username": "admin", "password": "AdminStrong123"})
    assert new_password_login.status_code == 200
    assert new_password_login.json()["must_change_password"] is False


def test_password_recovery_flow_by_email(client):
    create_res = client.post(
        "/admin/users",
        json={"username": "recovery.user", "full_name": "Recovery User", "email": "recovery@example.com", "role": "lab_operator"},
        headers={"x-role": "admin"},
    )
    assert create_res.status_code == 201

    request_res = client.post(
        "/auth/request-password-reset",
        json={"username": "recovery.user", "email": "recovery@example.com"},
    )
    assert request_res.status_code == 200
    request_data = request_res.json()
    assert "message" in request_data
    assert request_data.get("reset_token")
    reset_token = request_data["reset_token"]

    confirm_res = client.post(
        "/auth/confirm-password-reset",
        json={"token": reset_token, "new_password": "Recovered123"},
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["must_change_password"] is False

    login_old = client.post("/auth/login", json={"username": "recovery.user", "password": "Tatneft123"})
    assert login_old.status_code == 401

    login_new = client.post("/auth/login", json={"username": "recovery.user", "password": "Recovered123"})
    assert login_new.status_code == 200
    assert login_new.json()["must_change_password"] is False


def test_password_recovery_rejects_same_password(client):
    create_res = client.post(
        "/admin/users",
        json={"username": "same.password.user", "full_name": "Same Password User", "email": "same.password@example.com", "role": "lab_operator"},
        headers={"x-role": "admin"},
    )
    assert create_res.status_code == 201

    request_res = client.post(
        "/auth/request-password-reset",
        json={"username": "same.password.user", "email": "same.password@example.com"},
    )
    assert request_res.status_code == 200
    token = request_res.json().get("reset_token")
    assert token

    confirm_res = client.post(
        "/auth/confirm-password-reset",
        json={"token": token, "new_password": "Tatneft123"},
    )
    assert confirm_res.status_code == 400


def test_password_recovery_requires_matching_username_and_email(client):
    create_one = client.post(
        "/admin/users",
        json={"username": "dup.recover.1", "full_name": "Dup Recover One", "email": "dup.recover@example.com", "role": "warehouse_worker"},
        headers={"x-role": "admin"},
    )
    assert create_one.status_code == 201
    create_two = client.post(
        "/admin/users",
        json={"username": "dup.recover.2", "full_name": "Dup Recover Two", "email": "dup.recover@example.com", "role": "lab_operator"},
        headers={"x-role": "admin"},
    )
    assert create_two.status_code == 201

    wrong_username = client.post(
        "/auth/request-password-reset",
        json={"username": "unknown-user", "email": "dup.recover@example.com"},
    )
    assert wrong_username.status_code == 200
    assert wrong_username.json().get("reset_token") in (None, "")

    request_res = client.post(
        "/auth/request-password-reset",
        json={"username": "dup.recover.2", "email": "dup.recover@example.com"},
    )
    assert request_res.status_code == 200
    assert request_res.json().get("reset_token")


def test_sample_to_analysis_workflow(client):
    sample_payload = {
        "sample_id": "S-100",
        "well_id": "W-10",
        "horizon": "H1",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf A",
        "assigned_to": "Alex",
    }
    res = client.post("/samples", json=sample_payload)
    assert res.status_code == 201
    assert res.json()["sample_id"] == "S-100"

    res = client.patch("/samples/S-100", json={"status": "progress", "storage_location": "Shelf A2"}, headers={"x-user": "Admin User"})
    assert res.status_code == 200
    assert res.json()["status"] == "progress"

    analysis_payload = {"sample_id": "S-100", "analysis_type": "SARA"}
    res = client.post("/planned-analyses", json=analysis_payload)
    assert res.status_code == 201
    analysis = res.json()
    assert analysis["sample_id"] == "S-100"
    assert analysis["analysis_type"] == "SARA"

    res = client.patch(f"/planned-analyses/{analysis['id']}", json={"status": "in_progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"

    events = client.get("/admin/events", headers={"x-role": "admin"})
    assert events.status_code == 200
    sample_events = [item for item in events.json() if item.get("entity_type") == "sample" and item.get("entity_id") == "S-100"]
    assert any(item.get("action") == "status_change" and item.get("details") == "status:new->progress" for item in sample_events)
    assert any(item.get("action") == "updated" and "storage_location:Shelf A->Shelf A2" in (item.get("details") or "") for item in sample_events)


def test_action_and_conflict_workflow(client):
    batch_payload = {"title": "Batch-1", "date": "2024-02-01", "status": "new"}
    res = client.post("/action-batches", json=batch_payload)
    assert res.status_code == 201
    assert res.json()["title"] == "Batch-1"

    res = client.get("/action-batches")
    assert res.status_code == 200
    assert any(item["title"] == "Batch-1" for item in res.json())

    conflict_payload = {"old_payload": "old", "new_payload": "new", "status": "open"}
    res = client.post("/conflicts", json=conflict_payload)
    assert res.status_code == 201
    conflict = res.json()
    assert conflict["status"] == "open"

    res = client.patch(
        f"/conflicts/{conflict['id']}",
        json={"status": "resolved", "resolution_note": "fixed"},
        headers={"authorization": "Bearer tester"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "resolved"
    assert res.json()["resolution_note"] == "fixed"

    events = client.get("/admin/events", headers={"x-role": "admin"})
    assert events.status_code == 200
    conflict_events = [item for item in events.json() if item.get("entity_type") == "conflict" and item.get("entity_id") == str(conflict["id"])]
    assert any(item.get("action") == "status_change" and item.get("details") == "status:open->resolved" for item in conflict_events)
    assert any(item.get("action") == "updated" and item.get("details") == "resolution_note:->fixed" for item in conflict_events)


def test_admin_user_creation_requires_admin(client):
    payload = {"username": "qa.user", "full_name": "QA User", "email": "qa.user@example.com", "role": "lab_operator"}
    res = client.post("/admin/users", json=payload)
    assert res.status_code == 403

    res = client.post("/admin/users", json=payload, headers={"x-role": "admin"})
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "qa.user"
    assert data["email"] == "qa.user@example.com"
    assert data["role"] == "lab_operator"
    assert data["default_password"] == "Tatneft123"
    login = client.post("/auth/login", json={"username": "qa.user", "password": "Tatneft123"})
    assert login.status_code == 200
    assert login.json()["must_change_password"] is True


def test_admin_can_create_users_with_duplicate_emails(client):
    payload_one = {"username": "dup.mail.1", "full_name": "Dup Mail One", "email": "dup@example.com", "role": "lab_operator"}
    payload_two = {"username": "dup.mail.2", "full_name": "Dup Mail Two", "email": "dup@example.com", "role": "warehouse_worker"}

    res_one = client.post("/admin/users", json=payload_one, headers={"x-role": "admin"})
    assert res_one.status_code == 201

    res_two = client.post("/admin/users", json=payload_two, headers={"x-role": "admin"})
    assert res_two.status_code == 201
    assert res_two.json()["email"] == "dup@example.com"


def test_admin_can_update_username_and_full_name(client):
    payload = {"username": "rename.me", "full_name": "Rename Me", "email": "rename.me@example.com", "role": "lab_operator"}
    create_res = client.post("/admin/users", json=payload, headers={"x-role": "admin"})
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    forbidden = client.patch(f"/admin/users/{user_id}", json={"username": "rename.updated"})
    assert forbidden.status_code == 403

    res = client.patch(
        f"/admin/users/{user_id}",
        json={"username": "rename.updated", "full_name": "Rename Updated"},
        headers={"x-role": "admin"},
    )
    assert res.status_code == 200
    updated = res.json()
    assert updated["username"] == "rename.updated"
    assert updated["full_name"] == "Rename Updated"

    second_payload = {"username": "another.user", "full_name": "Another User", "email": "another.user@example.com", "role": "lab_operator"}
    second = client.post("/admin/users", json=second_payload, headers={"x-role": "admin"})
    assert second.status_code == 201
    second_id = second.json()["id"]

    duplicate = client.patch(
        f"/admin/users/{second_id}",
        json={"username": "rename.updated"},
        headers={"x-role": "admin"},
    )
    assert duplicate.status_code == 400

    events = client.get("/admin/events", headers={"x-role": "admin"})
    assert events.status_code == 200
    event_details = [item.get("details") or "" for item in events.json() if item.get("entity_type") == "user" and item.get("entity_id") == str(user_id)]
    assert any("username:rename.me->rename.updated" in detail for detail in event_details)
    assert any("full_name:Rename Me->Rename Updated" in detail for detail in event_details)


def test_lab_operator_can_assign_only_self(client):
    sample_payload = {
        "sample_id": "S-201",
        "well_id": "W-20",
        "horizon": "H2",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf B",
    }
    assert client.post("/samples", json=sample_payload).status_code == 201
    analysis = client.post("/planned-analyses", json={"sample_id": "S-201", "analysis_type": "SARA"}).json()

    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Admin User"]},
        headers={"x-role": "lab_operator", "x-user": "Lab Operator"},
    )
    assert res.status_code == 403

    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Lab Operator"]},
        headers={"x-role": "lab_operator", "x-user": "Lab Operator"},
    )
    assert res.status_code == 200
    assert res.json()["assigned_to"] == ["Lab Operator"]


def test_admin_can_assign_any_lab_operator(client):
    create_user_payload = {"username": "egg", "full_name": "Egg", "email": "egg@example.com", "role": "lab_operator"}
    create_res = client.post("/admin/users", json=create_user_payload, headers={"x-role": "admin"})
    assert create_res.status_code == 201
    chick_id = create_res.json()["id"]

    sample_payload = {
        "sample_id": "S-202",
        "well_id": "W-21",
        "horizon": "H3",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf C",
    }
    assert client.post("/samples", json=sample_payload).status_code == 201
    analysis = client.post("/planned-analyses", json={"sample_id": "S-202", "analysis_type": "IR"}).json()

    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Egg"]},
        headers={"x-role": "admin", "x-user": "Admin User"},
    )
    assert res.status_code == 200
    assert res.json()["assigned_to"] == ["Egg"]
    events = client.get("/admin/events", headers={"x-role": "admin"})
    assert events.status_code == 200
    analysis_events = [item for item in events.json() if item.get("entity_type") == "planned_analysis" and item.get("entity_id") == str(analysis["id"])]
    assert any(item.get("action") == "operator_assigned" and "assignees:->Egg" in (item.get("details") or "") for item in analysis_events)


def test_method_permission_controls_assignment(client):
    create_user_payload = {
        "username": "chick",
        "full_name": "Chick",
        "email": "chick@example.com",
        "role": "lab_operator",
        "method_permissions": ["SARA"],
    }
    create_res = client.post("/admin/users", json=create_user_payload, headers={"x-role": "admin"})
    assert create_res.status_code == 201
    chick_id = create_res.json()["id"]

    sample_payload = {
        "sample_id": "S-203",
        "well_id": "W-22",
        "horizon": "H4",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf D",
    }
    assert client.post("/samples", json=sample_payload).status_code == 201
    analysis = client.post("/planned-analyses", json={"sample_id": "S-203", "analysis_type": "IR"}).json()

    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Chick"]},
        headers={"x-role": "admin", "x-user": "Admin User"},
    )
    assert res.status_code == 400

    assert (
        client.patch(
            f"/admin/users/{chick_id}",
            json={"method_permissions": ["SARA", "IR"]},
            headers={"x-role": "admin"},
        ).status_code
        == 200
    )
    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Chick"]},
        headers={"x-role": "admin", "x-user": "Admin User"},
    )
    assert res.status_code == 200
    assert res.json()["assigned_to"] == ["Chick"]


def test_lab_operator_self_assign_keeps_existing_assignees(client):
    chick = client.post(
        "/admin/users",
        json={"username": "chick2", "full_name": "Chick Two", "email": "chick2@example.com", "role": "lab_operator"},
        headers={"x-role": "admin"},
    )
    assert chick.status_code == 201
    egg = client.post(
        "/admin/users",
        json={"username": "egg2", "full_name": "Egg Two", "email": "egg2@example.com", "role": "lab_operator"},
        headers={"x-role": "admin"},
    )
    assert egg.status_code == 201

    sample_payload = {
        "sample_id": "S-204",
        "well_id": "W-23",
        "horizon": "H5",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf E",
    }
    assert client.post("/samples", json=sample_payload).status_code == 201
    analysis = client.post("/planned-analyses", json={"sample_id": "S-204", "analysis_type": "Mass Spectrometry"}).json()

    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Chick Two"]},
        headers={"x-role": "admin", "x-user": "Admin User"},
    )
    assert res.status_code == 200

    res = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": ["Chick Two", "Egg Two"]},
        headers={"x-role": "lab_operator", "x-user": "Egg Two"},
    )
    assert res.status_code == 200
    assert sorted(res.json()["assigned_to"]) == ["Chick Two", "Egg Two"]


def test_admin_event_log_listing(client):
    sample_payload = {
        "sample_id": "S-205",
        "well_id": "W-24",
        "horizon": "H6",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf F",
    }
    assert client.post("/samples", json=sample_payload).status_code == 201
    assert client.patch("/samples/S-205", json={"status": "progress"}, headers={"x-user": "Admin User"}).status_code == 200

    forbidden = client.get("/admin/events")
    assert forbidden.status_code == 403

    res = client.get("/admin/events", headers={"x-role": "admin"})
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert any(item["entity_type"] == "sample" and item["entity_id"] == "S-205" for item in data)
