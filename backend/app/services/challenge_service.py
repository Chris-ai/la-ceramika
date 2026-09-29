import random
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    AllIn, AllInOption, Category, Content, Game, GameHex, GameTeam, HexChallenge,
    MoreLess, QuizOption, QuizQuestion, RushTask, SessionContentUsage,
)
from app.services.game_service import neighbors
from app.services.active_game_service import touch_game


def context(session: Session, game_id: UUID, hex_id: UUID, challenge_type: str):
    game = session.get(Game, game_id, with_for_update=True)
    game_hex = session.get(GameHex, hex_id)
    if not game or not game_hex or game_hex.game_id != game.id:
        raise HTTPException(404, "Nie znaleziono gry lub heksa.")
    if game.status != "ACTIVE" or game_hex.status != "ACTIVE" or game_hex.owner_team_id is not None:
        raise HTTPException(409, "Na tym heksie nie można rozpocząć neutralnego wyzwania.")
    team = session.get(GameTeam, game.current_team_id)
    challenge = session.scalar(select(HexChallenge).where(HexChallenge.hex_id == game_hex.id, HexChallenge.type == challenge_type, HexChallenge.status == "AVAILABLE"))
    if not challenge:
        raise HTTPException(409, "To wyzwanie nie jest już dostępne.")
    if team.status == "PURGATORY":
        if game.base_move_used or game.resurrection_challenge_id != challenge.id:
            raise HTTPException(409, "Najpierw wylosuj próbę powrotu z czyśćca.")
    elif team.status == "ACTIVE":
        owned = set(session.execute(select(GameHex.q, GameHex.r).where(GameHex.game_id == game.id, GameHex.owner_team_id == team.id, GameHex.status == "ACTIVE")).all())
        if not any(point in owned for point in neighbors((game_hex.q, game_hex.r))):
            raise HTTPException(409, "Heks nie sąsiaduje z terytorium aktywnej drużyny.")
    else:
        raise HTTPException(409, "Drużyna nie może wykonać ruchu.")
    return game, game_hex, team, challenge


def start_challenge(session: Session, game_id: UUID, hex_id: UUID, challenge_type: str) -> dict:
    if challenge_type not in {"QUIZ", "RUSH", "GAMBLE"}:
        raise HTTPException(422, "Nieznany typ wyzwania.")
    game, _, team, challenge = context(session, game_id, hex_id, challenge_type)
    if game.base_move_used and team.bonus_moves <= 0:
        raise HTTPException(409, "Drużyna nie ma już dostępnych ruchów w tej turze.")
    if challenge.content_id and not session.get(SessionContentUsage, (game.play_session_id, challenge.content_id)):
        session.add(SessionContentUsage(play_session_id=game.play_session_id, content_id=challenge.content_id, game_id=game.id))
        touch_game(game)

    payload = challenge_payload(session, challenge)
    session.commit()
    return payload


def challenge_payload(session: Session, challenge: HexChallenge) -> dict:
    if challenge.type == "QUIZ":
        question = session.get(QuizQuestion, challenge.content_id)
        category = session.get(Category, question.category_id)
        options = list(session.scalars(select(QuizOption).where(QuizOption.question_id == question.content_id).order_by(QuizOption.id)))
        payload = {"type": question.type, "category": category.name, "question": question.question, "options": [{"text": item.text, "is_correct": item.is_correct, "correct_position": item.correct_position} for item in options]}
    elif challenge.type == "RUSH":
        task = session.get(RushTask, challenge.content_id)
        payload = {"prompt": task.prompt, "required_count": task.required_count, "time_limit": task.time_limit, "answers": task.answers}
    elif challenge.gamble_type == "ALL_IN":
        item = session.get(AllIn, challenge.content_id)
        category = session.get(Category, item.category_id)
        options = list(session.scalars(select(AllInOption).where(AllInOption.all_in_id == item.content_id).order_by(AllInOption.id)))
        payload = {"category": category.name, "question": item.question, "options": [{"text": option.text, "is_correct": option.is_correct} for option in options]}
    elif challenge.gamble_type == "MORE_LESS":
        item = session.get(MoreLess, challenge.content_id)
        payload = {"question": item.question, "reference_value": float(item.reference_value), "correct_value": float(item.correct_value), "unit": item.unit, "correct_side": "MORE" if item.correct_value > item.reference_value else "LESS"}
    else:
        payload = None
    return {"type": challenge.type, "gambleType": challenge.gamble_type, "payload": payload}


