from fastapi.testclient import TestClient


def _events_for_entity(client: TestClient, admin_headers: dict[str, str], entity_type: str, entity_id: str) -> list[dict]:
    res = client.get("/admin/events", headers=admin_headers)
    assert res.status_code == 200, res.text
    return [e for e in res.json() if e.get("entity_type") == entity_type and e.get("entity_id") == entity_id]


def test_canonical_workflow_across_roles_with_audit_trace(
    client: TestClient,
    role_headers,
    admin_headers: dict[str, str],
    canonical_users: dict[str, dict],
    make_sample_payload,
    make_analysis_payload,
    make_conflict_payload,
):
    warehouse = canonical_users["warehouse"]
    lab = canonical_users["lab"]
    action = canonical_users["action"]

    warehouse_headers = role_headers(
        username=warehouse["username"],
        full_name=warehouse["full_name"],
        role="warehouse_worker",
        roles=["warehouse_worker"],
    )
    lab_headers = role_headers(
        username=lab["username"],
        full_name=lab["full_name"],
        role="lab_operator",
        roles=["lab_operator"],
    )
    action_headers = role_headers(
        username=action["username"],
        full_name=action["full_name"],
        role="action_supervision",
        roles=["action_supervision"],
    )

    sample_payload = make_sample_payload()
    create_sample = client.post("/samples", json=sample_payload)
    assert create_sample.status_code == 201, create_sample.text
    sample_id = sample_payload["sample_id"]

    # Warehouse receives and routes sample to lab.
    move_sample = client.patch(
        f"/samples/{sample_id}",
        json={"status": "progress", "assigned_to": lab["full_name"], "storage_location": "Fridge 1 - Bin 1 - Place 1"},
        headers=warehouse_headers,
    )
    assert move_sample.status_code == 200, move_sample.text
    moved_sample = move_sample.json()
    assert moved_sample["status"] == "progress"
    assert moved_sample["assigned_to"] == lab["full_name"]

    # Admin creates analysis and assigns to a specific lab operator.
    create_analysis = client.post(
        "/planned-analyses",
        json=make_analysis_payload(sample_id=sample_id, analysis_type="SARA", assigned_to=[lab["full_name"]]),
        headers=admin_headers,
    )
    assert create_analysis.status_code == 201, create_analysis.text
    analysis = create_analysis.json()
    analysis_id = analysis["id"]
    assert analysis["sample_id"] == sample_id
    assert analysis["assigned_to"] == [lab["full_name"]]
    assert analysis["status"] == "planned"

    # Lab progresses and completes the assigned analysis.
    start_analysis = client.patch(
        f"/planned-analyses/{analysis_id}",
        json={"status": "in_progress", "assigned_to": [lab["full_name"]]},
        headers=lab_headers,
    )
    assert start_analysis.status_code == 200, start_analysis.text
    assert start_analysis.json()["status"] == "in_progress"

    complete_analysis = client.patch(
        f"/planned-analyses/{analysis_id}",
        json={"status": "completed"},
        headers=lab_headers,
    )
    assert complete_analysis.status_code == 200, complete_analysis.text
    assert complete_analysis.json()["status"] == "completed"

    # Action supervision resolves a conflict triggered by this sample.
    conflict_payload = make_conflict_payload(
        old_payload=f"{sample_id}:stored",
        new_payload=f"{sample_id}:needs_attention",
    )
    create_conflict = client.post("/conflicts", json=conflict_payload)
    assert create_conflict.status_code == 201, create_conflict.text
    conflict = create_conflict.json()
    conflict_id = conflict["id"]
    assert conflict["status"] == "open"

    resolve_conflict = client.patch(
        f"/conflicts/{conflict_id}",
        json={"status": "resolved", "resolution_note": "Return for analysis"},
        headers=action_headers,
    )
    assert resolve_conflict.status_code == 200, resolve_conflict.text
    resolved = resolve_conflict.json()
    assert resolved["status"] == "resolved"
    assert resolved["resolution_note"] == "Return for analysis"

    # Admin can review complete user list and all produced events.
    users_res = client.get("/admin/users", headers=admin_headers)
    assert users_res.status_code == 200, users_res.text
    usernames = {u["username"] for u in users_res.json()}
    assert warehouse["username"] in usernames
    assert lab["username"] in usernames
    assert action["username"] in usernames

    sample_events = _events_for_entity(client, admin_headers, "sample", sample_id)
    assert any(e["action"] == "status_change" and e["details"] == "status:new->progress" for e in sample_events)
    assert any(
        e["action"] == "updated"
        and "assigned_to:" in (e.get("details") or "")
        and f"->{lab['full_name']}" in (e.get("details") or "")
        for e in sample_events
    )

    analysis_events = _events_for_entity(client, admin_headers, "planned_analysis", str(analysis_id))
    assert any(e["action"] == "created" and f"sample={sample_id}" in (e.get("details") or "") for e in analysis_events)
    assert any(e["action"] == "status_change" and e["details"] == "status:planned->in_progress" for e in analysis_events)
    assert any(e["action"] == "status_change" and e["details"] == "status:in_progress->completed" for e in analysis_events)

    conflict_events = _events_for_entity(client, admin_headers, "conflict", str(conflict_id))
    assert any(e["action"] == "status_change" and e["details"] == "status:open->resolved" for e in conflict_events)
    assert any(e["action"] == "updated" and e["details"] == "resolution_note:->Return for analysis" for e in conflict_events)
