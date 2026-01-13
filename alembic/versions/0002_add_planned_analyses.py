"""add planned analyses table

Revision ID: 0002
Revises: 0001
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("DROP TABLE IF EXISTS planned_analyses CASCADE")
    op.execute("DROP TYPE IF EXISTS analysisstatus CASCADE")
    op.create_table(
        "planned_analyses",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("sample_id", sa.String(), sa.ForeignKey("samples.sample_id", ondelete="CASCADE"), nullable=False),
        sa.Column("analysis_type", sa.String(), nullable=False),
        sa.Column("status", sa.Enum("planned", "in_progress", "review", "completed", "failed", name="analysisstatus"), nullable=False, server_default="planned"),
        sa.Column("assigned_to", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_table("planned_analyses")
    op.execute("DROP TYPE IF EXISTS analysisstatus")
