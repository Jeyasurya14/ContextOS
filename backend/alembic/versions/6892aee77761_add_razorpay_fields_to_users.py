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
    op.add_column('users', sa.Column('razorpay_customer_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('razorpay_subscription_id', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'razorpay_subscription_id')
    op.drop_column('users', 'razorpay_customer_id')
