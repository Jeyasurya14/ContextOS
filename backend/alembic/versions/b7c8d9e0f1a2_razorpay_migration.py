"""razorpay_migration

Revision ID: b7c8d9e0f1a2
Revises: a5256b740222
Create Date: 2026-03-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c8d9e0f1a2'
down_revision: Union[str, None] = 'a5256b740222'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove Stripe fields and add Razorpay fields to users table."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    
    # Drop Stripe index if exists
    if 'ix_users_stripe_customer_id' in indexes:
        try:
            op.drop_index('ix_users_stripe_customer_id', table_name='users')
        except Exception:
            pass
    
    # Drop Stripe columns if they exist
    for col in ['stripe_customer_id', 'stripe_subscription_id', 'stripe_price_id']:
        if col in columns:
            try:
                op.drop_column('users', col)
            except Exception:
                pass
    
    # Add Razorpay columns if they don't exist
    if 'razorpay_customer_id' not in columns:
        op.add_column('users', sa.Column('razorpay_customer_id', sa.String(length=255), nullable=True))
    
    if 'razorpay_subscription_id' not in columns:
        op.add_column('users', sa.Column('razorpay_subscription_id', sa.String(length=255), nullable=True))
    
    # Ensure subscription_status and subscription_period_end exist (they should from Stripe migration)
    if 'subscription_status' not in columns:
        op.add_column('users', sa.Column('subscription_status', sa.String(length=50), nullable=True))
    
    if 'subscription_period_end' not in columns:
        op.add_column('users', sa.Column('subscription_period_end', sa.DateTime(timezone=True), nullable=True))
    
    # Create Razorpay index
    if 'ix_users_razorpay_customer_id' not in indexes:
        op.create_index('ix_users_razorpay_customer_id', 'users', ['razorpay_customer_id'], unique=False)


def downgrade() -> None:
    """Revert to Stripe fields."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    indexes = [idx['name'] for idx in inspector.get_indexes('users')]
    
    # Drop Razorpay index
    if 'ix_users_razorpay_customer_id' in indexes:
        op.drop_index('ix_users_razorpay_customer_id', table_name='users')
    
    # Drop Razorpay columns
    if 'razorpay_subscription_id' in columns:
        op.drop_column('users', 'razorpay_subscription_id')
    if 'razorpay_customer_id' in columns:
        op.drop_column('users', 'razorpay_customer_id')
    
    # Re-add Stripe columns
    if 'stripe_customer_id' not in columns:
        op.add_column('users', sa.Column('stripe_customer_id', sa.String(length=255), nullable=True))
    if 'stripe_subscription_id' not in columns:
        op.add_column('users', sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True))
    if 'stripe_price_id' not in columns:
        op.add_column('users', sa.Column('stripe_price_id', sa.String(length=255), nullable=True))
    
    # Re-create Stripe index
    if 'ix_users_stripe_customer_id' not in indexes:
        op.create_index('ix_users_stripe_customer_id', 'users', ['stripe_customer_id'], unique=False)
