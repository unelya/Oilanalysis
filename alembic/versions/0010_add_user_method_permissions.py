"""add user method permissions

Revision ID: 0010
Revises: 0009
Create Date: 2026-02-16
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_method_permissions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("method_name", sa.String(), nullable=False),
        sa.UniqueConstraint("user_id", "method_name", name="uq_user_method_permission"),
    )

    bind = op.get_bind()
    users = bind.execute(sa.text("SELECT id, role, roles FROM users")).fetchall()
    default_methods = ["SARA", "IR", "Mass Spectrometry", "Viscosity"]
    insert_stmt = sa.text(
        "INSERT INTO user_method_permissions (user_id, method_name) VALUES (:user_id, :method_name)"
    )
    for user_id, role, roles in users:
        role_values = [part.strip() for part in (roles or role or "").split(",") if part.strip()]
        if "lab_operator" not in role_values:
            continue
        for method_name in default_methods:
            bind.execute(insert_stmt, {"user_id": user_id, "method_name": method_name})


def downgrade():
    op.drop_table("user_method_permissions")
