import random
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models import Game, HexChallenge, SessionContentUsage
from app.services.active_game_service import touch_game
from app.services.challenge_service import challenge_payload
from app.services.game_service import get_game, serialize_game


def eligible(game: Game) -> bool:
    neutral_count = sum(h.status == "ACTIVE" and h.owner_team_id is None for h in game.hexes)
    purgatory_count = sum(t.status == "PURGATORY" for t in game.teams)
    return game.resurrection_enabled and purgatory_count > 0 and neutral_count >= purgatory_count


def start_resurrection(session: Session, game_id: UUID) -> dict:
    game = get_game(session, game_id, lock=True)
    if game is None:
        raise HTTPException(404, "Nie znaleziono gry.")
    team = next((t for t in game.teams if t.id == game.current_team_id), None)
    if game.status != "ACTIVE" or team is None or team.status != "PURGATORY" or game.base_move_used:
        raise HTTPException(409, "To nie jest dostępna tura powrotu z czyśćca.")
    if not eligible(game):
        game.base_move_used = True
        touch_game(game)
        session.commit()
        return {"game": serialize_game(game), "challenge": None, "hexId": None}
    challenge = session.get(HexChallenge, game.resurrection_challenge_id) if game.resurrection_challenge_id else None
    if challenge is None:
        neutral = [h for h in game.hexes if h.status == "ACTIVE" and h.owner_team_id is None]
        target = random.choice(neutral)
        available = [c for c in target.challenges if c.status == "AVAILABLE"]
        if not available:
            raise HTTPException(409, "Brak dostępnego wyzwania na neutralnym polu.")
        challenge = random.choice(available)
        game.resurrection_challenge_id = challenge.id
    if challenge.content_id and not session.get(SessionContentUsage, (game.play_session_id, challenge.content_id)):
        session.add(SessionContentUsage(play_session_id=game.play_session_id, content_id=challenge.content_id, game_id=game.id))
    payload = challenge_payload(session, challenge)
    touch_game(game)
    session.commit()
    return {"game": serialize_game(game), "challenge": payload, "hexId": challenge.hex_id}
