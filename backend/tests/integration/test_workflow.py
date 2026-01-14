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

    analysis_payload = {"sample_id": "S-100", "analysis_type": "SARA", "assigned_to": ["Dr. Lee"]}
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
    payload = {"username": "qa.user", "full_name": "QA User", "role": "lab_operator"}
    res = client.post("/admin/users", json=payload)
    assert res.status_code == 403

    res = client.post("/admin/users", json=payload, headers={"x-role": "admin"})
    assert res.status_code == 201
    data = res.json()
    assert data["username"] == "qa.user"
    assert data["role"] == "lab_operator"
