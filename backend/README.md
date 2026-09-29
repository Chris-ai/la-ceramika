# Backend lokalny

Uruchom PostgreSQL z katalogu gĹ‚Ăłwnego repozytorium:

```powershell
docker compose up -d db
```

W katalogu `backend` utwĂłrz Ĺ›rodowisko Python i zainstaluj zaleĹĽnoĹ›ci:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m alembic upgrade head
.venv\Scripts\python -m app.seed
.venv\Scripts\python -m uvicorn app.main:app --reload
```

API dziaĹ‚a pod `http://127.0.0.1:8000`. `/health/db` sprawdza poĹ‚Ä…czenie
z PostgreSQL. `POST /games` tworzy rozpoczÄ™tÄ… grÄ™ wraz z druĹĽynami,
poĹ‚Ä…czonÄ… mapÄ…, bazami i zarezerwowanymi wyzwaniami. `GET /games/{game_id}`
odtwarza jej stan po odĹ›wieĹĽeniu frontendu.

DomyĹ›lny URL bazy odpowiada ustawieniom w Docker Compose; moĹĽna go zmieniÄ‡
przez zmiennÄ… `DATABASE_URL` lub plik `.env`. Seed jest idempotentny i nie
dodaje drugiej kopii treĹ›ci, jeĹ›li tabela `content` nie jest pusta.


### Aktywna gra i ekran startowy

Po aktualizacji uruchom `alembic upgrade head`. Migracja `0007_game_activity`
uzupełnia `last_activity_at` z istniejącego `updated_at`, archiwizuje porzucone
partie (7 dni) oraz pozostawia najwyżej jedną, najnowszą aktywną grę.
Nie usuwa rekordów. Częściowy indeks unikalny chroni ten warunek w PostgreSQL.

`GET /games/active` zwraca podsumowanie gry albo `null`; przy okazji archiwizuje
przeterminowaną partię, ale nie odnawia jej aktywności. Trwałe akcje aktualizują
`last_activity_at`. `POST /games` wymaga `replaceActiveGameId`, jeśli istnieje
aktywna partia. Zastąpienie i utworzenie gry są jedną transakcją; błąd tworzenia
lub anulowanie formularza nie archiwizuje poprzedniej gry.

Testy: `python -m unittest discover -s tests -v` (wymagają lokalnego PostgreSQL
po migracjach; dane testowe są wycofywane transakcyjnie).
