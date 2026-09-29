"""Restore internal team names without exposing them in the UI."""
from alembic import op
import sqlalchemy as sa

revision = "0009_team_internal_names"
down_revision = "0008_team_identity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("game_team", sa.Column("name", sa.String(40), nullable=True))
    op.execute("UPDATE game_team SET name = 'Drużyna ' || turn_order::text")
    op.alter_column("game_team", "name", nullable=False)


def downgrade() -> None:
    op.drop_column("game_team", "name")
