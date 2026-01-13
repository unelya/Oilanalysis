"""add audit fields to conflicts

Revision ID: 0005
Revises: 0004
Create Date: 2025-12-29
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("conflicts", sa.Column("updated_by", sa.String(), nullable=True))
    op.add_column("conflicts", sa.Column("updated_at", sa.String(), nullable=True))


def downgrade():
    op.drop_column("conflicts", "updated_at")
    op.drop_column("conflicts", "updated_by")
