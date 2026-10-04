import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.session import engine
from app.models import Category, Content, Duel, DuelCategory, DuelItem, Game, GameHex, GameTeam, HexChallenge, PlaySession, RushTask
from app.schemas import ChallengeResult
from app.services.challenge_service import start_challenge, submit_answer, spin_roulette
from app.services.content_service import free_content, take_content
from app.services.game_service import next_player
from app.services.duel_service import create_duel, finish_duel, serialize_duel, next_duel_prompt


class SubmissionTest(unittest.TestCase):
    def setUp(self):
        self.connection = engine.connect()
        self.transaction = self.connection.begin()
        self.session = Session(bind=self.connection, join_transaction_mode="create_savepoint")
        self.session.execute(update(Game).where(Game.status == "ACTIVE").values(status="ARCHIVED"))
        party = PlaySession()
        self.session.add(party)
        self.session.flush()
        self.game = Game(play_session_id=party.id, status="ACTIVE", win_condition="ELIMINATION", streak_to_bonus=1)
        self.session.add(self.game)
        self.session.flush()
        self.teams = [GameTeam(game_id=self.game.id, name=str(i), color="#112233", avatar="owl", turn_order=i+1, status="ACTIVE") for i in range(2)]
        self.session.add_all(self.teams)
        self.session.flush()
        self.game.current_team_id = self.teams[0].id
        self.base = GameHex(game_id=self.game.id, q=0, r=0, owner_team_id=self.teams[0].id, is_base=True)
        self.enemy = GameHex(game_id=self.game.id, q=0, r=1, owner_team_id=self.teams[1].id, is_base=True)
        self.target = GameHex(game_id=self.game.id, q=1, r=0)
        self.session.add_all([self.base, self.enemy, self.target])
        content = Content(type="RUSH", active=True)
        self.session.add(content)
        self.session.flush()
        self.content_id = content.id
        self.session.add(RushTask(content_id=content.id, prompt="Marki", required_count=1, time_limit=30, answers=[{"answer": "Red Bull", "aliases": []}]))
        self.challenge = HexChallenge(hex_id=self.target.id, type="RUSH", content_id=content.id, status="AVAILABLE")
        self.roulette = HexChallenge(hex_id=self.target.id, type="GAMBLE", gamble_type="ROULETTE", status="AVAILABLE")
        self.session.add_all([self.challenge, self.roulette])
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.transaction.rollback()
        self.connection.close()

    def test_refresh_and_duplicate_submission_consume_only_one_move(self):
        start_challenge(self.session, self.game.id, self.target.id, "RUSH")
        self.session.expire_all()
        self.assertEqual(self.game.active_challenge_id, self.challenge.id)
        self.assertEqual(start_challenge(self.session, self.game.id, self.target.id, "RUSH")["challengeId"], str(self.challenge.id))
        answer = ChallengeResult(challengeId=self.challenge.id, answers=["redbull"])
        first = submit_answer(self.session, self.game.id, self.target.id, "RUSH", answer)
        second = submit_answer(self.session, self.game.id, self.target.id, "RUSH", answer)
        self.assertEqual(first["result"], "WIN")
        self.assertEqual(second["result"], "WIN")
        self.assertEqual(self.teams[0].bonus_moves, 1)
        self.assertEqual(self.target.owner_team_id, self.teams[0].id)
        self.assertIsNone(self.game.active_challenge_id)

    def test_cannot_answer_before_start_or_open_competing_action(self):
        with self.assertRaises(HTTPException):
            submit_answer(self.session, self.game.id, self.target.id, "RUSH", ChallengeResult(challengeId=self.challenge.id, answers=["Red Bull"]))
        start_challenge(self.session, self.game.id, self.target.id, "RUSH")
        with self.assertRaises(HTTPException):
            start_challenge(self.session, self.game.id, self.target.id, "GAMBLE")
        with self.assertRaises(HTTPException):
            create_duel(self.session, self.game.id, self.enemy.id)
        self.game.base_move_used = True
        with self.assertRaises(ValueError):
            next_player(self.session, self.game.id)

    def test_roulette_retry_returns_same_draw(self):
        start_challenge(self.session, self.game.id, self.target.id, "GAMBLE")
        challenge_id = self.roulette.id
        with patch("app.services.challenge_service.random.randrange", return_value=1) as draw:
            first = spin_roulette(self.session, self.game.id, self.target.id, "RED", challenge_id)
            second = spin_roulette(self.session, self.game.id, self.target.id, "RED", challenge_id)
            self.assertEqual(first[:3], second[:3])
            self.assertEqual(draw.call_count, 1)
        self.assertEqual(self.teams[0].bonus_moves, 1)

    def test_used_and_reserved_content_is_scoped_to_evening(self):
        party_id = self.game.play_session_id
        self.assertNotIn(self.content_id, free_content(self.session, party_id, "RUSH"))
        self.game.status = "ARCHIVED"
        self.session.flush()
        self.assertIn(self.content_id, free_content(self.session, party_id, "RUSH"))
        self.game.status = "ACTIVE"
        start_challenge(self.session, self.game.id, self.target.id, "RUSH")
        self.game.status = "ARCHIVED"
        self.session.flush()
        self.assertNotIn(self.content_id, free_content(self.session, party_id, "RUSH"))
        other = PlaySession()
        self.session.add(other)
        self.session.flush()
        self.assertIn(self.content_id, free_content(self.session, other.id, "RUSH"))
        with self.assertRaises(HTTPException) as error:
            take_content(self.session, [], "RUSH")
        self.assertEqual(error.exception.status_code, 409)

    def test_bonus_base_capture_ends_game_despite_purgatory_and_retry_is_safe(self):
        start_challenge(self.session, self.game.id, self.target.id, "RUSH")
        submit_answer(self.session, self.game.id, self.target.id, "RUSH", ChallengeResult(challengeId=self.challenge.id, answers=["redbull"]))
        category = Category(name=f"Test {self.game.id}")
        self.session.add(category)
        self.session.flush()
        self.session.add(DuelCategory(category_id=category.id, type="LIST"))
        duel = Duel(game_id=self.game.id, target_hex_id=self.enemy.id, attacker_team_id=self.teams[0].id,
                    defender_team_id=self.teams[1].id, category_id=category.id, type="LIST", status="ACTIVE")
        self.session.add(duel)
        self.session.commit()
        for _ in range(2):
            _, game = finish_duel(self.session, self.game.id, duel.id, self.teams[0].id)
            self.assertEqual(game.status, "FINISHED")
            self.assertEqual(self.teams[0].bonus_moves, 0)
            self.assertEqual(self.teams[0].streak, 0)
            self.assertEqual(self.teams[1].status, "PURGATORY")
        self.assertEqual(sum(h.is_base for h in game.hexes), 1)
        self.assertTrue(all(h.owner_team_id == self.teams[0].id for h in game.hexes))

    def test_text_duel_prompt_and_retry_do_not_require_images_or_repeat_items(self):
        category = Category(name=f"Text {self.game.id}")
        self.session.add(category)
        self.session.flush()
        self.session.add(DuelCategory(category_id=category.id, type="IDENTIFY"))
        content = Content(type="DUEL")
        self.session.add(content)
        self.session.flush()
        self.session.add(DuelItem(content_id=content.id, duel_category_id=category.id, prompt_type="TEXT", prompt="Stolica Polski", answer="Warszawa"))
        duel = Duel(game_id=self.game.id, target_hex_id=self.enemy.id, attacker_team_id=self.teams[0].id,
                    defender_team_id=self.teams[1].id, category_id=category.id, type="IDENTIFY", status="ACTIVE")
        self.session.add(duel)
        self.session.commit()
        with patch("app.services.duel_service.resolve_image", side_effect=AssertionError("Text resolved as image")):
            next_duel_prompt(self.session, self.game.id, duel.id)
            payload = serialize_duel(self.session, duel)
            self.assertEqual(payload["prompt"]["text"], "Stolica Polski")
            self.assertIsNone(payload["prompt"]["imageUrl"])
            with self.assertRaises(HTTPException):
                next_duel_prompt(self.session, self.game.id, duel.id, content.id)

    def test_duplicate_next_player_does_not_skip_another_team(self):
        self.game.base_move_used = True
        self.session.commit()
        next_player(self.session, self.game.id, self.teams[0].id)
        self.game.base_move_used = True
        with self.assertRaises(ValueError):
            next_player(self.session, self.game.id, self.teams[0].id)
        self.assertEqual(self.game.current_team_id, self.teams[1].id)
