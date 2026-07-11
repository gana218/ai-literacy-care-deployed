"""용어 단건 조회(hover lookup) — 프론트(4번)·확장 계약.

POST /api/terms/lookup  {word, sessionId?, context?}
  → {term, definition, source, faithfulnessScore}

2번(content_reducer) `lookup_term`의 무료 다단 폴백(로컬사전 → 우리말샘 API →
임베딩 유사도 → LLM 문맥 유추 → not_found)에 그대로 연결한다.
디버그용 `_meta`는 프론트에 노출하지 않는다.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.app.agents.content_reducer.rag_engine import lookup_term

router = APIRouter(prefix="/terms", tags=["terms"])


@router.post("/lookup")
def lookup(payload: dict) -> dict:
    word = str(payload.get("word") or "").strip()
    if not word:
        return {"term": "", "definition": "", "source": "not_found", "faithfulnessScore": 0.0}

    context = payload.get("context")
    if not isinstance(context, str):
        context = None

    result = lookup_term(word, context)
    return {
        "term": result.get("term", word),
        "definition": result.get("definition", ""),
        "source": result.get("source", "not_found"),
        "faithfulnessScore": result.get("faithfulness_score", 0.0),
    }
