"""Add DUEL IDENTIFY items and game-level usage."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0006_duel_identify"
down_revision = "0005_game_updated_at"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "duel_item",
        sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("duel_category_id", sa.Integer(), sa.ForeignKey("duel_category.category_id", ondelete="CASCADE"), nullable=False),
        sa.Column("prompt_type", sa.String(10), nullable=False),
        sa.Column("prompt", sa.String(255), nullable=False),
        sa.Column("answer", sa.String(255), nullable=False),
    )
    op.create_index("ix_duel_item_duel_category_id", "duel_item", ["duel_category_id"])
    op.add_column("duel", sa.Column("content_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_duel_content_id", "duel", "duel_item", ["content_id"], ["content_id"])
    op.create_table(
        "duel_item_usage",
        sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("duel_item.content_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("used_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("duel_item_usage")
    op.drop_constraint("fk_duel_content_id", "duel", type_="foreignkey")
    op.drop_column("duel", "content_id")
    op.drop_table("duel_item")
