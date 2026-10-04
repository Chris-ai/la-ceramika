import unittest

from pydantic import ValidationError

from app.schemas import GameCreate


class GameCreateV1Test(unittest.TestCase):
    def payload(self, **extra):
        return dict(teams=[{"color": "#91abea", "avatar": "owl"},
                           {"color": "#f28e9a", "avatar": "rocket"}],
                    hexCount=12, streakToBonus=3, resurrectionEnabled=True, **extra)

    def test_defaults_to_elimination_without_round_limit(self):
        setup = GameCreate(**self.payload())
        self.assertEqual(setup.winCondition, "ELIMINATION")
        self.assertIsNone(setup.roundLimit)

    def test_accepts_explicit_elimination(self):
        GameCreate(**self.payload(winCondition="ELIMINATION", roundLimit=None))

    def test_rejects_other_modes_and_any_round_limit(self):
        for extra in ({"winCondition": "ROUND_LIMIT", "roundLimit": 5},
                      {"winCondition": "ROUND_LIMIT"}, {"winCondition": "OTHER"},
                      {"roundLimit": 5}):
            with self.subTest(extra=extra), self.assertRaises(ValidationError):
                GameCreate(**self.payload(**extra))
