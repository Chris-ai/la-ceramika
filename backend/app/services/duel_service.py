import random
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services.active_game_service import touch_game
from app.models import (
    Category,
    Content,
    Duel,
    DuelCategory,
    DuelItem,
    DuelItemUsage,
    Game,
    GameHex,
    GameTeam,
)
from app.services.duel_image_service import fetch_proxied_image, resolve_image
from app.services.game_service import get_game, neighbors, serialize_game
from app.services.territory_service import capture_enemy_hex


def serialize_duel(session: Session, duel: Duel) -> dict:
    attacker = session.get(GameTeam, duel.attacker_team_id)
    defender = session.get(GameTeam, duel.defender_team_id)
    category = session.get(Category, duel.category_id)
    payload = {
        "id": duel.id,
        "gameId": duel.game_id,
        "targetHexId": duel.target_hex_id,
        "type": duel.type,
        "status": duel.status,
        "category": category.name,
        "attacker": {"id": attacker.id, "color": attacker.color, "avatar": attacker.avatar},
        "defender": {"id": defender.id, "color": defender.color, "avatar": defender.avatar},
        "winnerTeamId": duel.winner_team_id,
        "prompt": None,
        "contentId": duel.content_id,
    }
    if duel.type == "IDENTIFY" and duel.content_id:
        item = session.get(DuelItem, duel.content_id)
        image = resolve_image(category.name, item.prompt) if item and item.prompt_type == "IMAGE" else None
        if item and item.prompt_type == "TEXT":
            payload["prompt"] = {"text": item.prompt, "imageUrl": None, "answer": item.answer, "attribution": None}
        if item and image:
            image_url = image["imageUrl"]
            if image_url == "PROXY":
                image_url = f"/games/{duel.game_id}/duels/{duel.id}/prompt-image"
            payload["prompt"] = {
                "imageUrl": image_url,
                "answer": item.answer,
                "attribution": image["attribution"],
            }
    return payload


def _available_identify_items(session: Session, game_id: UUID, category_id: int) -> list[DuelItem]:
    used = select(DuelItemUsage.content_id).where(DuelItemUsage.game_id == game_id)
    items = list(
        session.scalars(
            select(DuelItem)
            .join(Content, Content.id == DuelItem.content_id)
            .where(
                DuelItem.duel_category_id == category_id,
                Content.active.is_(True),
                DuelItem.content_id.not_in(used),
            )
        )
    )
    random.shuffle(items)
    return items


def _assign_working_item(session: Session, duel: Duel, category_name: str) -> bool:
    for item in _available_identify_items(session, duel.game_id, duel.category_id):
        if item.prompt_type != "TEXT" and resolve_image(category_name, item.prompt) is None:
            continue
        duel.content_id = item.content_id
        session.add(DuelItemUsage(game_id=duel.game_id, content_id=item.content_id))
        return True
    return False


def _is_current_turn_duel(session: Session, duel: Duel, game: Game) -> bool:
    target = session.get(GameHex, duel.target_hex_id)
    return bool(
        game.status == "ACTIVE"
        and game.current_team_id == duel.attacker_team_id
        and target is not None
        and target.game_id == game.id
        and target.status == "ACTIVE"
        and target.owner_team_id == duel.defender_team_id
    )


def _cancel_stale_duel(session: Session, duel: Duel) -> None:
    duel.status = "CANCELLED"
    duel.finished_at = datetime.now(timezone.utc)
    session.commit()


