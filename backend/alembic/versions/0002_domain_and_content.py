"""Add content, game setup and generated map tables."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_domain_and_content"
down_revision = "0001_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table("category", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("name", sa.String(120), nullable=False, unique=True), sa.Column("active", sa.Boolean(), nullable=False))
    op.create_table("content", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("type", sa.String(20), nullable=False), sa.Column("active", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_index("ix_content_type", "content", ["type"])
    op.create_index("ix_content_active", "content", ["active"])
    op.create_table("quiz_question", sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id", ondelete="CASCADE"), primary_key=True), sa.Column("category_id", sa.Integer(), sa.ForeignKey("category.id"), nullable=False), sa.Column("type", sa.String(10), nullable=False), sa.Column("question", sa.Text(), nullable=False))
    op.create_table("quiz_option", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("question_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("quiz_question.content_id", ondelete="CASCADE"), nullable=False), sa.Column("text", sa.Text(), nullable=False), sa.Column("is_correct", sa.Boolean()), sa.Column("correct_position", sa.Integer()))
    op.create_index("ix_quiz_option_question_id", "quiz_option", ["question_id"])
    op.create_table("rush_task", sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id", ondelete="CASCADE"), primary_key=True), sa.Column("prompt", sa.Text(), nullable=False), sa.Column("required_count", sa.Integer(), nullable=False), sa.Column("time_limit", sa.Integer(), nullable=False), sa.Column("answers", postgresql.JSONB(), nullable=False))
    op.create_table("all_in", sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id", ondelete="CASCADE"), primary_key=True), sa.Column("category_id", sa.Integer(), sa.ForeignKey("category.id"), nullable=False), sa.Column("question", sa.Text(), nullable=False))
    op.create_table("all_in_option", sa.Column("id", sa.Integer(), primary_key=True), sa.Column("all_in_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("all_in.content_id", ondelete="CASCADE"), nullable=False), sa.Column("text", sa.Text(), nullable=False), sa.Column("is_correct", sa.Boolean(), nullable=False))
    op.create_index("ix_all_in_option_all_in_id", "all_in_option", ["all_in_id"])
    op.create_table("more_less", sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id", ondelete="CASCADE"), primary_key=True), sa.Column("question", sa.Text(), nullable=False), sa.Column("correct_value", sa.Numeric(), nullable=False), sa.Column("reference_value", sa.Numeric(), nullable=False), sa.Column("unit", sa.String(80)), sa.CheckConstraint("correct_value <> reference_value", name="ck_more_less_values_differ"))
    op.create_table("duel_category", sa.Column("category_id", sa.Integer(), sa.ForeignKey("category.id", ondelete="CASCADE"), primary_key=True), sa.Column("type", sa.String(10), nullable=False))
    op.create_table("play_session", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("finished_at", sa.DateTime(timezone=True)))
    op.create_table("game", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("play_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("play_session.id"), nullable=False), sa.Column("status", sa.String(12), nullable=False), sa.Column("win_condition", sa.String(20), nullable=False), sa.Column("round_limit", sa.Integer()), sa.Column("current_round", sa.Integer(), nullable=False), sa.Column("current_team_id", postgresql.UUID(as_uuid=True)), sa.Column("base_move_used", sa.Boolean(), nullable=False), sa.Column("streak_to_bonus", sa.Integer(), nullable=False), sa.Column("resurrection_enabled", sa.Boolean(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("started_at", sa.DateTime(timezone=True)), sa.Column("finished_at", sa.DateTime(timezone=True)))
    op.create_table("game_team", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game.id", ondelete="CASCADE"), nullable=False), sa.Column("name", sa.String(40), nullable=False), sa.Column("color", sa.String(7), nullable=False), sa.Column("avatar", sa.String(80), nullable=False), sa.Column("turn_order", sa.Integer(), nullable=False), sa.Column("status", sa.String(12), nullable=False), sa.Column("streak", sa.Integer(), nullable=False), sa.Column("bonus_moves", sa.Integer(), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.UniqueConstraint("game_id", "turn_order", name="uq_game_team_turn_order"), sa.CheckConstraint("bonus_moves BETWEEN 0 AND 2", name="ck_game_team_bonus_moves"), sa.CheckConstraint("streak >= 0", name="ck_game_team_streak"))
    op.create_index("ix_game_team_game_id", "game_team", ["game_id"])
    op.create_table("game_hex", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("game_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game.id", ondelete="CASCADE"), nullable=False), sa.Column("q", sa.Integer(), nullable=False), sa.Column("r", sa.Integer(), nullable=False), sa.Column("status", sa.String(12), nullable=False), sa.Column("owner_team_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game_team.id")), sa.Column("is_base", sa.Boolean(), nullable=False), sa.UniqueConstraint("game_id", "q", "r", name="uq_game_hex_coordinate"))
    op.create_index("ix_game_hex_game_id", "game_hex", ["game_id"])
    op.create_table("hex_challenge", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("hex_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("game_hex.id", ondelete="CASCADE"), nullable=False), sa.Column("type", sa.String(12), nullable=False), sa.Column("status", sa.String(12), nullable=False), sa.Column("content_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("content.id")), sa.Column("gamble_type", sa.String(12)), sa.UniqueConstraint("hex_id", "type", name="uq_hex_challenge_type"))
    op.create_index("ix_hex_challenge_hex_id", "hex_challenge", ["hex_id"])


def downgrade() -> None:
    for table in ["hex_challenge", "game_hex", "game_team", "game", "play_session", "duel_category", "more_less", "all_in_option", "all_in", "rush_task", "quiz_option", "quiz_question", "content", "category"]:
        op.drop_table(table)