def connected_without(hexes: list[GameHex], removed: GameHex) -> bool:
    active = {(item.q, item.r) for item in hexes if item.status == "ACTIVE" and item.id != removed.id}
    if not active:
        return True
    reached = {next(iter(active))}
    queue = list(reached)
    for point in queue:
        for candidate in neighbors(point):
            if candidate in active and candidate not in reached:
                reached.add(candidate)
                queue.append(candidate)
    return reached == active


def fresh_content(session: Session, game: Game, content_type: str) -> UUID:
    used = select(SessionContentUsage.content_id).where(SessionContentUsage.play_session_id == game.play_session_id)
    reserved = select(HexChallenge.content_id).where(HexChallenge.content_id.is_not(None))
    choices = list(session.scalars(select(Content.id).where(Content.type == content_type, Content.active.is_(True), Content.id.not_in(used), Content.id.not_in(reserved))))
    if not choices:
        raise HTTPException(409, f"Brak wolnej treści typu {content_type}.")
    return random.choice(choices)


def reset_challenges(session: Session, game: Game, game_hex: GameHex) -> None:
    session.execute(delete(HexChallenge).where(HexChallenge.hex_id == game_hex.id))
    session.flush()
    session.add(HexChallenge(hex_id=game_hex.id, type="QUIZ", status="AVAILABLE", content_id=fresh_content(session, game, "QUIZ")))
    session.add(HexChallenge(hex_id=game_hex.id, type="RUSH", status="AVAILABLE", content_id=fresh_content(session, game, "RUSH")))
    gamble_type = random.choice(("ALL_IN", "MORE_LESS", "ROULETTE"))
    content_id = fresh_content(session, game, gamble_type) if gamble_type != "ROULETTE" else None
    session.add(HexChallenge(hex_id=game_hex.id, type="GAMBLE", status="AVAILABLE", content_id=content_id, gamble_type=gamble_type))


def resolve_challenge(session: Session, game_id: UUID, hex_id: UUID, challenge_type: str, won: bool) -> Game:
    game, game_hex, team, challenge = context(session, game_id, hex_id, challenge_type)
    resurrecting = team.status == "PURGATORY"
    using_bonus_move = game.base_move_used
    if using_bonus_move and team.bonus_moves <= 0:
        raise HTTPException(409, "Drużyna nie ma już dostępnych ruchów w tej turze.")
    if using_bonus_move:
        team.bonus_moves -= 1
    else:
        game.base_move_used = True
    if won:
        game_hex.owner_team_id = team.id
        if resurrecting:
            game_hex.is_base = True
            team.status = "ACTIVE"
            team.streak = 0
            team.bonus_moves = 0
        elif not using_bonus_move:
            team.streak += 1
            if team.streak >= game.streak_to_bonus:
                team.bonus_moves = min(2, team.bonus_moves + 1)
                team.streak = 0
        session.execute(delete(HexChallenge).where(HexChallenge.hex_id == game_hex.id))
    else:
        if not using_bonus_move:
            team.streak = 0
        challenge.status = "BURNED"
        session.flush()
        remaining = session.scalar(select(HexChallenge).where(HexChallenge.hex_id == game_hex.id, HexChallenge.status == "AVAILABLE").limit(1))
        if remaining is None:
            hexes = list(session.scalars(select(GameHex).where(GameHex.game_id == game.id)))
            if connected_without(hexes, game_hex):
                game_hex.status = "DESTROYED"
                game_hex.owner_team_id = None
                game_hex.is_base = False
                session.execute(delete(HexChallenge).where(HexChallenge.hex_id == game_hex.id))
            else:
                reset_challenges(session, game, game_hex)
    if resurrecting:
        game.resurrection_challenge_id = None
        team.streak = 0
        team.bonus_moves = 0
    touch_game(game)
    session.commit()
    from app.services.game_service import get_game
    return get_game(session, game.id)


def spin_roulette(session: Session, game_id: UUID, hex_id: UUID, choice: str) -> tuple[int, str, bool, Game]:
    if choice not in {"RED", "BLACK"}:
        raise HTTPException(422, "Ruletka przyjmuje wyłącznie zakład RED albo BLACK.")
    _, _, _, challenge = context(session, game_id, hex_id, "GAMBLE")
    if challenge.gamble_type != "ROULETTE":
        raise HTTPException(409, "Ten heks nie zawiera ruletki.")
    number = random.randrange(37)
    red_numbers = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}
    color = "GREEN" if number == 0 else "RED" if number in red_numbers else "BLACK"
    won = color == choice
    game = resolve_challenge(session, game_id, hex_id, "GAMBLE", won)
    return number, color, won, game
