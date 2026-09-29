"""Keep the randomly selected resurrection challenge across refreshes."""
from alembic import op
import sqlalchemy as sa

revision = "0010_resurrection_attempt"
down_revision = "0009_team_internal_names"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("game", sa.Column("resurrection_challenge_id", sa.Uuid(), nullable=True))


def downgrade() -> None:
    op.drop_column("game", "resurrection_challenge_id")
