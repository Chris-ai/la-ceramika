"""Evaluate submitted answers against authoritative content."""
import unicodedata

from fastapi import HTTPException


def normalize_rush_answer(value: str) -> str:
    value = unicodedata.normalize("NFD", value).lower().replace("ł", "l")
    return "".join(c for c in value if not unicodedata.combining(c)
                   and not c.isspace() and unicodedata.category(c) != "Pd" and c not in "'’")


def evaluate_answer(kind: str, payload: dict, answer: dict) -> bool:
    if kind == "QUIZ":
        if payload["type"] == "ABCD":
            return any(o["text"] == answer.get("choice") and o["is_correct"] for o in payload["options"])
        expected = [o["text"] for o in sorted(payload["options"], key=lambda o: o["correct_position"])]
        return answer.get("answers") == expected
    if kind == "RUSH":
        found = set()
        for value in answer.get("answers", []):
            normalized = normalize_rush_answer(value)
            matches = [index for index, item in enumerate(payload["answers"])
                       if normalized and any(normalize_rush_answer(alias) == normalized
                                             for alias in [item["answer"], *item.get("aliases", [])])]
            if len(matches) == 1:
                found.add(matches[0])
        return len(found) >= payload["required_count"]
    if kind == "ALL_IN":
        stakes = answer.get("stakes", [])
        if len(stakes) != 4 or any(type(n) is not int or n < 0 or n > 100 for n in stakes) or sum(stakes) != 100:
            raise HTTPException(422, "Rozdziel dokładnie 100 pomiędzy cztery odpowiedzi.")
        return any(option["is_correct"] and stakes[index] >= 50 for index, option in enumerate(payload["options"]))
    if kind == "MORE_LESS":
        return answer.get("choice") == payload["correct_side"]
    raise HTTPException(422, "Ten typ wyzwania wymaga osobnej akcji.")
