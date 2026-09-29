import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class TeamCreate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    avatar: str = Field(min_length=1, max_length=80)


class GameCreate(BaseModel):
    replaceActiveGameId: uuid.UUID | None = None
    teams: list[TeamCreate] = Field(min_length=2, max_length=6)
    hexCount: int = Field(le=42)
    winCondition: str
    roundLimit: int | None = Field(default=None, ge=1)
    streakToBonus: int = Field(ge=1)
    resurrectionEnabled: bool

    @model_validator(mode="after")
    def validate_setup(self):
        minimum = len(self.teams) * 6
        maximum = 36 if len(self.teams) <= 3 else 42
        if not minimum <= self.hexCount <= maximum:
            raise ValueError(f"Liczba heksów musi mieścić się w zakresie {minimum}–{maximum}.")
        if self.winCondition not in {"ELIMINATION", "ROUND_LIMIT"}:
            raise ValueError("Nieznany warunek zwycięstwa.")
        if self.winCondition == "ROUND_LIMIT" and self.roundLimit is None:
            raise ValueError("Limit rund jest wymagany.")
        if self.winCondition == "ELIMINATION" and self.roundLimit is not None:
            raise ValueError("Eliminacja nie może mieć limitu rund.")
        if len({team.color.lower() for team in self.teams}) != len(self.teams):
            raise ValueError("Kolory drużyn muszą być unikalne.")
        if len({team.avatar for team in self.teams}) != len(self.teams):
            raise ValueError("Ikony drużyn muszą być unikalne.")
        return self


class TeamState(BaseModel):
    id: uuid.UUID
    color: str
    avatar: str
    turnOrder: int
    status: str
    streak: int
    bonusMoves: int


class HexState(BaseModel):
    id: uuid.UUID
    q: int
    r: int
    ownerTeamIndex: int | None
    isBase: bool
    status: str
    availableChallenges: list[str]


class GameState(BaseModel):
    winnerTeamId: uuid.UUID | None = None
    gameId: uuid.UUID
    status: str
    hexCount: int
    currentTeamId: uuid.UUID
    currentRound: int
    resurrectionPending: bool = False
    baseMoveUsed: bool
    teams: list[TeamState]
    hexes: list[HexState]


class GameSummaryTeam(BaseModel):
    color: str
    avatar: str


class GameSummary(BaseModel):
    gameId: uuid.UUID
    status: str
    currentRound: int
    createdAt: datetime
    updatedAt: datetime
    teams: list[GameSummaryTeam]


class ChallengeStart(BaseModel):
    type: str


class ChallengeResult(BaseModel):
    won: bool


class RouletteBet(BaseModel):
    choice: str


class DuelFinish(BaseModel):
    winnerTeamId: uuid.UUID
