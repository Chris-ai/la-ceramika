import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class TeamCreate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=40)
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    avatar: str = Field(min_length=1, max_length=80)


class GameCreate(BaseModel):
    continueSession: bool = False
    replaceActiveGameId: uuid.UUID | None = None
    teams: list[TeamCreate] = Field(min_length=2, max_length=6)
    hexCount: int = Field(le=42)
    winCondition: Literal["ELIMINATION"] = "ELIMINATION"
    roundLimit: None = None
    streakToBonus: int = Field(ge=1)
    resurrectionEnabled: bool

    @model_validator(mode="after")
    def validate_setup(self):
        minimum = len(self.teams) * 6
        maximum = 36 if len(self.teams) <= 3 else 42
        if not minimum <= self.hexCount <= maximum:
            raise ValueError(f"Liczba heksów musi mieścić się w zakresie {minimum}–{maximum}.")
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
    model_config = {"extra": "forbid"}
    challengeId: uuid.UUID
    choice: str | None = Field(default=None, max_length=2000)
    answers: list[str] = Field(default_factory=list, max_length=200)
    stakes: list[int] = Field(default_factory=list, max_length=4)
    timedOut: bool = False


class RouletteBet(BaseModel):
    choice: str
    challengeId: uuid.UUID


class DuelFinish(BaseModel):
    winnerTeamId: uuid.UUID


class NextPlayer(BaseModel):
    currentTeamId: uuid.UUID


class NextDuelPrompt(BaseModel):
    previousContentId: uuid.UUID
