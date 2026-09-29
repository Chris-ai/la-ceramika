from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.games import router as games_router
from app.routers.health import router as health_router

app = FastAPI(title="La Ceramica API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(games_router)
app.include_router(health_router)

@app.get("/")
def root() -> dict[str, str]:
    return {"message": "La Ceramica API"}
