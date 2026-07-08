from __future__ import annotations

import pytest

from backend.app.agents import config
from backend.app.agents.content_reducer_client import run_content_reducer
from backend.app.orchestrator.state import create_initial_state


def _state():
    return create_initial_state(
        session_id="s1",
        user_id="u1",
        document_id="doc1",
        raw_text="Sample text",
    )


def _real_marker(state):
    state["difficulty_score"] = 99.0
    return state


def _stub_marker(state):
    state["difficulty_score"] = 1.0
    return state


@pytest.fixture(autouse=True)
def _clear_impl_env(monkeypatch):
    """각 테스트가 깨끗한 환경변수 상태에서 시작하도록 보장한다."""
    for key in ("LITERACY_AGENT_IMPL", "LITERACY_CONTENT_REDUCER_IMPL"):
        monkeypatch.delenv(key, raising=False)


def test_default_mode_is_stub():
    assert config.impl_mode("content_reducer") == "stub"


def test_global_env_selects_real():
    import os

    os.environ["LITERACY_AGENT_IMPL"] = "REAL"
    try:
        assert config.impl_mode("content_reducer") == "real"
    finally:
        del os.environ["LITERACY_AGENT_IMPL"]


def test_per_agent_env_overrides_global(monkeypatch):
    monkeypatch.setenv("LITERACY_AGENT_IMPL", "stub")
    monkeypatch.setenv("LITERACY_CONTENT_REDUCER_IMPL", "real")
    assert config.impl_mode("content_reducer") == "real"


def test_resolve_returns_stub_by_default():
    impl = config.resolve_impl("content_reducer", stub=_stub_marker, real=_real_marker)
    assert impl is _stub_marker


def test_resolve_returns_real_when_selected_and_registered(monkeypatch):
    monkeypatch.setenv("LITERACY_CONTENT_REDUCER_IMPL", "real")
    impl = config.resolve_impl("content_reducer", stub=_stub_marker, real=_real_marker)
    assert impl is _real_marker


def test_resolve_falls_back_to_stub_when_real_missing(monkeypatch):
    """real을 골랐지만 실제 구현이 없으면 stub으로 폴백한다(데모 보호)."""
    monkeypatch.setenv("LITERACY_CONTENT_REDUCER_IMPL", "real")
    impl = config.resolve_impl("content_reducer", stub=_stub_marker, real=None)
    assert impl is _stub_marker


def test_client_uses_real_impl_when_selected(monkeypatch):
    """content_reducer real 선택 시 2번 실구현(이식본)이 실행된다.

    LLM 게이트웨이 키가 없으면 재구성은 데모로 안전 강등되지만, 결정론 파이프라인
    (가독성·청킹·RAG 용어검색)은 실제로 돈다. 계약(chunks/simplified_text/terms/
    difficulty_score)을 지키고, chunk_id는 2번 형식(chunk_{document_id}_NN)이다.
    """
    monkeypatch.setenv("LITERACY_CONTENT_REDUCER_IMPL", "real")
    monkeypatch.setenv("CONTENT_REDUCER_MODE", "real")
    # LLM 게이트웨이 키 제거 → 재구성은 데모 폴백(네트워크 호출 없음)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("SNOWCHAT_API_KEY", raising=False)

    result = run_content_reducer(_state())

    # 스텁의 chunk_01이 아니라 2번 ChunkDict 형식
    assert result["chunks"][0]["chunk_id"].startswith("chunk_doc1_")
    # 계약 필드 충족
    assert isinstance(result["simplified_text"], str) and result["simplified_text"]
    assert isinstance(result["terms"], list)
    assert 0.0 <= result["difficulty_score"] <= 100.0
