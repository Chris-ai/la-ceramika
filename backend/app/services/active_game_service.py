from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import Game


def touch_game(game: Game) -> None:
    game.last_activity_at = datetime.now(timezone.utc)


def find_active_game(session: Session) -> Game | None:
    # Serialize lookup/replacement even when there is currently no active row.
    session.execute(text("SELECT pg_advisory_xact_lock(714203)"))
    game = session.scalar(select(Game).where(Game.status == "ACTIVE").with_for_update())
    if game and game.last_activity_at <= datetime.now(timezone.utc) - timedelta(days=7):
        game.status = "ARCHIVED"
        session.flush()
        return None
    return game


def prepare_new_game(session: Session, replace_id: UUID | None) -> None:
    game = find_active_game(session)
    if game:
        if game.id != replace_id:
            raise HTTPException(409, "Aktywna gra zmieniła się. Wróć na ekran startowy i potwierdź rozpoczęcie nowej.")
        game.status = "ARCHIVED"
        session.flush()
