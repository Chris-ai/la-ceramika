import random
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Category, Content, Game, GameHex, HexChallenge, QuizQuestion, SessionContentUsage


def free_content(session: Session, party_id: UUID, kind: str) -> list[UUID]:
    used = select(SessionContentUsage.content_id).where(SessionContentUsage.play_session_id == party_id)
    reserved = (select(HexChallenge.content_id).join(GameHex, GameHex.id == HexChallenge.hex_id)
                .join(Game, Game.id == GameHex.game_id)
                .where(Game.play_session_id == party_id, Game.status == "ACTIVE",
                       GameHex.status == "ACTIVE", GameHex.owner_team_id.is_(None),
                       HexChallenge.content_id.is_not(None)))
    values = list(session.scalars(select(Content.id).where(Content.type == kind, Content.active.is_(True),
                              Content.id.not_in(used), Content.id.not_in(reserved))))
    random.shuffle(values)
    return values


def take_content(session: Session, pool: list[UUID], kind: str) -> UUID:
    if not pool:
        raise HTTPException(409, f"Brak nieużytych treści {kind} na ten wieczór. Rozpocznij nowy wieczór albo uzupełnij bazę pytań.")
    if kind == "QUIZ":
        questions = list(session.scalars(select(QuizQuestion).join(Category).where(
            QuizQuestion.content_id.in_(pool), Category.active.is_(True))))
        if not questions:
            raise HTTPException(409, "Brak pytań QUIZ w aktywnych kategoriach.")
        selected_type = random.choice(sorted({q.type for q in questions}))
        questions = [q for q in questions if q.type == selected_type]
        category = random.choice(sorted({q.category_id for q in questions}))
        content_id = random.choice([q.content_id for q in questions if q.category_id == category])
        pool.remove(content_id)
        return content_id
    return pool.pop()
