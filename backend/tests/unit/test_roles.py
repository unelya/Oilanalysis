from backend.main import parse_roles, serialize_roles


def test_parse_roles_handles_csv():
    assert parse_roles("admin,lab_operator") == ["admin", "lab_operator"]


def test_serialize_roles_defaults():
    assert serialize_roles(["lab_operator", ""]) == "lab_operator"
