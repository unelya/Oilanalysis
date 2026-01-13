"""add users table

Revision ID: 0004
Revises: 0003
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS users CASCADE")
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("username", sa.String(), unique=True, nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False, server_default="lab_operator"),
    )


def downgrade():
    op.drop_table("users")
