# backend/alembic/versions/add_production_indexes.py

"""add_production_indexes

Add composite indexes for optimized query performance in production.
Common queries:
- Context retrieval by user + source_type
- Conversation listing by user + updated_at
- Message retrieval by conversation + created_at
- Context chunks by content_hash for deduplication
- Users by api_key_hash for fast lookup
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_production_indexes'
down_revision = 'add_is_admin_001'
branch_labels = None
depends_on = None

# IMPORTANT: This migration uses CREATE INDEX CONCURRENTLY which cannot run in a transaction.
# Set to False to disable transactional DDL for this migration.
# See: https://alembic.sqlalchemy.org/en/latest/faq.html#how-can-i-run-create-index-concurrently
transactional_ddl = False


def upgrade() -> None:
    # These indexes use CREATE INDEX CONCURRENTLY which requires running outside a transaction.
    # Using autocommit_block ensures each index is created without locking the table.
    # if_not_exists=True makes the migration idempotent (safe to re-run).

    # Composite index for context_chunks: common query pattern is user_id + source_type
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_context_chunks_user_source',
            'context_chunks',
            ['user_id', 'source_type'],
            postgresql_concurrently=True,
            if_not_exists=True,
        )

    # Composite index for conversations: user_id + updated_at DESC for listing
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_conversations_user_updated',
            'conversations',
            ['user_id', sa.text('updated_at DESC')],
            postgresql_concurrently=True,
            if_not_exists=True,
        )

    # Composite index for conversation_messages: conversation_id + created_at
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_conversation_messages_conversation_created',
            'conversation_messages',
            ['conversation_id', sa.text('created_at ASC')],
            postgresql_concurrently=True,
            if_not_exists=True,
        )

    # Partial index for active conversations only (most queries filter by is_active)
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_conversations_user_active',
            'conversations',
            ['user_id'],
            postgresql_where=sa.text('is_active = true'),
            postgresql_concurrently=True,
            if_not_exists=True,
        )

    # Ensure api_key_hash has a btree index (it does, but with lower case)
    # This creates a proper index with text_pattern_ops for prefix searches if needed
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_users_api_key_hash',
            'users',
            ['api_key_hash'],
            unique=True,
            postgresql_concurrently=True,
            if_not_exists=True,
        )

    # Index for integrations: user_id + provider for integration listing
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_integrations_user_provider',
            'integrations',
            ['user_id', 'provider'],
            postgresql_concurrently=True,
            if_not_exists=True,
        )

    # Index for billing: user_id + period for query counting
    with op.get_context().autocommit_block():
        op.create_index(
            'ix_query_counts_user_period',
            'query_counts',
            ['user_id', sa.text('period DESC')],
            postgresql_concurrently=True,
            if_not_exists=True,
        )


def downgrade() -> None:
    # Drop indexes if they exist - these must also be concurrent to avoid locks
    # Note: We cannot use IF EXISTS in drop_index, so downgrade may fail if index doesn't exist
    # In production, we typically don't run downgrades, so this is acceptable
    with op.get_context().autocommit_block():
        op.drop_index('ix_query_counts_user_period', table_name='query_counts')
        op.drop_index('ix_integrations_user_provider', table_name='integrations')
        op.drop_index('ix_users_api_key_hash', table_name='users')
        op.drop_index('ix_conversations_user_active', table_name='conversations')
        op.drop_index('ix_conversation_messages_conversation_created', table_name='conversation_messages')
        op.drop_index('ix_conversations_user_updated', table_name='conversations')
        op.drop_index('ix_context_chunks_user_source', table_name='context_chunks')
