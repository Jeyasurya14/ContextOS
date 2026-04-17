"""Create prompts table

Revision ID: p1a2b3c4d5e6
Revises: create_query_counts_table
Create Date: 2026-04-17 11:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "p1a2b3c4d5e6"
down_revision: Union[str, None] = "5731f53bce58"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    if "prompts" not in existing:
        op.create_table(
            "prompts",
            sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("team_id", sa.String(length=36), nullable=True),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("description", sa.String(length=500), nullable=True),
            sa.Column("scope", sa.String(length=20), nullable=False, server_default="personal"),
            sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
            sa.Column("usage_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {idx["name"] for idx in inspector.get_indexes("prompts")} if "prompts" in existing else set()

    if "ix_prompts_user_id" not in indexes:
        op.create_index("ix_prompts_user_id", "prompts", ["user_id"])
    if "ix_prompts_team_id" not in indexes:
        op.create_index("ix_prompts_team_id", "prompts", ["team_id"])
    if "ix_prompts_scope" not in indexes:
        op.create_index("ix_prompts_scope", "prompts", ["scope"])


def downgrade() -> None:
    op.drop_index("ix_prompts_scope", table_name="prompts")
    op.drop_index("ix_prompts_team_id", table_name="prompts")
    op.drop_index("ix_prompts_user_id", table_name="prompts")
    op.drop_table("prompts")
