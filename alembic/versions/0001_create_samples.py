"""create samples table

Revision ID: 0001
Revises: 
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "samples",
        sa.Column("sample_id", sa.String(), primary_key=True),
        sa.Column("well_id", sa.String(), nullable=False),
        sa.Column("horizon", sa.String(), nullable=False),
        sa.Column("sampling_date", sa.String(), nullable=False),
        sa.Column("status", sa.Enum("new", "progress", "review", "done", name="samplestatus"), nullable=False, server_default="new"),
        sa.Column("storage_location", sa.String(), nullable=True),
    )


def downgrade():
    op.drop_table("samples")
    op.execute("DROP TYPE IF EXISTS samplestatus")
