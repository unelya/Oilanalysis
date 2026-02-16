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

    res = client.patch("/samples/S-100", json={"status": "progress"})
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
