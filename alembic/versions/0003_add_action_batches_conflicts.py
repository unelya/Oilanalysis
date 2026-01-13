"""add action batches and conflicts

Revision ID: 0003
Revises: 0002
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS action_batches CASCADE")
    op.execute("DROP TYPE IF EXISTS actionbatchstatus CASCADE")
    op.execute("DROP TABLE IF EXISTS conflicts CASCADE")
    op.execute("DROP TYPE IF EXISTS conflictstatus CASCADE")

    op.create_table(
        "action_batches",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("date", sa.String(), nullable=False),
        sa.Column("status", sa.Enum("new", "review", "done", name="actionbatchstatus"), nullable=False, server_default="new"),
    )

    op.create_table(
        "conflicts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("old_payload", sa.String(), nullable=False),
        sa.Column("new_payload", sa.String(), nullable=False),
        sa.Column("status", sa.Enum("open", "resolved", name="conflictstatus"), nullable=False, server_default="open"),
        sa.Column("resolution_note", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_table("conflicts")
    op.execute("DROP TYPE IF EXISTS conflictstatus")
    op.drop_table("action_batches")
    op.execute("DROP TYPE IF EXISTS actionbatchstatus")
