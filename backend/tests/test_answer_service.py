import unittest

from fastapi import HTTPException
from pydantic import ValidationError
from uuid import uuid4

from app.schemas import ChallengeResult
from app.services.answer_service import evaluate_answer, normalize_rush_answer


class AnswersTest(unittest.TestCase):
    def test_quiz_timeout_submits_current_selection(self):
        quiz = {"type": "ABCD", "options": [{"text": "A", "is_correct": True}]}
        self.assertTrue(evaluate_answer("QUIZ", quiz, {"choice": "A"}))
        self.assertTrue(evaluate_answer("QUIZ", quiz, {"choice": "A", "timedOut": True}))
        self.assertFalse(evaluate_answer("QUIZ", quiz, {"choice": "B", "timedOut": True}))
        self.assertFalse(evaluate_answer("QUIZ", quiz, {"timedOut": True}))
        self.assertFalse(evaluate_answer("QUIZ", quiz, {}))

    def test_order_requires_exact_complete_order(self):
        quiz = {"type": "ORDER", "options": [{"text": str(i), "correct_position": i} for i in (4, 2, 1, 3)]}
        self.assertTrue(evaluate_answer("QUIZ", quiz, {"answers": ["1", "2", "3", "4"]}))
        self.assertTrue(evaluate_answer("QUIZ", quiz, {"answers": ["1", "2", "3", "4"], "timedOut": True}))
        for answers in (["1", "2"], ["1", "1", "3", "4"], ["2", "1", "3", "4"]):
            self.assertFalse(evaluate_answer("QUIZ", quiz, {"answers": answers}))
            self.assertFalse(evaluate_answer("QUIZ", quiz, {"answers": answers, "timedOut": True}))

    def test_all_in_validates_capital_and_threshold(self):
        task = {"options": [{"is_correct": i == 0} for i in range(4)]}
        self.assertTrue(evaluate_answer("ALL_IN", task, {"stakes": [50, 50, 0, 0]}))
        self.assertFalse(evaluate_answer("ALL_IN", task, {"stakes": [25, 25, 25, 25]}))
        for stakes in ([100, 100, 0, 0], [-1, 101, 0, 0], [100], [50.0, 50, 0, 0]):
            with self.assertRaises(HTTPException):
                evaluate_answer("ALL_IN", task, {"stakes": stakes})

    def test_rush_uses_aliases_without_counting_duplicates(self):
        task = {"required_count": 2, "answers": [
            {"answer": "Red Bull", "aliases": []},
            {"answer": "Maria Skłodowska-Curie", "aliases": ["Curie"]},
        ]}
        self.assertTrue(evaluate_answer("RUSH", task, {"answers": ["redbull", "Curie"]}))
        self.assertFalse(evaluate_answer("RUSH", task, {"answers": ["redbull", "Red Bull"]}))
        self.assertFalse(evaluate_answer("RUSH", task, {"answers": ["redbull", "Maria"]}))
        self.assertEqual(normalize_rush_answer("Skłodowska–Curie"), "sklodowskacurie")

    def test_more_less_uses_server_side(self):
        self.assertTrue(evaluate_answer("MORE_LESS", {"correct_side": "LESS"}, {"choice": "LESS"}))
        self.assertFalse(evaluate_answer("MORE_LESS", {"correct_side": "LESS"}, {"choice": "MORE"}))

    def test_client_cannot_submit_a_verdict(self):
        with self.assertRaises(ValidationError):
            ChallengeResult(challengeId=uuid4(), won=True)
