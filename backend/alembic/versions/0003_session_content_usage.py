"""Track content shown during a play session."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_session_content_usage"
down_revision = "0002_domain_and_content"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_content_usage",
        sa.Column("play_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("play_session.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id"), primary_key=True),
        sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game.id", ondelete="CASCADE"), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_session_content_usage_game_id", "session_content_usage", ["game_id"])


def downgrade() -> None:
    op.drop_table("session_content_usage")
