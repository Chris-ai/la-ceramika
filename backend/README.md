# Backend lokalny

Uruchom PostgreSQL z katalogu głównego repozytorium:

```powershell
docker compose up -d db
```

W katalogu `backend` utwórz środowisko Python i zainstaluj zależności:

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m alembic upgrade head
.venv\Scripts\python -m uvicorn app.main:app --reload
```

API działa pod `http://127.0.0.1:8000`. `/health/db` sprawdza połączenie
z PostgreSQL. Domyślny URL bazy odpowiada ustawieniom w Docker Compose;
można go zmienić przez zmienną `DATABASE_URL` lub plik `.env`.

Migracja `0001_baseline` tworzy tylko techniczną tabelę wersji Alembic.
Modele domenowe i tabele gry będą dodane w kolejnych etapach.
