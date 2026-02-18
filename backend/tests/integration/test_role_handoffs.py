from fastapi.testclient import TestClient
from uuid import uuid4


def _create_analysis_for_sample(
    client: TestClient,
    admin_headers: dict[str, str],
    make_sample_payload,
    make_analysis_payload,
    *,
    analysis_type: str = "SARA",
) -> dict:
    sample_payload = make_sample_payload(sample_id=f"S-HANDOFF-{uuid4().hex[:10]}")
    sample_res = client.post("/samples", json=sample_payload)
    assert sample_res.status_code == 201, sample_res.text

    analysis_res = client.post(
        "/planned-analyses",
        json=make_analysis_payload(sample_id=sample_payload["sample_id"], analysis_type=analysis_type),
        headers=admin_headers,
    )
    assert analysis_res.status_code == 201, analysis_res.text
    return analysis_res.json()


def test_lab_operator_can_assign_only_self(
    client: TestClient,
    role_headers,
    admin_headers: dict[str, str],
    user_factory,
    make_sample_payload,
    make_analysis_payload,
):
    lab = user_factory(
        role="lab_operator",
        username="handoff.lab.self",
        full_name="Handoff Lab Self",
        email="handoff.lab.self@example.com",
        method_permissions=["SARA", "IR", "Mass Spectrometry", "Viscosity", "Electrophoresis"],
    )
    other_lab = user_factory(
        role="lab_operator",
        username="handoff.lab.other",
        full_name="Handoff Lab Other",
        email="handoff.lab.other@example.com",
        method_permissions=["SARA", "IR", "Mass Spectrometry", "Viscosity", "Electrophoresis"],
    )

    analysis = _create_analysis_for_sample(
        client,
        admin_headers,
        make_sample_payload,
        make_analysis_payload,
        analysis_type="SARA",
    )

    lab_headers = role_headers(
        username=lab["username"],
        full_name=lab["full_name"],
        role="lab_operator",
        roles=["lab_operator"],
    )

    assign_other = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": [other_lab["full_name"]]},
        headers=lab_headers,
    )
    assert assign_other.status_code == 403

    assign_self = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": [lab["full_name"]]},
        headers=lab_headers,
    )
    assert assign_self.status_code == 200, assign_self.text
    assert assign_self.json()["assigned_to"] == [lab["full_name"]]


def test_admin_can_assign_multiple_lab_operators(
    client: TestClient,
    admin_headers: dict[str, str],
    user_factory,
    make_sample_payload,
    make_analysis_payload,
):
    lab_one = user_factory(
        role="lab_operator",
        username="handoff.lab.one",
        full_name="Handoff Lab One",
        email="handoff.lab.one@example.com",
        method_permissions=["SARA", "IR", "Mass Spectrometry", "Viscosity", "Electrophoresis"],
    )
    lab_two = user_factory(
        role="lab_operator",
        username="handoff.lab.two",
        full_name="Handoff Lab Two",
        email="handoff.lab.two@example.com",
        method_permissions=["SARA", "IR", "Mass Spectrometry", "Viscosity", "Electrophoresis"],
    )

    analysis = _create_analysis_for_sample(
        client,
        admin_headers,
        make_sample_payload,
        make_analysis_payload,
        analysis_type="IR",
    )

    assign_both = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": [lab_one["full_name"], lab_two["full_name"]]},
        headers=admin_headers,
    )
    assert assign_both.status_code == 200, assign_both.text
    assert assign_both.json()["assigned_to"] == [lab_one["full_name"], lab_two["full_name"]]


def test_non_admin_cannot_use_admin_user_endpoints(
    client: TestClient,
    role_headers,
    admin_headers: dict[str, str],
    user_factory,
):
    warehouse = user_factory(
        role="warehouse_worker",
        username="handoff.warehouse.guard",
        full_name="Handoff Warehouse Guard",
        email="handoff.warehouse.guard@example.com",
    )

    non_admin_headers = role_headers(
        username=warehouse["username"],
        full_name=warehouse["full_name"],
        role="warehouse_worker",
        roles=["warehouse_worker"],
    )

    list_forbidden = client.get("/admin/users", headers=non_admin_headers)
    assert list_forbidden.status_code == 403

    target = user_factory(
        role="action_supervision",
        username="handoff.delete.target",
        full_name="Handoff Delete Target",
        email="handoff.delete.target@example.com",
    )
    delete_forbidden = client.delete(f"/admin/users/{target['id']}", headers=non_admin_headers)
    assert delete_forbidden.status_code == 403

    delete_allowed = client.delete(f"/admin/users/{target['id']}", headers=admin_headers)
    assert delete_allowed.status_code == 200
    assert delete_allowed.json()["deleted"] is True


def test_action_supervision_cannot_assign_planned_analysis(
    client: TestClient,
    role_headers,
    admin_headers: dict[str, str],
    user_factory,
    make_sample_payload,
    make_analysis_payload,
):
    action = user_factory(
        role="action_supervision",
        username="handoff.action.role",
        full_name="Handoff Action Role",
        email="handoff.action.role@example.com",
    )
    lab = user_factory(
        role="lab_operator",
        username="handoff.action.lab",
        full_name="Handoff Action Lab",
        email="handoff.action.lab@example.com",
        method_permissions=["SARA", "IR", "Mass Spectrometry", "Viscosity", "Electrophoresis"],
    )

    analysis = _create_analysis_for_sample(
        client,
        admin_headers,
        make_sample_payload,
        make_analysis_payload,
        analysis_type="Mass Spectrometry",
    )

    action_headers = role_headers(
        username=action["username"],
        full_name=action["full_name"],
        role="action_supervision",
        roles=["action_supervision"],
    )
    forbidden_assign = client.patch(
        f"/planned-analyses/{analysis['id']}",
        json={"assigned_to": [lab["full_name"]]},
        headers=action_headers,
    )
    assert forbidden_assign.status_code == 403
