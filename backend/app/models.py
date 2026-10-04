import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Category(Base):
    __tablename__ = "category"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Content(Base):
    __tablename__ = "content"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String(20), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QuizQuestion(Base):
    __tablename__ = "quiz_question"
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id"))
    type: Mapped[str] = mapped_column(String(10))
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[list["QuizOption"]] = relationship(cascade="all, delete-orphan")


class QuizOption(Base):
    __tablename__ = "quiz_option"
    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("quiz_question.content_id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    correct_position: Mapped[int | None] = mapped_column(Integer)


class RushTask(Base):
    __tablename__ = "rush_task"
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    prompt: Mapped[str] = mapped_column(Text)
    required_count: Mapped[int] = mapped_column(Integer)
    time_limit: Mapped[int] = mapped_column(Integer)
    answers: Mapped[list[dict]] = mapped_column(JSONB)


class AllIn(Base):
    __tablename__ = "all_in"
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id"))
    question: Mapped[str] = mapped_column(Text)
    options: Mapped[list["AllInOption"]] = relationship(cascade="all, delete-orphan")


class AllInOption(Base):
    __tablename__ = "all_in_option"
    id: Mapped[int] = mapped_column(primary_key=True)
    all_in_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("all_in.content_id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean)


class MoreLess(Base):
    __tablename__ = "more_less"
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id", ondelete="CASCADE"), primary_key=True)
    question: Mapped[str] = mapped_column(Text)
    correct_value: Mapped[Decimal] = mapped_column(Numeric)
    reference_value: Mapped[Decimal] = mapped_column(Numeric)
    unit: Mapped[str | None] = mapped_column(String(80))
    __table_args__ = (CheckConstraint("correct_value <> reference_value", name="ck_more_less_values_differ"),)


class DuelCategory(Base):
    __tablename__ = "duel_category"
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id", ondelete="CASCADE"), primary_key=True)
    type: Mapped[str] = mapped_column(String(10))


class DuelItem(Base):
    __tablename__ = "duel_item"
    content_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("content.id", ondelete="CASCADE"), primary_key=True
    )
    duel_category_id: Mapped[int] = mapped_column(
        ForeignKey("duel_category.category_id", ondelete="CASCADE"), index=True
    )
    prompt_type: Mapped[str] = mapped_column(String(10), default="IMAGE")
    prompt: Mapped[str] = mapped_column(String(255))
    answer: Mapped[str] = mapped_column(String(255))


class PlaySession(Base):
    __tablename__ = "play_session"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Game(Base):
    __tablename__ = "game"
    __table_args__ = (
        Index("uq_game_single_active", "status", unique=True, postgresql_where=text("status = 'ACTIVE'")),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    play_session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("play_session.id"))
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE")
    win_condition: Mapped[str] = mapped_column(String(20))
    round_limit: Mapped[int | None] = mapped_column(Integer)
    current_round: Mapped[int] = mapped_column(Integer, default=1)
    current_team_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    resurrection_challenge_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    active_challenge_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    last_challenge_result: Mapped[dict | None] = mapped_column(JSONB)
    base_move_used: Mapped[bool] = mapped_column(Boolean, default=False)
    streak_to_bonus: Mapped[int] = mapped_column(Integer, default=3)
    resurrection_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    teams: Mapped[list["GameTeam"]] = relationship(cascade="all, delete-orphan", order_by="GameTeam.turn_order")
    hexes: Mapped[list["GameHex"]] = relationship(cascade="all, delete-orphan")


class GameTeam(Base):
    __tablename__ = "game_team"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(40))
    color: Mapped[str] = mapped_column(String(7))
    avatar: Mapped[str] = mapped_column(String(80))
    turn_order: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE")
    streak: Mapped[int] = mapped_column(Integer, default=0)
    bonus_moves: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    __table_args__ = (
        UniqueConstraint("game_id", "turn_order", name="uq_game_team_turn_order"),
        CheckConstraint("bonus_moves BETWEEN 0 AND 2", name="ck_game_team_bonus_moves"),
        CheckConstraint("streak >= 0", name="ck_game_team_streak"),
    )


class GameHex(Base):
    __tablename__ = "game_hex"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game.id", ondelete="CASCADE"), index=True)
    q: Mapped[int] = mapped_column(Integer)
    r: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(12), default="ACTIVE")
    owner_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("game_team.id"))
    is_base: Mapped[bool] = mapped_column(Boolean, default=False)
    challenges: Mapped[list["HexChallenge"]] = relationship(cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("game_id", "q", "r", name="uq_game_hex_coordinate"),)


class HexChallenge(Base):
    __tablename__ = "hex_challenge"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hex_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_hex.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(12), default="AVAILABLE")
    content_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("content.id"))
    gamble_type: Mapped[str | None] = mapped_column(String(12))
    __table_args__ = (UniqueConstraint("hex_id", "type", name="uq_hex_challenge_type"),)


class SessionContentUsage(Base):
    __tablename__ = "session_content_usage"
    play_session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("play_session.id", ondelete="CASCADE"), primary_key=True)
    content_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("content.id"), primary_key=True)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game.id", ondelete="CASCADE"), index=True)
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Duel(Base):
    __tablename__ = "duel"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game.id", ondelete="CASCADE"), index=True)
    target_hex_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_hex.id"))
    attacker_team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_team.id"))
    defender_team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("game_team.id"))
    category_id: Mapped[int] = mapped_column(ForeignKey("category.id"))
    content_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("duel_item.content_id"))
    type: Mapped[str] = mapped_column(String(10))
    status: Mapped[str] = mapped_column(String(10), default="INTRO")
    winner_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("game_team.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class DuelItemUsage(Base):
    __tablename__ = "duel_item_usage"
    game_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("game.id", ondelete="CASCADE"), primary_key=True
    )
    content_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("duel_item.content_id", ondelete="CASCADE"), primary_key=True
    )
    used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
