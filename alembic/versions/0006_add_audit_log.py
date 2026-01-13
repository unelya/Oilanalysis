"""add audit log table

Revision ID: 0006
Revises: 0005
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("entity_type", sa.String(), nullable=False),
        sa.Column("entity_id", sa.String(), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("performed_by", sa.String(), nullable=True),
        sa.Column("performed_at", sa.String(), nullable=False),
        sa.Column("details", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_table("audit_log")
