from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# --- Session ---
class BaselineScrollSpeed(BaseModel):
    easy: float
    hard: float
    # 온보딩 지문 난이도(2번 difficulty_score). 미전송 시 기본 20/75.
    dEasy: Optional[float] = None
    dHard: Optional[float] = None

class SessionStartRequest(BaseModel):
    userId: str
    articleId: Optional[str] = None
    content: Optional[list[str]] = None
    rawText: Optional[str] = None
    source: Optional[dict] = None
    baselineScrollSpeed: Optional[BaselineScrollSpeed] = None


class SessionStartResponse(BaseModel):
    sessionId: str
    article: dict
    wsEndpoint: str


class SessionFinishRequest(BaseModel):
    literacy_score: Optional[float] = None
    comprehension_score: Optional[float] = None
    engagement_score: Optional[float] = None


class SessionFinishResponse(BaseModel):
    session_id: str
    message: str
    saved_events_count: int

class EventItem(BaseModel):
    # 웹은 payload.scrollVelocity 등 추가 필드를 함께 보낸다. 집중도 계산이
    # 이 값을 읽을 수 있도록 정의되지 않은 필드도 버리지 않고 통과시킨다.
    model_config = ConfigDict(extra="allow")

    type: str
    timestamp_ms: Optional[int] = None
    duration_ms: Optional[int] = None
    position: Optional[float] = None

class EventsRequestModel(BaseModel):
    events: list[EventItem]

# --- Quiz Submit (7/6) ---
class QuizSubmitRequest(BaseModel):
    quizId: str
    selectedOption: str

class QuizSubmitResponse(BaseModel):
    correct: bool
    explanation: str
    focusRecovered: float
    xpEarned: int

# --- Term Explain (7/6) ---
class TermExplainRequest(BaseModel):
    term: str
    context: Optional[str] = None

class TermExplainResponse(BaseModel):
    explanation: str
    definition: Optional[str] = None
    source: Optional[str] = None
