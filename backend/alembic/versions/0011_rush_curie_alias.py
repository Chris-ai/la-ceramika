"""Accept the unambiguous surname in the Nobel laureates RUSH task."""
from alembic import op
import sqlalchemy as sa

revision = "0011_rush_curie_alias"
down_revision = "0010_resurrection_attempt"
branch_labels = None
depends_on = None


def upgrade() -> None:
    connection = op.get_bind()
    tasks = sa.table("rush_task", sa.column("content_id", sa.Uuid()), sa.column("answers", sa.JSON()))
    for row in connection.execute(sa.select(tasks)).mappings():
        answers = row["answers"]
        changed = False
        for answer in answers:
            if answer["answer"] == "Maria Skłodowska-Curie" and "Curie" not in answer.get("aliases", []):
                answer["aliases"] = [*answer.get("aliases", []), "Curie"]
                changed = True
        if changed:
            connection.execute(tasks.update().where(tasks.c.content_id == row["content_id"]).values(answers=answers))


def downgrade() -> None:
    # Content corrections remain valid when rolling back schema revisions.
    pass
