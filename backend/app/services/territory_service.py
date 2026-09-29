from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Game, GameHex, GameTeam
from app.services.game_service import neighbors


def capture_enemy_hex(session: Session, game: Game, target: GameHex, attacker: GameTeam, defender: GameTeam) -> None:
    """Apply the locked v1 CAPTURE rule. The caller owns the transaction."""
    if target.is_base:
        defender_hexes = list(session.scalars(select(GameHex).where(
            GameHex.game_id == game.id,
            GameHex.owner_team_id == defender.id,
            GameHex.status == "ACTIVE",
        )))
        for game_hex in defender_hexes:
            game_hex.owner_team_id = attacker.id
            game_hex.is_base = False
        defender.status = "PURGATORY" if game.resurrection_enabled else "ELIMINATED"
        defender.streak = 0
        defender.bonus_moves = 0
    else:
        target.owner_team_id = attacker.id
        defender_base = session.scalar(select(GameHex).where(
            GameHex.game_id == game.id,
            GameHex.owner_team_id == defender.id,
            GameHex.is_base.is_(True),
            GameHex.status == "ACTIVE",
        ))
        if defender_base is not None:
            owned = {
                (item.q, item.r): item
                for item in session.scalars(select(GameHex).where(
                    GameHex.game_id == game.id,
                    GameHex.owner_team_id == defender.id,
                    GameHex.status == "ACTIVE",
                ))
            }
            reached = {(defender_base.q, defender_base.r)}
            queue = list(reached)
            for point in queue:
                for candidate in neighbors(point):
                    if candidate in owned and candidate not in reached:
                        reached.add(candidate)
                        queue.append(candidate)
            for point, game_hex in owned.items():
                if point not in reached:
                    game_hex.owner_team_id = attacker.id

    if game.win_condition == "ELIMINATION":
        owners = set(session.scalars(select(GameHex.owner_team_id).where(
            GameHex.game_id == game.id,
            GameHex.status == "ACTIVE",
            GameHex.owner_team_id.is_not(None),
        )))
        if len(owners) == 1:
            game.status = "FINISHED"
            game.finished_at = datetime.now(timezone.utc)

