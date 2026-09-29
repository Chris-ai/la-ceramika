"""Identify teams exclusively by color and avatar."""
from alembic import op
import sqlalchemy as sa

revision = "0008_team_identity"
down_revision = "0007_game_activity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("game_team", "name")


def downgrade() -> None:
    op.add_column("game_team", sa.Column("name", sa.String(40), nullable=False, server_default="Drużyna"))
    op.alter_column("game_team", "name", server_default=None)
