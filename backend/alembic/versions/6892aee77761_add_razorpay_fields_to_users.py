"""add_razorpay_fields_to_users

Revision ID: 6892aee77761
Revises: 1293b75c0d1a
Create Date: 2026-03-12 20:37:07.086260

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6892aee77761'
down_revision: Union[str, None] = '1293b75c0d1a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('users')]
    indexes = [idx['name'] for idx in inspector.get_indexes('users')]

    if 'razorpay_customer_id' not in columns:
        op.add_column('users', sa.Column('razorpay_customer_id', sa.String(length=255), nullable=True))
    if 'razorpay_subscription_id' not in columns:
        op.add_column('users', sa.Column('razorpay_subscription_id', sa.String(length=255), nullable=True))

    # Ensure index for razorpay_customer_id exists
    if 'ix_users_razorpay_customer_id' not in indexes:
        op.create_index('ix_users_razorpay_customer_id', 'users', ['razorpay_customer_id'], unique=False)


def downgrade() -> None:
    op.drop_column('users', 'razorpay_subscription_id')
    op.drop_column('users', 'razorpay_customer_id')