def create_duel(session: Session, game_id: UUID, target_hex_id: UUID) -> Duel:
    game = get_game(session, game_id, lock=True)
    target = session.get(GameHex, target_hex_id)
    if game is None or target is None or target.game_id != game.id:
        raise HTTPException(404, "Nie znaleziono gry lub heksa.")
    if game.status != "ACTIVE" or target.status != "ACTIVE" or target.owner_team_id is None:
        raise HTTPException(409, "Na tym heksie nie można rozpocząć pojedynku.")
    if game.active_challenge_id:
        raise HTTPException(409, "Najpierw dokończ rozpoczęte wyzwanie.")
    attacker = session.get(GameTeam, game.current_team_id)
    defender = session.get(GameTeam, target.owner_team_id)
    if attacker is None or defender is None or attacker.id == defender.id:
        raise HTTPException(409, "Pojedynek wymaga terytorium innej drużyny.")
    if game.base_move_used and attacker.bonus_moves <= 0:
        raise HTTPException(409, "Drużyna nie ma już dostępnych ruchów w tej turze.")
    attacker_coords = set(session.execute(select(GameHex.q, GameHex.r).where(
        GameHex.game_id == game.id, GameHex.owner_team_id == attacker.id, GameHex.status == "ACTIVE",
    )).all())
    if not any(point in attacker_coords for point in neighbors((target.q, target.r))):
        raise HTTPException(409, "Heks nie sąsiaduje z terytorium aktywnej drużyny.")
    active = current_duel(session, game.id)
    if active is not None:
        raise HTTPException(409, "W tej grze trwa już pojedynek.")
    list_categories = list(session.execute(
        select(DuelCategory, Category).join(Category, Category.id == DuelCategory.category_id)
        .where(DuelCategory.type == "LIST", Category.active.is_(True))
    ))
    identify_categories = list(session.execute(
        select(DuelCategory, Category).join(Category, Category.id == DuelCategory.category_id)
        .where(DuelCategory.type == "IDENTIFY", Category.active.is_(True))
    ))
    if not list_categories and not identify_categories:
        raise HTTPException(409, "Brak aktywnej kategorii dla pojedynku.")
    prefer_identify = bool(identify_categories) and (not list_categories or random.random() < 0.25)
    candidates = identify_categories.copy()
    random.shuffle(candidates)
    duel = None
    if prefer_identify:
        for duel_category, category in candidates:
            candidate = Duel(
                game_id=game.id,
                target_hex_id=target.id,
                attacker_team_id=attacker.id,
                defender_team_id=defender.id,
                category_id=duel_category.category_id,
                type="IDENTIFY",
                status="INTRO",
            )
            if _assign_working_item(session, candidate, category.name):
                duel = candidate
                break
    if duel is None:
        if not list_categories:
            raise HTTPException(409, "Żadne źródło obrazów DUEL nie zwróciło poprawnego elementu.")
        duel_category, _ = random.choice(list_categories)
        duel = Duel(game_id=game.id, target_hex_id=target.id, attacker_team_id=attacker.id,
                    defender_team_id=defender.id, category_id=duel_category.category_id,
                    type="LIST", status="INTRO")
    session.add(duel)
    touch_game(game)
    session.commit()
    session.refresh(duel)
    return duel


def next_duel_prompt(session: Session, game_id: UUID, duel_id: UUID, previous_content_id: UUID | None = None) -> Duel:
    game = session.get(Game, game_id, with_for_update=True)
    if game is None or game.status != "ACTIVE":
        raise HTTPException(409, "Gra nie jest aktywna.")
    duel = session.get(Duel, duel_id)
    if duel is None or duel.game_id != game_id:
        raise HTTPException(404, "Nie znaleziono pojedynku.")
    if duel.type != "IDENTIFY" or duel.status != "ACTIVE":
        raise HTTPException(409, "Następny obraz jest dostępny tylko w aktywnym DUEL IDENTIFY.")
    if previous_content_id is not None and duel.content_id != previous_content_id:
        return duel
    category = session.get(Category, duel.category_id)
    if not _assign_working_item(session, duel, category.name):
        raise HTTPException(409, "Brak kolejnych dostępnych obrazów w tej kategorii.")
    touch_game(game)
    session.commit()
    session.refresh(duel)
    return duel


