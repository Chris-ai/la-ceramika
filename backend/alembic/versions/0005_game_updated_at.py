"""Add game update timestamp."""

from alembic import op
import sqlalchemy as sa

revision = "0005_game_updated_at"
down_revision = "0004_duel"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "game",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("game", "updated_at")
