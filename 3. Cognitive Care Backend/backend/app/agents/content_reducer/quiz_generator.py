"""
quiz_generator.py — 문맥 맞춤형 퀴즈 생성기 (M2)

집중도 저하 등의 개입 상황이 발생했을 때,
사용자가 읽은 청크의 텍스트(context)를 기반으로 내용 이해도를 평가하는 O/X(참/거짓) 퀴즈를 생성한다.

설계 요구사항:
  1. LLM을 사용하여 문맥 맞춤형 퀴즈 생성
  2. 퀴즈 형식 검증 (4개 선택지, correct_option 1~4 범위, explanation 존재)
  3. 실패 시 Fallback 퀴즈 반환 (fallbacks.py 이용)
  4. Real, Stub, Demo 모드 지원
"""
from __future__ import annotations

import json
import os
import re

from backend.app.agents.content_reducer.contracts import QuizDict, QuizGenerationRequest
from backend.app.agents.content_reducer.fallbacks import fallback_quiz
from backend.app.agents.content_reducer.prompts import QUIZ_SYSTEM_PROMPT, build_quiz_prompt
from pathlib import Path

# ---------------------------------------------------------------------------
# 고품질 데모 폴백 데이터 로드
# ---------------------------------------------------------------------------

def _load_fallback_data() -> dict:
    try:
        root = Path(__file__).resolve().parents[4]
        path = root / "data" / "demo_fallback_data.json"
        if path.exists():
            with open(path, encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {}

_FALLBACK_DATA = _load_fallback_data()


# ---------------------------------------------------------------------------
# Gemini 클라이언트 로더 (Google AI Studio 무료)
# ---------------------------------------------------------------------------

def _get_client():
    """Gemini 클라이언트를 반환한다. 키가 없거나 패키지가 없으면 None."""
    try:
        from google import genai
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key or api_key.startswith("your_"):
            return None
        return genai.Client(api_key=api_key)
    except ImportError:
        return None


# ---------------------------------------------------------------------------
# 퀴즈 유효성 검사 (Validation)
# ---------------------------------------------------------------------------

def validate_quiz(quiz: dict) -> bool:
    """
    생성된 퀴즈의 구조가 QuizDict 계약 요건을 충족하는지 검증한다.

    검증 조건:
      - question 필드가 존재하고 문자열이어야 함
      - options 필드가 존재하고 2개(O/X) 또는 4개의 선택지를 담은 리스트여야 함
      - correct_option 필드가 존재하고 유효 범위의 정수여야 함
      - explanation 필드가 존재하고 비어있지 않은 문자열이어야 함
    """
    try:
        if not isinstance(quiz.get("question"), str) or not quiz["question"].strip():
            return False
        
        options = quiz.get("options")
        if not isinstance(options, list) or len(options) not in [2, 4]:
            return False
        for opt in options:
            if not isinstance(opt, str) or not opt.strip():
                return False
                
        correct = quiz.get("correct_option")
        valid_range = [1, 2] if len(options) == 2 else [1, 2, 3, 4]
        if not isinstance(correct, int) or correct not in valid_range:
            return False
            
        if not isinstance(quiz.get("explanation"), str) or not quiz["explanation"].strip():
            return False
            
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# 데모/시뮬레이션용 퀴즈 생성 (API 미호출)
# ---------------------------------------------------------------------------

def _generate_demo_quiz(chunk_id: str, context: str) -> QuizDict:
    """API 호출 없이 본문 키워드를 이용해 적절한 데모용 퀴즈를 자동 생성한다."""
    # 1. 고품질 데모 캐시 데이터 매칭 시도
    if _FALLBACK_DATA and "chunks" in _FALLBACK_DATA:
        # chunk_id 매칭 또는 context의 매칭 시도
        normalized_context = context.replace(" ", "").replace("\n", "")
        for entry in _FALLBACK_DATA["chunks"]:
            ref_text = entry["original_text"].replace(" ", "").replace("\n", "")
            ref_restructured = entry["restructured_text"].replace(" ", "").replace("\n", "")
            # chunk_id가 똑같거나 본문 텍스트가 겹치는 경우
            if entry["chunk_id"] == chunk_id or normalized_context in ref_text or normalized_context in ref_restructured:
                quiz_data = entry.get("quiz")
                if quiz_data:
                    return QuizDict(
                        chunk_id=chunk_id,
                        question=quiz_data["question"],
                        options=quiz_data["options"],
                        correct_option=quiz_data["correct_option"],
                        explanation=quiz_data["explanation"]
                    )

    # 2. 매칭 실패 시 O/X 시뮬레이션
    # 본문에서 핵심 키워드 검색 시도
    keywords = ["인공지능", "LLM", "RAG", "레이턴시", "메타인지", "문해력", "인지부하", "임베딩"]
    found = "본문 내용"
    for kw in keywords:
        if kw in context:
            found = kw
            break

    return QuizDict(
        chunk_id=chunk_id,
        question=f"본문에 따르면, '{found}'은(는) 독자의 학습 효율을 높이고 문해력 향상에 도움을 줄 수 있다.",
        options=["O", "X"],
        correct_option=1,
        explanation=f"본문 문맥상 '{found}' 관련 내용은 독자의 학습 효율을 높이고 문해력을 돕는 용도 또는 특징으로 설명하고 있으므로, 이 진술은 본문과 일치합니다(O)."
    )


# ---------------------------------------------------------------------------
# 공개 API
# ---------------------------------------------------------------------------

def generate_quiz(chunk_id: str, context: str) -> QuizDict:
    """
    주어진 텍스트 문맥을 분석하여 난이도와 일치하는 독해력 확인 퀴즈를 생성한다.

    Args:
        chunk_id: 문제를 생성할 청크 식별자
        context: 재구성된 청크 텍스트

    Returns:
        규격화된 QuizDict (실패 시 fallback_quiz 반환)
    """
    if not context or not context.strip():
        return fallback_quiz(chunk_id)

    # 1. Stub 또는 Demo 모드일 경우 API 없이 시뮬레이션
    mode = os.getenv("CONTENT_REDUCER_MODE", "real").lower()
    demo_mode = os.getenv("DEMO_MODE", "false").lower() == "true"
    if mode == "stub" or demo_mode:
        return _generate_demo_quiz(chunk_id, context)

    try:
        from backend.app.agents.content_reducer.snowchat_client import is_snowchat_available, _call_llm_via_snowchat
        
        if not is_snowchat_available():
            # API 키가 없으면 데모용 퀴즈 반환
            return _generate_demo_quiz(chunk_id, context)

        # 퀴즈 생성에는 gemini-2.5-flash 모델을 기본으로 사용
        model = "gemini-2.5-flash"
        prompt = build_quiz_prompt(context)

        raw_content = _call_llm_via_snowchat(
            model=model,
            prompt=prompt,
            system_instruction=QUIZ_SYSTEM_PROMPT
        )
        
        # JSON 블록 추출 파싱 ({ 로 시작해서 } 로 끝나는 부분 매칭)
        json_match = re.search(r"\{.*\}", raw_content, re.DOTALL)
        if json_match:
            quiz_data = json.loads(json_match.group(0))
        else:
            quiz_data = json.loads(raw_content)

        # 퀴즈 유효성 검사 실행
        if validate_quiz(quiz_data):
            return QuizDict(
                chunk_id=chunk_id,
                question=quiz_data["question"],
                options=quiz_data["options"],
                correct_option=quiz_data["correct_option"],
                explanation=quiz_data["explanation"]
            )
        else:
            print(f"[quiz_generator] WARNING: 생성된 퀴즈의 유효성 검사 실패. Fallback 적용. Raw: {raw_content}")
            return fallback_quiz(chunk_id)

    except Exception as exc:
        print(f"[quiz_generator] 퀴즈 생성 도중 예외 발생, fallback_quiz를 반환합니다. 원인: {exc}")
        return fallback_quiz(chunk_id)
