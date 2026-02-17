"""add user auth fields

Revision ID: 0011
Revises: 0010
Create Date: 2026-02-17
"""

from alembic import op
import sqlalchemy as sa


revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("password_hash", sa.String(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("users", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("users", sa.Column("password_changed_at", sa.String(), nullable=True))

    op.alter_column("users", "password_hash", server_default=None)
    op.alter_column("users", "must_change_password", server_default=None)
    op.alter_column("users", "is_active", server_default=None)


def downgrade():
    op.drop_column("users", "password_changed_at")
    op.drop_column("users", "is_active")
    op.drop_column("users", "must_change_password")
    op.drop_column("users", "password_hash")

