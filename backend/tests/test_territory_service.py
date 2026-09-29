import unittest

from sqlalchemy import update

from app.db.session import SessionLocal
from app.models import Game, GameHex, GameTeam, PlaySession
from app.services.territory_service import capture_enemy_hex


class TerritoryCaptureTest(unittest.TestCase):
    def setUp(self):
        self.session = SessionLocal()
        self.transaction = self.session.begin()
        self.session.execute(update(Game).where(Game.status == "ACTIVE").values(status="ARCHIVED"))
        play_session = PlaySession()
        self.session.add(play_session)
        self.session.flush()
        self.game = Game(play_session_id=play_session.id, status="ACTIVE", win_condition="ROUND_LIMIT",
                         round_limit=3, current_round=1, streak_to_bonus=3, resurrection_enabled=True)
        self.session.add(self.game)
        self.session.flush()
        self.attacker = GameTeam(game_id=self.game.id, name="Drużyna 1", color="#3366aa", avatar="owl", turn_order=1)
        self.defender = GameTeam(game_id=self.game.id, name="Drużyna 2", color="#aa3344", avatar="fox", turn_order=2)
        self.session.add_all((self.attacker, self.defender))
        self.session.flush()
        self.game.current_team_id = self.attacker.id

    def tearDown(self):
        self.transaction.rollback()
        self.session.close()

    def add_hex(self, q, r, owner, *, base=False):
        game_hex = GameHex(game_id=self.game.id, q=q, r=r, status="ACTIVE", owner_team_id=owner.id, is_base=base)
        self.session.add(game_hex)
        self.session.flush()
        return game_hex

    def test_normal_capture_transfers_component_cut_from_defender_base(self):
        self.add_hex(1, -1, self.attacker, base=True)
        self.add_hex(0, 0, self.defender, base=True)
        bridge = self.add_hex(1, 0, self.defender)
        cut_off = self.add_hex(2, 0, self.defender)

        capture_enemy_hex(self.session, self.game, bridge, self.attacker, self.defender)

        self.assertEqual(bridge.owner_team_id, self.attacker.id)
        self.assertEqual(cut_off.owner_team_id, self.attacker.id)

    def test_base_capture_transfers_every_hex_and_sends_defender_to_purgatory(self):
        self.add_hex(1, -1, self.attacker, base=True)
        defender_base = self.add_hex(0, 0, self.defender, base=True)
        territory = self.add_hex(1, 0, self.defender)
        self.defender.streak = 2
        self.defender.bonus_moves = 1

        capture_enemy_hex(self.session, self.game, defender_base, self.attacker, self.defender)

        self.assertEqual(defender_base.owner_team_id, self.attacker.id)
        self.assertFalse(defender_base.is_base)
        self.assertEqual(territory.owner_team_id, self.attacker.id)
        self.assertEqual(self.defender.status, "PURGATORY")
        self.assertEqual((self.defender.streak, self.defender.bonus_moves), (0, 0))


if __name__ == "__main__":
    unittest.main()
