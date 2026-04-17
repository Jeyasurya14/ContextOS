"""add_new_features_tables

Revision ID: ca950b1785dc
Revises: p1a2b3c4d5e6
Create Date: 2026-04-17 22:33:30.097669

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ca950b1785dc'
down_revision: Union[str, None] = 'p1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    # Activities table for activity feed
    if "activities" not in existing:
        op.create_table(
            "activities",
            sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("team_id", sa.String(length=36), nullable=True),
            sa.Column("activity_type", sa.String(length=50), nullable=False),
            sa.Column("entity_type", sa.String(length=50), nullable=False),
            sa.Column("entity_id", sa.UUID(as_uuid=False), nullable=True),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id")
        )
        op.create_index("ix_activities_user_id", "activities", ["user_id"])
        op.create_index("ix_activities_team_id", "activities", ["team_id"])
        op.create_index("ix_activities_created_at", "activities", ["created_at"])
        op.create_index("ix_activities_type", "activities", ["activity_type"])

    # Favorites table
    if "favorites" not in existing:
        op.create_table(
            "favorites",
            sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("entity_type", sa.String(length=50), nullable=False),
            sa.Column("entity_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "entity_type", "entity_id", name="uq_user_entity_favorite")
        )
        op.create_index("ix_favorites_user_id", "favorites", ["user_id"])

    # Collections table
    if "collections" not in existing:
        op.create_table(
            "collections",
            sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("color", sa.String(length=20), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id")
        )
        op.create_index("ix_collections_user_id", "collections", ["user_id"])

    # Collection items table
    if "collection_items" not in existing:
        op.create_table(
            "collection_items",
            sa.Column("collection_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("entity_type", sa.String(length=50), nullable=False),
            sa.Column("entity_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("added_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["collection_id"], ["collections.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("collection_id", "entity_type", "entity_id")
        )
        op.create_index("ix_collection_items_collection_id", "collection_items", ["collection_id"])

    # User insights table
    if "user_insights" not in existing:
        op.create_table(
            "user_insights",
            sa.Column("id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("user_id", sa.UUID(as_uuid=False), nullable=False),
            sa.Column("insight_type", sa.String(length=50), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id")
        )
        op.create_index("ix_user_insights_user_id", "user_insights", ["user_id"])
        op.create_index("ix_user_insights_created_at", "user_insights", ["created_at"])


def downgrade() -> None:
    op.drop_table("user_insights")
    op.drop_table("collection_items")
    op.drop_table("collections")
    op.drop_table("favorites")
    op.drop_table("activities")
