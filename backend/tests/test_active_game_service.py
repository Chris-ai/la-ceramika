import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Content, Game, GameTeam, PlaySession
from app.schemas import GameCreate
from app.services.active_game_service import find_active_game, prepare_new_game
from app.services.game_service import create_game, get_game, next_player


class ActiveGameTest(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.session = Session(bind=self.connection, join_transaction_mode="create_savepoint")
        self.session.execute(update(Game).where(Game.status == "ACTIVE").values(status="ARCHIVED"))
        party = PlaySession()
        self.session.add(party)
        self.session.flush()
        self.party_id = party.id

    def tearDown(self):
        self.session.close()
        self.transaction.rollback()
        self.connection.close()

    def add_game(self, days=0, status="ACTIVE"):
        game = Game(play_session_id=self.party_id, status=status, win_condition="ELIMINATION",
                    last_activity_at=datetime.now(timezone.utc) - timedelta(days=days))
        self.session.add(game)
        self.session.flush()
        return game

    def test_lookup_does_not_touch_recent_activity(self):
        game = self.add_game(days=6)
        before = game.last_activity_at
        self.assertIs(find_active_game(self.session), game)
        self.assertEqual(game.last_activity_at, before)
        self.assertEqual(get_game(self.session, game.id).last_activity_at, before)

    def test_seven_day_boundary_archives_without_deleting(self):
        game = self.add_game(days=7)
        before = game.last_activity_at
        self.assertIsNone(find_active_game(self.session))
        self.assertEqual(game.status, "ARCHIVED")
        self.assertEqual(game.last_activity_at, before)
        self.assertIsNotNone(self.session.get(Game, game.id))

    def test_finished_and_archived_are_not_returned(self):
        for status in ("FINISHED", "ARCHIVED"):
            self.add_game(status=status)
        self.assertIsNone(find_active_game(self.session))

    def test_replacement_requires_exact_confirmation(self):
        game = self.add_game()
        for confirmation in (None, uuid4()):
            with self.assertRaises(HTTPException) as error:
                prepare_new_game(self.session, confirmation)
            self.assertEqual(error.exception.status_code, 409)
            self.assertEqual(game.status, "ACTIVE")
        prepare_new_game(self.session, game.id)
        self.assertEqual(game.status, "ARCHIVED")

    def test_database_rejects_second_active_game(self):
        self.add_game()
        with self.assertRaises(IntegrityError):
            with self.session.begin_nested():
                self.add_game()

    def test_failed_creation_rolls_back_archival(self):
        game = self.add_game()
        game_id = game.id
        self.session.commit()
        setup = GameCreate(teams=[
            {"color": "#91abea", "avatar": "owl"},
            {"color": "#f28e9a", "avatar": "bear-head"},
        ], hexCount=12, winCondition="ELIMINATION", streakToBonus=3,
            resurrectionEnabled=True, replaceActiveGameId=game_id)
        with patch("app.services.game_service.generate_connected_hexes", side_effect=RuntimeError("generation failed")):
            with self.assertRaises(RuntimeError):
                create_game(self.session, setup)
        self.session.rollback()
        self.assertEqual(self.session.get(Game, game_id).status, "ACTIVE")
        self.assertEqual(len(list(self.session.scalars(select(Game).where(Game.status == "ACTIVE")))), 1)

    def test_creation_persists_internal_names_with_fallback(self):
        pools = {}
        for content_type in ("QUIZ", "RUSH"):
            items = [Content(type=content_type, active=True) for _ in range(12)]
            self.session.add_all(items)
            self.session.flush()
            pools[content_type] = [item.id for item in items]
        setup = GameCreate(teams=[
            {"name": "Drużyna 1", "color": "#91abea", "avatar": "owl"},
            {"color": "#f28e9a", "avatar": "rocket"},
        ], hexCount=12, winCondition="ELIMINATION", streakToBonus=3, resurrectionEnabled=True)
        with patch("app.services.game_service.content_pool", side_effect=lambda session, kind: list(pools.get(kind, []))):
            game = create_game(self.session, setup)
        self.session.expire_all()
        stored = get_game(self.session, game.id)
        self.assertEqual({team.color: team.name for team in stored.teams}, {
            "#91abea": "Drużyna 1", "#f28e9a": "Drużyna 2",
        })

    def test_next_player_updates_activity_and_rejects_archive(self):
        game = self.add_game(days=6)
        teams = [GameTeam(game_id=game.id, name=f"Drużyna {index + 1}", color=color, avatar=name, turn_order=index + 1)
                 for index, (name, color) in enumerate((("A", "#91abea"), ("B", "#f28e9a")))]
        self.session.add_all(teams)
        self.session.flush()
        game.current_team_id = teams[0].id
        game.base_move_used = True
        before = game.last_activity_at
        next_player(self.session, game.id)
        self.assertGreater(game.last_activity_at, before)
        game.status = "ARCHIVED"
        game.base_move_used = True
        with self.assertRaises(ValueError):
            next_player(self.session, game.id)


if __name__ == "__main__":
    unittest.main()
