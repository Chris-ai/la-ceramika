"""Persist the pending challenge and a single retry receipt (not game history)."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0012_challenge_submission"
down_revision = "0011_rush_curie_alias"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("game", sa.Column("active_challenge_id", sa.Uuid(), nullable=True))
    op.add_column("game", sa.Column("last_challenge_result", JSONB(), nullable=True))
    op.execute("UPDATE game SET active_challenge_id = resurrection_challenge_id WHERE resurrection_challenge_id IS NOT NULL")


def downgrade() -> None:
    op.drop_column("game", "last_challenge_result")
    op.drop_column("game", "active_challenge_id")
