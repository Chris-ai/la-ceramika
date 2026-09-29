import unittest
from uuid import uuid4

from app.models import Game, GameHex, GameTeam
from app.services.game_service import serialize_game


class GameWinnerTest(unittest.TestCase):
    def setUp(self):
        self.teams = [GameTeam(id=uuid4(), color="#91abea", avatar="owl", turn_order=i,
                               status="ACTIVE", streak=0, bonus_moves=0) for i in range(2)]
        self.game = Game(id=uuid4(), status="FINISHED", teams=self.teams, hexes=[],
                         current_team_id=self.teams[0].id, current_round=1, base_move_used=True)

    def tile(self, owner, status="ACTIVE"):
        self.game.hexes.append(GameHex(id=uuid4(), q=len(self.game.hexes), r=0,
                                      status=status, owner_team_id=owner, is_base=False, challenges=[]))

    def test_finished_game_returns_unique_leader_and_ignores_destroyed_hexes(self):
        self.tile(self.teams[0].id)
        self.tile(self.teams[1].id, "DESTROYED")
        self.tile(None)
        self.assertEqual(serialize_game(self.game)["winnerTeamId"], self.teams[0].id)

    def test_active_game_has_no_winner_even_with_one_remaining_team(self):
        self.game.status = "ACTIVE"
        self.tile(self.teams[0].id)
        self.assertIsNone(serialize_game(self.game)["winnerTeamId"])

    def test_tie_does_not_arbitrarily_choose_a_winner(self):
        for team in self.teams:
            self.tile(team.id)
        self.assertIsNone(serialize_game(self.game)["winnerTeamId"])

    def test_empty_board_has_no_winner(self):
        self.assertIsNone(serialize_game(self.game)["winnerTeamId"])
