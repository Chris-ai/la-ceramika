"""Add durable duel lifecycle."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_duel"
down_revision = "0003_session_content_usage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "duel",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_hex_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game_hex.id"), nullable=False),
        sa.Column("attacker_team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game_team.id"), nullable=False),
        sa.Column("defender_team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game_team.id"), nullable=False),
        sa.Column("category_id", sa.Integer(), sa.ForeignKey("category.id"), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("winner_team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game_team.id")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_duel_game_id", "duel", ["game_id"])


def downgrade() -> None:
    op.drop_table("duel")
