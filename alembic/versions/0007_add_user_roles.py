"""add user roles array column

Revision ID: 0007
Revises: 0006
Create Date: 2025-12-30
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("roles", sa.String(), nullable=False, server_default="lab_operator"))
    # backfill existing rows
    op.execute("UPDATE users SET roles = role WHERE roles IS NOT NULL")
    op.alter_column("users", "roles", server_default=None)


def downgrade():
    op.drop_column("users", "roles")
