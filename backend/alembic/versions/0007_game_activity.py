"""Track durable activity and retain a single active game."""

from alembic import op
import sqlalchemy as sa

revision = "0007_game_activity"
down_revision = "0006_duel_identify"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("game", sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE game SET last_activity_at = COALESCE(updated_at, started_at, created_at)")
    op.alter_column("game", "last_activity_at", nullable=False, server_default=sa.func.now())
    op.execute("""
        UPDATE game SET status = 'ARCHIVED'
        WHERE status = 'ACTIVE' AND (
            last_activity_at <= now() - interval '7 days'
            OR id NOT IN (SELECT id FROM game WHERE status = 'ACTIVE'
                          ORDER BY last_activity_at DESC, created_at DESC, id DESC LIMIT 1)
        )
    """)
    op.create_index("uq_game_single_active", "game", ["status"], unique=True,
                    postgresql_where=sa.text("status = 'ACTIVE'"))


def downgrade() -> None:
    op.drop_index("uq_game_single_active", table_name="game")
    op.drop_column("game", "last_activity_at")
