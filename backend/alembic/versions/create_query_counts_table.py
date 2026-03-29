"""Create query_counts table

Revision ID: create_query_counts_table
Revises: add_production_indexes
Create Date: 2026-03-28 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "create_query_counts_table"
down_revision: Union[str, None] = "add_is_admin_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())

    if "query_counts" not in existing_tables:
        op.create_table(
            "query_counts",
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("period", sa.DateTime(timezone=True), nullable=False),
            sa.Column("count", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = {idx["name"] for idx in inspector.get_indexes("query_counts")}
    if "ix_query_counts_user_period" not in indexes:
        with op.get_context().autocommit_block():
            op.create_index(
                "ix_query_counts_user_period",
                "query_counts",
                ["user_id", sa.text("period DESC")],
                postgresql_concurrently=True,
            )


def downgrade() -> None:
    op.drop_index("ix_query_counts_user_period", table_name="query_counts")
    op.drop_table("query_counts")