def duel_prompt_image(session: Session, game_id: UUID, duel_id: UUID) -> tuple[bytes, str] | None:
    duel = session.get(Duel, duel_id)
    if duel is None or duel.game_id != game_id or duel.type != "IDENTIFY" or not duel.content_id:
        return None
    item = session.get(DuelItem, duel.content_id)
    category = session.get(Category, duel.category_id)
    return fetch_proxied_image(category.name, item.prompt) if item and category else None


def current_duel(session: Session, game_id: UUID) -> Duel | None:
    duel = session.scalar(select(Duel).where(
        Duel.game_id == game_id, Duel.status.in_(("INTRO", "ACTIVE")),
    ).order_by(Duel.created_at.desc()).limit(1))
    if duel is None:
        return None
    game = session.get(Game, game_id)
    if game is None or not _is_current_turn_duel(session, duel, game):
        _cancel_stale_duel(session, duel)
        return None
    return duel


def start_duel(session: Session, game_id: UUID, duel_id: UUID) -> Duel:
    game = session.get(Game, game_id, with_for_update=True)
    if game is None or game.status != "ACTIVE":
        raise HTTPException(409, "Gra nie jest aktywna.")
    duel = session.get(Duel, duel_id)
    if duel is None or duel.game_id != game_id:
        raise HTTPException(404, "Nie znaleziono pojedynku.")
    if duel.status == "ACTIVE" and _is_current_turn_duel(session, duel, game):
        return duel
    if duel.status != "INTRO":
        raise HTTPException(409, "Pojedynek nie czeka na rozpoczęcie.")
    duel.status = "ACTIVE"
    duel.started_at = datetime.now(timezone.utc)
    touch_game(game)
    session.commit()
    session.refresh(duel)
    return duel


def finish_duel(session: Session, game_id: UUID, duel_id: UUID, winner_team_id: UUID) -> tuple[Duel, Game]:
    game = session.get(Game, game_id, with_for_update=True, populate_existing=True)
    duel = session.get(Duel, duel_id, populate_existing=True)
    if duel is None or duel.game_id != game_id:
        raise HTTPException(404, "Nie znaleziono pojedynku.")
    if duel.status == "FINISHED" and duel.winner_team_id == winner_team_id:
        return duel, get_game(session, game_id)
    if duel.status != "ACTIVE":
        raise HTTPException(409, "Pojedynek nie jest aktywny.")
    if winner_team_id not in {duel.attacker_team_id, duel.defender_team_id}:
        raise HTTPException(422, "Zwycięzca nie uczestniczy w tym pojedynku.")
    game = session.get(Game, game_id, with_for_update=True)
    if game is None or game.status != "ACTIVE":
        raise HTTPException(409, "Gra nie jest aktywna.")
    attacker = session.get(GameTeam, duel.attacker_team_id)
    defender = session.get(GameTeam, duel.defender_team_id)
    target = session.get(GameHex, duel.target_hex_id)
    if game.current_team_id != attacker.id:
        raise HTTPException(409, "Tura drużyny atakującej już się zmieniła.")
    using_bonus = game.base_move_used
    if using_bonus:
        if attacker.bonus_moves <= 0:
            raise HTTPException(409, "Brak ruchu do rozliczenia pojedynku.")
        attacker.bonus_moves -= 1
    else:
        game.base_move_used = True
    attacker_won = winner_team_id == attacker.id
    if not using_bonus:
        if attacker_won:
            attacker.streak += 1
            if attacker.streak >= game.streak_to_bonus:
                attacker.bonus_moves = min(2, attacker.bonus_moves + 1)
                attacker.streak = 0
        else:
            attacker.streak = 0
    if attacker_won:
        capture_enemy_hex(session, game, target, attacker, defender)
    duel.status = "FINISHED"
    duel.winner_team_id = winner_team_id
    duel.finished_at = datetime.now(timezone.utc)
    touch_game(game)
    session.commit()
    session.refresh(duel)
    return duel, get_game(session, game.id)
