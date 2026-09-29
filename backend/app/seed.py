import json
from pathlib import Path

from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models import (
    AllIn, AllInOption, Category, Content, Duel, DuelCategory, DuelItem, DuelItemUsage, MoreLess,
    QuizOption, QuizQuestion, RushTask,
)

SEED_DIR = Path(__file__).resolve().parents[1] / "seeds"


def load(name: str) -> dict:
    return json.loads((SEED_DIR / name).read_text(encoding="utf-8-sig"))


def seed_duel_identify_items(session: Session) -> int:
    data = load("la_ceramica_duel_identify_items.json")
    inserted = 0
    removed_category = session.scalar(
        select(DuelCategory)
        .join(Category, Category.id == DuelCategory.category_id)
        .where(Category.name == "Kontury państw")
    )
    if removed_category:
        removed_ids = list(
            session.scalars(
                select(DuelItem.content_id).where(
                    DuelItem.duel_category_id == removed_category.category_id
                )
            )
        )
        if removed_ids:
            session.execute(update(Duel).where(Duel.content_id.in_(removed_ids)).values(content_id=None))
            session.execute(delete(DuelItemUsage).where(DuelItemUsage.content_id.in_(removed_ids)))
            session.execute(delete(DuelItem).where(DuelItem.content_id.in_(removed_ids)))
            session.execute(delete(Content).where(Content.id.in_(removed_ids)))
        session.delete(removed_category)
    allowed_categories = set(data)
    identify_categories = list(
        session.execute(
            select(DuelCategory, Category)
            .join(Category, Category.id == DuelCategory.category_id)
            .where(DuelCategory.type == "IDENTIFY")
        )
    )
    for duel_category, category_record in identify_categories:
        if category_record.name not in allowed_categories and category_record.name != "Kontury państw":
            session.delete(duel_category)
    for category_name, items in data.items():
        duel_category = session.scalar(
            select(DuelCategory)
            .join(Category, Category.id == DuelCategory.category_id)
            .where(Category.name == category_name, DuelCategory.type == "IDENTIFY")
        )
        if duel_category is None:
            category_record = session.scalar(select(Category).where(Category.name == category_name))
            if category_record is None:
                category_record = Category(name=category_name, active=True)
                session.add(category_record)
                session.flush()
            duel_category = DuelCategory(category_id=category_record.id, type="IDENTIFY")
            session.add(duel_category)
            session.flush()
        desired = {prompt: answer for answer, prompt in items.items()}
        existing = {
            item.prompt: item
            for item in session.scalars(
                select(DuelItem).where(DuelItem.duel_category_id == duel_category.category_id)
            )
        }
        stale = [item for prompt, item in existing.items() if prompt not in desired]
        stale_ids = [item.content_id for item in stale]
        if stale_ids:
            session.execute(update(Duel).where(Duel.content_id.in_(stale_ids)).values(content_id=None))
            session.execute(delete(DuelItemUsage).where(DuelItemUsage.content_id.in_(stale_ids)))
            session.execute(delete(DuelItem).where(DuelItem.content_id.in_(stale_ids)))
            session.execute(delete(Content).where(Content.id.in_(stale_ids)))
        for prompt, answer in desired.items():
            if prompt in existing:
                existing[prompt].answer = answer
                continue
            content = Content(type="DUEL", active=True)
            session.add(content)
            session.flush()
            session.add(
                DuelItem(
                    content_id=content.id,
                    duel_category_id=duel_category.category_id,
                    prompt_type="IMAGE",
                    prompt=prompt,
                    answer=answer,
                )
            )
            inserted += 1
    session.commit()
    return inserted


def seed_database(session: Session) -> dict[str, int]:
    if session.scalar(select(func.count()).select_from(Content)):
        return {"duel_items": seed_duel_identify_items(session)}

    categories: dict[str, Category] = {}

    def category(name: str) -> Category:
        if name not in categories:
            categories[name] = Category(name=name, active=True)
            session.add(categories[name])
            session.flush()
        return categories[name]

    counts = {"quiz": 0, "rush": 0, "all_in": 0, "more_less": 0, "duel_categories": 0}

    for item in load("la_ceramica_quiz_seed_final.json")["questions"]:
        content = Content(type="QUIZ", active=True)
        session.add(content)
        session.flush()
        question = QuizQuestion(content_id=content.id, category_id=category(item["category"]).id, type=item["type"], question=item["question"])
        session.add(question)
        session.flush()
        for option in item["options"]:
            session.add(QuizOption(
                question_id=content.id,
                text=option["text"],
                is_correct=option.get("is_correct"),
                correct_position=option.get("correct_position"),
            ))
        counts["quiz"] += 1

    for item in load("la_ceramica_rush_seed_final.json")["tasks"]:
        content = Content(type="RUSH", active=True)
        session.add(content)
        session.flush()
        session.add(RushTask(content_id=content.id, prompt=item["prompt"], required_count=item["required_count"], time_limit=item["time_limit"], answers=item["answers"]))
        counts["rush"] += 1

    for item in load("la_ceramica_all_in_seed_final.json")["questions"]:
        content = Content(type="ALL_IN", active=True)
        session.add(content)
        session.flush()
        record = AllIn(content_id=content.id, category_id=category(item["category"]).id, question=item["question"])
        session.add(record)
        session.flush()
        for option in item["options"]:
            session.add(AllInOption(all_in_id=content.id, text=option["text"], is_correct=option["is_correct"]))
        counts["all_in"] += 1

    more_less_data = load("la_ceramica_more_less_seed_final.json")
    inactive = set(more_less_data.get("inactive_until_verified", []))
    for index, item in enumerate(more_less_data["questions"], start=1):
        if item.get("correct_value") is None or item.get("reference_value") is None:
            continue
        content = Content(type="MORE_LESS", active=index not in inactive)
        session.add(content)
        session.flush()
        session.add(MoreLess(content_id=content.id, question=item["question"], correct_value=item["correct_value"], reference_value=item["reference_value"], unit=item.get("unit")))
        counts["more_less"] += 1

    duel = load("la_ceramica_duel_seed_final.json")
    for item in duel["list_categories"]:
        session.add(DuelCategory(category_id=category(item["name"]).id, type="LIST"))
        counts["duel_categories"] += 1
    for item in duel["identify_categories"]:
        session.add(DuelCategory(category_id=category(item["name"]).id, type="IDENTIFY"))
        counts["duel_categories"] += 1

    session.commit()
    counts["duel_items"] = seed_duel_identify_items(session)
    return counts


def main() -> None:
    with SessionLocal() as session:
        print(seed_database(session))


if __name__ == "__main__":
    main()
