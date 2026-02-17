"""allow duplicate user emails

Revision ID: 0012
Revises: 0011
Create Date: 2026-02-17
"""

from alembic import op
import sqlalchemy as sa


revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute(sa.text("DROP INDEX IF EXISTS ix_users_email"))
        op.execute(sa.text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_users_email ON users (email)"))
    else:
        op.execute(sa.text("DROP INDEX IF EXISTS ix_users_email"))
        op.create_index("ix_users_email", "users", ["email"], unique=False)


def downgrade():
    op.drop_index("ix_users_email", table_name="users")
    op.create_index("ix_users_email", "users", ["email"], unique=True)

