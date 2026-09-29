import math
import random
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Content, Duel, Game, GameHex, GameTeam, HexChallenge, PlaySession
from app.schemas import GameCreate
from app.services.active_game_service import prepare_new_game, touch_game

DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1), (1, -1), (-1, 1))


def neighbors(point: tuple[int, int]) -> list[tuple[int, int]]:
    q, r = point
    return [(q + dq, r + dr) for dq, dr in DIRECTIONS]


def distance(point: tuple[int, int]) -> int:
    q, r = point
    return max(abs(q), abs(r), abs(q + r))


def generate_connected_hexes(count: int) -> list[tuple[int, int]]:
    mother_grid = {(q, r) for q in range(-7, 8) for r in range(-7, 8) if distance((q, r)) <= 7}
    result = [(0, 0)]
    occupied = set(result)
    while len(result) < count:
        frontier = {candidate for point in result for candidate in neighbors(point) if candidate in mother_grid and candidate not in occupied}
        candidates = list(frontier)
        weights = [(0.7 + sum(other in occupied for other in neighbors(candidate)) * 0.5) * random.uniform(1, 2.8) / (1 + distance(candidate) * 0.15) for candidate in candidates]
        selected = random.choices(candidates, weights=weights, k=1)[0]
        result.append(selected)
        occupied.add(selected)
    return result


def shortest_paths(start: tuple[int, int], board: set[tuple[int, int]]) -> dict[tuple[int, int], int]:
    distances = {start: 0}
    queue = [start]
    for current in queue:
        for candidate in neighbors(current):
            if candidate in board and candidate not in distances:
                distances[candidate] = distances[current] + 1
                queue.append(candidate)
    return distances


def choose_bases(hexes: list[tuple[int, int]], team_count: int) -> list[tuple[int, int]]:
    board = set(hexes)
    distances = {point: shortest_paths(point, board) for point in hexes}
    best: list[tuple[int, int]] = []
    best_score = -math.inf
    for _ in range(300):
        candidates = random.sample(hexes, len(hexes))
        selected = [candidates[0]]
        while len(selected) < team_count:
            available = [point for point in candidates if point not in selected and all(distances[base][point] >= 2 for base in selected)]
            if not available:
                break
            selected.append(max(available, key=lambda point: min(distances[base][point] for base in selected) + random.random() * 1.4))
        if len(selected) != team_count:
            continue
        pair_distances = [distances[first][second] for index, first in enumerate(selected) for second in selected[index + 1:]]
        average = sum(pair_distances) / len(pair_distances)
        spread = sum(abs(value - average) for value in pair_distances) / len(pair_distances)
        score = min(pair_distances) * 2.5 - spread + random.random() * 0.1
        if score > best_score:
            best, best_score = selected, score
    if len(best) != team_count:
        raise RuntimeError("Nie udało się rozmieścić baz.")
    random.shuffle(best)
    return best


def content_pool(session: Session, content_type: str) -> list[UUID]:
    values = list(session.scalars(select(Content.id).where(Content.type == content_type, Content.active.is_(True))))
    random.shuffle(values)
    return values


def serialize_game(game: Game) -> dict:
    index_by_id = {team.id: index for index, team in enumerate(game.teams)}
    scores = {team.id: 0 for team in game.teams}
    for tile in game.hexes:
        if tile.status == "ACTIVE" and tile.owner_team_id in scores:
            scores[tile.owner_team_id] += 1
    highest = max(scores.values(), default=0)
    leaders = [team_id for team_id, score in scores.items() if score == highest and score > 0]
    winner_id = leaders[0] if game.status == "FINISHED" and len(leaders) == 1 else None
    return {
        "gameId": game.id,
        "status": game.status,
        "winnerTeamId": winner_id,
        "hexCount": len(game.hexes),
        "currentTeamId": game.current_team_id,
        "currentRound": game.current_round,
        "baseMoveUsed": game.base_move_used,
        "resurrectionPending": game.resurrection_challenge_id is not None,
        "teams": [{"id": team.id, "color": team.color, "avatar": team.avatar, "turnOrder": team.turn_order, "status": team.status, "streak": team.streak, "bonusMoves": team.bonus_moves} for team in game.teams],
        "hexes": [{"id": item.id, "q": item.q, "r": item.r, "ownerTeamIndex": index_by_id.get(item.owner_team_id), "isBase": item.is_base, "status": item.status, "availableChallenges": [challenge.type for challenge in item.challenges if challenge.status == "AVAILABLE"]} for item in game.hexes],
    }


