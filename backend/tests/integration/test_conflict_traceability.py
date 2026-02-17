from fastapi.testclient import TestClient


def _conflict_events(client: TestClient, admin_headers: dict[str, str], conflict_id: int) -> list[dict]:
    res = client.get("/admin/events", headers=admin_headers)
    assert res.status_code == 200, res.text
    return [
        e
        for e in res.json()
        if e.get("entity_type") == "conflict" and e.get("entity_id") == str(conflict_id)
    ]


def test_conflict_open_to_resolved_writes_status_and_note_audit(
    client: TestClient,
    admin_headers: dict[str, str],
    make_conflict_payload,
):
    create_res = client.post(
        "/conflicts",
        json=make_conflict_payload(old_payload="sample=100;state=stored", new_payload="sample=100;state=needs_attention"),
    )
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    conflict_id = created["id"]
    assert created["status"] == "open"

    resolve_res = client.patch(
        f"/conflicts/{conflict_id}",
        json={"status": "resolved", "resolution_note": "Returned to lab for rerun"},
        headers={"x-user": "Action Supervisor"},
    )
    assert resolve_res.status_code == 200, resolve_res.text
    resolved = resolve_res.json()
    assert resolved["status"] == "resolved"
    assert resolved["resolution_note"] == "Returned to lab for rerun"

    events = _conflict_events(client, admin_headers, conflict_id)
    assert any(e.get("action") == "status_change" and e.get("details") == "status:open->resolved" for e in events)
    assert any(
        e.get("action") == "updated"
        and e.get("details") == "resolution_note:->Returned to lab for rerun"
        for e in events
    )


def test_conflict_resolution_note_change_is_fully_traceable(
    client: TestClient,
    admin_headers: dict[str, str],
    make_conflict_payload,
):
    create_res = client.post(
        "/conflicts",
        json=make_conflict_payload(old_payload="sample=101;state=stored", new_payload="sample=101;state=needs_attention"),
    )
    assert create_res.status_code == 201, create_res.text
    conflict_id = create_res.json()["id"]

    first_update = client.patch(
        f"/conflicts/{conflict_id}",
        json={"resolution_note": "Initial decision"},
        headers={"x-user": "Action Supervisor"},
    )
    assert first_update.status_code == 200, first_update.text
    assert first_update.json()["resolution_note"] == "Initial decision"

    second_update = client.patch(
        f"/conflicts/{conflict_id}",
        json={"resolution_note": "Final decision after review"},
        headers={"x-user": "Action Supervisor"},
    )
    assert second_update.status_code == 200, second_update.text
    assert second_update.json()["resolution_note"] == "Final decision after review"

    events = _conflict_events(client, admin_headers, conflict_id)
    assert any(e.get("action") == "updated" and e.get("details") == "resolution_note:->Initial decision" for e in events)
    assert any(
        e.get("action") == "updated"
        and e.get("details") == "resolution_note:Initial decision->Final decision after review"
        for e in events
    )
