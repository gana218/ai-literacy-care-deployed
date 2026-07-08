"""실모듈 경로 통합 회귀.

content_reducer(2번 real) + cognitive_care(3번 real)를 켠 상태에서 폐루프가
계약을 지키며 끝까지 도는지 박제한다. LLM 게이트웨이 키는 제거해 네트워크 없이
결정론 경로로만 검증한다(재현성).
"""

from __future__ import annotations

import pytest

from backend.app.agents.qa_eval_client import run_qa_eval_agent
from backend.app.api.frontend_contract import to_session_result
from backend.app.demo.m1_scenario import build_m1_demo_state
from backend.app.orchestrator.graph import run_reading_session


@pytest.fixture
def real_mode(monkeypatch):
    """content/cognitive를 real로 전환하고 LLM 키를 제거한다."""
    monkeypatch.setenv("LITERACY_CONTENT_REDUCER_IMPL", "real")
    monkeypatch.setenv("LITERACY_COGNITIVE_CARE_IMPL", "real")
    monkeypatch.setenv("CONTENT_REDUCER_MODE", "real")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("SNOWCHAT_API_KEY", raising=False)


def test_real_path_closed_loop_is_green(real_mode):
    state = run_reading_session(build_m1_demo_state())
    state = run_qa_eval_agent(state)

    # 폐루프가 끊기지 않았다
    assert state["errors"] == []
    assert state["warnings"] == []
    assert all(entry["status"] == "success" for entry in state["trace"])

    # 2번 real 산출(계약)
    assert state["chunks"], "chunks가 비어있으면 안 된다"
    assert state["chunks"][0]["chunk_id"].startswith("chunk_")
    assert isinstance(state["terms"], list)
    assert 0.0 <= state["difficulty_score"] <= 100.0

    # 1번 점수 엔진
    assert 0.0 <= state["literacy_score"] <= 100.0
    assert "comprehension_score" in state["score_breakdown"]

    # 5번 QA 리포트
    qa = state["qa_evaluation"]
    assert {"faithfulness", "relevance", "average_score", "passed"} <= set(qa)


def test_real_path_trace_has_no_duplicate_content_reducer(real_mode):
    """real 모드에서 trace의 'content_reducer' 스텝 이름이 중복되지 않는다.

    2번 자체 상세 trace는 'content_reducer_detail'로 강등되고, graph 스텝 trace만
    'content_reducer'로 남는다.
    """
    state = run_reading_session(build_m1_demo_state())
    steps = [entry["step"] for entry in state["trace"]]

    assert steps.count("content_reducer") == 1
    assert "content_reducer_detail" in steps


def test_session_result_exposes_qa_evaluation(real_mode):
    state = run_reading_session(build_m1_demo_state())
    state = run_qa_eval_agent(state)

    result = to_session_result(state)
    qa = result["qaEvaluation"]
    assert qa is not None
    assert set(qa) == {"faithfulness", "relevance", "averageScore", "passed"}


def test_session_result_qa_is_none_without_evaluation():
    """QA를 돌리지 않은 세션은 qaEvaluation=None (안전한 기본값)."""
    state = run_reading_session(build_m1_demo_state())
    result = to_session_result(state)
    assert result["qaEvaluation"] is None