def create_game(session: Session, setup: GameCreate) -> Game:
    prepare_new_game(session, setup.replaceActiveGameId)
    play_session = PlaySession()
    game = Game(
        play_session_id=play_session.id,
        status="ACTIVE",
        win_condition=setup.winCondition,
        round_limit=setup.roundLimit,
        current_round=1,
        base_move_used=False,
        streak_to_bonus=setup.streakToBonus,
        resurrection_enabled=setup.resurrectionEnabled,
        started_at=datetime.now(timezone.utc),
    )
    session.add(play_session)
    session.flush()
    game.play_session_id = play_session.id
    session.add(game)
    session.flush()

    order = list(range(len(setup.teams)))
    random.shuffle(order)
    teams: list[GameTeam] = []
    for index, source in enumerate(setup.teams):
        team = GameTeam(game_id=game.id, name=(source.name or "").strip() or f"Drużyna {index + 1}", color=source.color.lower(), avatar=source.avatar, turn_order=order.index(index) + 1, status="ACTIVE", streak=0, bonus_moves=0)
        session.add(team)
        teams.append(team)
    session.flush()
    game.current_team_id = min(teams, key=lambda team: team.turn_order).id

    coordinates = generate_connected_hexes(setup.hexCount)
    bases = choose_bases(coordinates, len(teams))
    base_owner = {point: teams[index] for index, point in enumerate(bases)}
    quiz_pool = content_pool(session, "QUIZ")
    rush_pool = content_pool(session, "RUSH")
    all_in_pool = content_pool(session, "ALL_IN")
    more_less_pool = content_pool(session, "MORE_LESS")

    for point in coordinates:
        owner = base_owner.get(point)
        game_hex = GameHex(game_id=game.id, q=point[0], r=point[1], status="ACTIVE", owner_team_id=owner.id if owner else None, is_base=owner is not None)
        session.add(game_hex)
        session.flush()
        if owner:
            continue
        session.add(HexChallenge(hex_id=game_hex.id, type="QUIZ", status="AVAILABLE", content_id=quiz_pool.pop()))
        session.add(HexChallenge(hex_id=game_hex.id, type="RUSH", status="AVAILABLE", content_id=rush_pool.pop()))
        gamble_type = random.choice(("ALL_IN", "MORE_LESS", "ROULETTE"))
        if gamble_type == "ALL_IN" and not all_in_pool or gamble_type == "MORE_LESS" and not more_less_pool:
            gamble_type = "ROULETTE"
        gamble_content = all_in_pool.pop() if gamble_type == "ALL_IN" else more_less_pool.pop() if gamble_type == "MORE_LESS" else None
        session.add(HexChallenge(hex_id=game_hex.id, type="GAMBLE", status="AVAILABLE", content_id=gamble_content, gamble_type=gamble_type))
    session.commit()
    return get_game(session, game.id)


def get_game(session: Session, game_id: UUID, *, lock: bool = False) -> Game:
    statement = select(Game).where(Game.id == game_id).options(selectinload(Game.teams), selectinload(Game.hexes).selectinload(GameHex.challenges))
    return session.scalar(statement.with_for_update() if lock else statement)


def list_games(session: Session, limit: int = 10) -> list[Game]:
    return list(
        session.scalars(
            select(Game)
            .options(selectinload(Game.teams))
            .order_by(Game.updated_at.desc(), Game.created_at.desc())
            .limit(limit)
        )
    )


def serialize_game_summary(game: Game) -> dict:
    return {
        "gameId": game.id,
        "status": game.status,
        "currentRound": game.current_round,
        "createdAt": game.created_at,
        "updatedAt": game.updated_at,
        "teams": [
            {"color": team.color, "avatar": team.avatar}
            for team in sorted(game.teams, key=lambda team: team.turn_order)
        ],
    }


def next_player(session: Session, game_id: UUID) -> Game:
    game = get_game(session, game_id, lock=True)
    if game is None:
        raise ValueError("Game not found")
    if game.status != "ACTIVE":
        raise ValueError("Gra nie jest aktywna.")
    if not game.base_move_used:
        raise ValueError("Najpierw wykorzystaj ruch bazowy.")
    active_duel = session.scalar(
        select(Duel.id).where(
            Duel.game_id == game.id,
            Duel.status.in_(("INTRO", "ACTIVE")),
        ).limit(1)
    )
    if active_duel is not None:
        raise ValueError("Najpierw dokończ trwający pojedynek.")
    ordered = sorted((team for team in game.teams if team.status != "ELIMINATED"), key=lambda team: team.turn_order)
    current_index = next(index for index, team in enumerate(ordered) if team.id == game.current_team_id)
    next_index = (current_index + 1) % len(ordered)
    if next_index == 0:
        game.current_round += 1
    game.current_team_id = ordered[next_index].id
    game.base_move_used = False
    game.resurrection_challenge_id = None
    from app.services.resurrection_service import eligible
    if ordered[next_index].status == "PURGATORY" and not eligible(game):
        game.base_move_used = True
    touch_game(game)
    session.commit()
    return get_game(session, game.id)
