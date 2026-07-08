"""Adapter for the Content Reducer agent."""

from __future__ import annotations

from backend.app.agents.config import impl_mode, run_agent
from backend.app.agents.content_reducer.agent import (
    run_content_reducer as _content_reducer_real,
)
from backend.app.agents.stubs.content_reducer_stub import content_reducer_stub
from backend.app.orchestrator.state import ReadingSessionState

# 2번(Content & RAG) 실구현 연결 완료 — 임시 브릿지 폐기.
# `backend/app/agents/content_reducer/`(2번 패키지 이식본)의 진입점을 그대로 호출한다.
# 활성화: LITERACY_CONTENT_REDUCER_IMPL=real
#   - 내부 CONTENT_REDUCER_MODE(기본 real)로 실제 파이프라인 실행
#   - LLM 키(GEMINI_API_KEY) 없으면 데모 재구성으로 안전 강등(데모 안 끊김)
# 이전 임시 브릿지는 backend/app/agents/real/content_reducer_bridge.py 에 보존.
_REAL_IMPL = _content_reducer_real


def run_content_reducer(state: ReadingSessionState) -> ReadingSessionState:
    """Run the configured Content Reducer implementation."""
    state = run_agent("content_reducer", state, stub=content_reducer_stub, real=_REAL_IMPL)
    # 2번 real은 자체 trace 항목(step="content_reducer")을 남긴다. graph._run_step도
    # 스텝 trace를 남기므로 이름이 겹쳐 "content_reducer"가 2번 찍힌다. 2번의 상세
    # 항목을 "content_reducer_detail"로 강등해 graph의 스텝 trace와 구분한다(정보는 보존).
    if impl_mode("content_reducer") == "real":
        trace = state.get("trace") or []
        if trace and trace[-1].get("step") == "content_reducer":
            trace[-1]["step"] = "content_reducer_detail"
    return state
