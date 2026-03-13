"""add_stripe_fields

Revision ID: a5256b740222
Revises: 6892aee77761
Create Date: 2026-03-13 20:45:24.403897

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a5256b740222'
down_revision: Union[str, None] = '6892aee77761'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'razorpay_customer_id' in columns:
        op.drop_column('users', 'razorpay_customer_id')
    if 'razorpay_subscription_id' in columns:
        op.drop_column('users', 'razorpay_subscription_id')
    
    if 'stripe_customer_id' not in columns:
        op.add_column('users', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    if 'stripe_subscription_id' not in columns:
        op.add_column('users', sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True))
    if 'stripe_price_id' not in columns:
        op.add_column('users', sa.Column('stripe_price_id', sa.String(length=255), nullable=True))
    if 'subscription_status' not in columns:
        op.add_column('users', sa.Column('subscription_status', sa.String(length=50), nullable=True))
    if 'subscription_period_end' not in columns:
        op.add_column('users', sa.Column('subscription_period_end', sa.DateTime(timezone=True), nullable=True))
    
    indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    if 'ix_users_stripe_customer_id' not in indexes:
        op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_users_stripe_customer_id', table_name='users')
    op.drop_column('users', 'subscription_period_end')
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'stripe_price_id')
    op.drop_column('users', 'stripe_subscription_id')
    op.drop_column('users', 'stripe_customer_id')
    
    op.add_column('users', sa.Column('razorpay_subscription_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('razorpay_customer_id', sa.String(length=255), nullable=True))
