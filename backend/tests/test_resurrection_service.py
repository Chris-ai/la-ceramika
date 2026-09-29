import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Content, Game, GameHex, GameTeam, HexChallenge, PlaySession, RushTask, SessionContentUsage
from app.services.challenge_service import resolve_challenge
from app.services.game_service import next_player
from app.services.resurrection_service import start_resurrection


class ResurrectionTest(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.session = Session(bind=self.connection, join_transaction_mode="create_savepoint")
        self.session.execute(update(Game).where(Game.status == "ACTIVE").values(status="ARCHIVED"))
        party = PlaySession()
        self.session.add(party)
        self.session.flush()
        self.game = Game(play_session_id=party.id, status="ACTIVE", win_condition="ROUND_LIMIT",
                         round_limit=3, current_round=1, resurrection_enabled=True, streak_to_bonus=1)
        self.session.add(self.game)
        self.session.flush()
        self.teams = [GameTeam(game_id=self.game.id, name=f"Team {i}", color="#112233", avatar="owl",
                               turn_order=i + 1, status="ACTIVE" if i == 0 else "PURGATORY") for i in range(3)]
        self.session.add_all(self.teams)
        self.session.flush()
        self.game.current_team_id = self.teams[1].id
        self.base = self.hex(0, owner=self.teams[0], base=True)
        self.first = self.hex(1)
        self.second = self.hex(2)
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.transaction.rollback()
        self.connection.close()

    def hex(self, q, owner=None, base=False):
        tile = GameHex(game_id=self.game.id, q=q, r=0, status="ACTIVE",
                       owner_team_id=owner.id if owner else None, is_base=base)
        self.session.add(tile)
        self.session.flush()
        if not owner:
            self.session.add_all([HexChallenge(hex_id=tile.id, type=kind, status="AVAILABLE" if kind == "GAMBLE" else "BURNED",
                                               gamble_type="ROULETTE" if kind == "GAMBLE" else None) for kind in ("QUIZ", "RUSH", "GAMBLE")])
            self.session.flush()
        return tile

    def start_on(self, tile):
        with patch("app.services.resurrection_service.random.choice", side_effect=lambda items: next((x for x in items if x.id == tile.id), items[0])):
            return start_resurrection(self.session, self.game.id)

    def test_random_attempt_is_reused_after_refresh(self):
        first = self.start_on(self.second)
        self.session.expire_all()
        with patch("app.services.resurrection_service.random.choice", side_effect=AssertionError("Rerolled")):
            again = start_resurrection(self.session, self.game.id)
        self.assertEqual(first["hexId"], again["hexId"])
        self.assertEqual(again["challenge"]["type"], "GAMBLE")

    def test_win_restores_base_without_streak_or_bonus_and_ends_actions(self):
        self.start_on(self.second)
        game = resolve_challenge(self.session, self.game.id, self.second.id, "GAMBLE", True)
        self.assertEqual(self.teams[1].status, "ACTIVE")
        self.assertEqual(self.second.owner_team_id, self.teams[1].id)
        self.assertTrue(self.second.is_base)
        self.assertEqual((self.teams[1].streak, self.teams[1].bonus_moves), (0, 0))
        self.assertTrue(game.base_move_used)
        self.assertIsNone(game.resurrection_challenge_id)
        with self.assertRaises(HTTPException):
            start_resurrection(self.session, self.game.id)

    def test_cannot_choose_another_hex_or_challenge(self):
        self.start_on(self.second)
        with self.assertRaises(HTTPException):
            resolve_challenge(self.session, self.game.id, self.first.id, "GAMBLE", True)

    def test_loss_destroys_safe_leaf_and_later_team_becomes_ineligible(self):
        self.start_on(self.second)
        resolve_challenge(self.session, self.game.id, self.second.id, "GAMBLE", False)
        self.assertEqual(self.second.status, "DESTROYED")
        self.assertEqual(self.teams[1].status, "PURGATORY")
        game = next_player(self.session, self.game.id)
        self.assertEqual(game.current_team_id, self.teams[2].id)
        self.assertTrue(game.base_move_used)
        with self.assertRaises(HTTPException):
            start_resurrection(self.session, self.game.id)
        game = next_player(self.session, self.game.id)
        self.assertEqual(game.current_round, 2)

    def test_bridge_survives_last_failed_challenge_and_gets_reset(self):
        self.start_on(self.first)
        with patch("app.services.challenge_service.reset_challenges") as reset:
            resolve_challenge(self.session, self.game.id, self.first.id, "GAMBLE", False)
        reset.assert_called_once()
        self.assertEqual(self.first.status, "ACTIVE")
        self.assertIsNone(self.first.owner_team_id)

    def test_failed_nonfinal_challenge_only_burns_selected_slot(self):
        self.first.challenges[0].status = "AVAILABLE"
        self.session.commit()
        self.start_on(self.second)
        # Leave another slot available on the selected tile before resolving.
        quiz = next(c for c in self.second.challenges if c.type == "QUIZ")
        quiz.status = "AVAILABLE"
        self.session.commit()
        resolve_challenge(self.session, self.game.id, self.second.id, "GAMBLE", False)
        self.assertEqual(self.second.status, "ACTIVE")
        self.assertEqual(quiz.status, "AVAILABLE")
        self.assertEqual(next(c for c in self.second.challenges if c.type == "GAMBLE").status, "BURNED")

    def test_finished_game_cannot_resurrect(self):
        self.game.status = "FINISHED"
        self.session.commit()
        with self.assertRaises(HTTPException):
            start_resurrection(self.session, self.game.id)

    def test_revealed_content_is_used_once_and_unseen_content_is_not_used(self):
        content = Content(type="RUSH")
        self.session.add(content)
        self.session.flush()
        self.session.add(RushTask(content_id=content.id, prompt="Podaj kolor", required_count=1,
                                  time_limit=30, answers=[{"answer": "red", "aliases": []}]))
        for challenge in self.second.challenges:
            challenge.status = "AVAILABLE" if challenge.type == "RUSH" else "BURNED"
            if challenge.type == "RUSH":
                challenge.content_id = content.id
        self.session.commit()
        self.assertIsNone(self.session.get(SessionContentUsage, (self.game.play_session_id, content.id)))
        self.start_on(self.second)
        start_resurrection(self.session, self.game.id)
        self.assertIsNotNone(self.session.get(SessionContentUsage, (self.game.play_session_id, content.id)))
        resolve_challenge(self.session, self.game.id, self.second.id, "RUSH", True)
        self.assertIsNotNone(self.session.get(SessionContentUsage, (self.game.play_session_id, content.id)))

    def test_success_leaves_next_purgatory_team_eligible(self):
        self.start_on(self.second)
        resolve_challenge(self.session, self.game.id, self.second.id, "GAMBLE", True)
        game = next_player(self.session, self.game.id)
        self.assertFalse(game.base_move_used)
        attempt = start_resurrection(self.session, self.game.id)
        self.assertEqual(attempt["hexId"], self.first.id)

    def test_insufficient_neutral_fields_consumes_turn(self):
        self.second.status = "DESTROYED"
        self.session.commit()
        result = start_resurrection(self.session, self.game.id)
        self.assertIsNone(result["challenge"])
        self.assertTrue(self.game.base_move_used)


if __name__ == "__main__":
    unittest.main()
