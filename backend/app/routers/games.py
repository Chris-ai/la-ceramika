from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas import ChallengeResult, ChallengeStart, DuelFinish, GameCreate, GameState, GameSummary, RouletteBet, NextPlayer, NextDuelPrompt
from app.services.active_game_service import find_active_game
from app.services.challenge_service import submit_answer, spin_roulette, start_challenge
from app.services.duel_service import (
    create_duel,
    current_duel,
    duel_prompt_image,
    finish_duel,
    next_duel_prompt,
    serialize_duel,
    start_duel,
)
from app.services.game_service import create_game, get_game, list_games, next_player, serialize_game, serialize_game_summary

router = APIRouter(prefix="/games", tags=["games"])


@router.get("/active", response_model=GameSummary | None)
def active(session: Session = Depends(get_db)):
    game = find_active_game(session)
    result = serialize_game_summary(game) if game else None
    session.commit()
    return result


@router.post("", response_model=GameState, status_code=status.HTTP_201_CREATED)
def create(payload: GameCreate, session: Session = Depends(get_db)):
    return serialize_game(create_game(session, payload))


@router.get("", response_model=list[GameSummary])
def list_recent(limit: int = 10, session: Session = Depends(get_db)):
    return [serialize_game_summary(game) for game in list_games(session, min(max(limit, 1), 30))]


@router.get("/{game_id}", response_model=GameState)
def get(game_id: UUID, session: Session = Depends(get_db)):
    game = get_game(session, game_id)
    if game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return serialize_game(game)


@router.post("/{game_id}/hexes/{hex_id}/challenge")
def start_neutral_challenge(game_id: UUID, hex_id: UUID, payload: ChallengeStart, session: Session = Depends(get_db)):
    return start_challenge(session, game_id, hex_id, payload.type)


@router.post("/{game_id}/hexes/{hex_id}/challenge/{challenge_type}/result")
def resolve_neutral_challenge(game_id: UUID, hex_id: UUID, challenge_type: str, payload: ChallengeResult, session: Session = Depends(get_db)):
    return submit_answer(session, game_id, hex_id, challenge_type, payload)


@router.post("/{game_id}/hexes/{hex_id}/roulette-spin")
def roulette_spin(game_id: UUID, hex_id: UUID, payload: RouletteBet, session: Session = Depends(get_db)):
    number, color, won, game = spin_roulette(session, game_id, hex_id, payload.choice, payload.challengeId)
    return {"number": number, "color": color, "result": "WIN" if won else "LOSS", "game": serialize_game(game)}


@router.post("/{game_id}/hexes/{hex_id}/duel", status_code=status.HTTP_201_CREATED)
def begin_duel(game_id: UUID, hex_id: UUID, session: Session = Depends(get_db)):
    return serialize_duel(session, create_duel(session, game_id, hex_id))


@router.get("/{game_id}/duel")
def get_current_duel(game_id: UUID, session: Session = Depends(get_db)):
    duel = current_duel(session, game_id)
    return serialize_duel(session, duel) if duel else None


@router.post("/{game_id}/duels/{duel_id}/start")
def activate_duel(game_id: UUID, duel_id: UUID, session: Session = Depends(get_db)):
    return serialize_duel(session, start_duel(session, game_id, duel_id))


@router.post("/{game_id}/duels/{duel_id}/next-prompt")
def advance_duel_prompt(game_id: UUID, duel_id: UUID, payload: NextDuelPrompt, session: Session = Depends(get_db)):
    return serialize_duel(session, next_duel_prompt(session, game_id, duel_id, payload.previousContentId))


@router.get("/{game_id}/duels/{duel_id}/prompt-image")
def get_duel_prompt_image(game_id: UUID, duel_id: UUID, content_id: UUID | None = None, session: Session = Depends(get_db)):
    image = duel_prompt_image(session, game_id, duel_id, content_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Prompt image not found")
    content, media_type = image
    cache_control = "private, max-age=3600" if content_id else "no-store"
    return Response(content=content, media_type=media_type, headers={"Cache-Control": cache_control})


@router.post("/{game_id}/duels/{duel_id}/finish")
def resolve_duel(game_id: UUID, duel_id: UUID, payload: DuelFinish, session: Session = Depends(get_db)):
    duel, game = finish_duel(session, game_id, duel_id, payload.winnerTeamId)
    return {"duel": serialize_duel(session, duel), "game": serialize_game(game)}


@router.post("/{game_id}/next-player", response_model=GameState)
def advance_player(game_id: UUID, payload: NextPlayer, session: Session = Depends(get_db)):
    try:
        return serialize_game(next_player(session, game_id, payload.currentTeamId))
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@router.post("/{game_id}/resurrection")
def resurrection(game_id: UUID, session: Session = Depends(get_db)):
    from app.services.resurrection_service import start_resurrection
    return start_resurrection(session, game_id)


@router.get("/{game_id}/pending-challenge")
def pending_challenge(game_id: UUID, session: Session = Depends(get_db)):
    from app.models import HexChallenge
    from app.services.challenge_service import challenge_payload
    game = get_game(session, game_id)
    if not game:
        raise HTTPException(404, "Nie znaleziono gry.")
    if game.status != "ACTIVE" or not game.active_challenge_id or game.resurrection_challenge_id:
        return None
    challenge = session.get(HexChallenge, game.active_challenge_id)
    return {"hexId": challenge.hex_id, "challenge": challenge_payload(session, challenge)} if challenge else None
