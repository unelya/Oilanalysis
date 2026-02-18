"""add arrival_date to samples

Revision ID: 0014
Revises: 0013
Create Date: 2026-02-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("samples", sa.Column("arrival_date", sa.String(), nullable=True))
    op.execute("UPDATE samples SET arrival_date = sampling_date WHERE arrival_date IS NULL")
    op.alter_column("samples", "arrival_date", existing_type=sa.String(), nullable=False)


def downgrade():
    op.drop_column("samples", "arrival_date")

