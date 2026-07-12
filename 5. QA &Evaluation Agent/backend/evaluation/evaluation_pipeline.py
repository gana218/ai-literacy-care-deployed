from backend.evaluation.metrics import (
    calculate_faithfulness_score,
    calculate_relevance_score,
    calculate_average,
    is_passed,
)


# 단어 중첩 기반 휴리스틱 평가 기준
# 절대 품질 점수가 아니라 골든셋 내 상대 비교 및 회귀 감지용
PASS_THRESHOLD = 0.30


def _extract_quiz_questions(state: dict) -> list[str]:
    quizzes = state.get("quizzes") or {}

    if isinstance(quizzes, dict):
        quiz_items = quizzes.values()
    elif isinstance(quizzes, list):
        quiz_items = quizzes
    else:
        quiz_items = []

    questions = []

    for quiz in quiz_items:
        if not isinstance(quiz, dict):
            continue

        question = quiz.get("question") or quiz.get("statement") or ""

        if question:
            questions.append(question)

    return questions


def _extract_chunk_text(state: dict, field: str) -> str:
    chunks = state.get("chunks") or []

    if isinstance(chunks, dict):
        chunk_items = chunks.values()
    elif isinstance(chunks, list):
        chunk_items = chunks
    else:
        chunk_items = []

    values = []

    for chunk in chunk_items:
        if not isinstance(chunk, dict):
            continue

        value = chunk.get(field, "")
        if value:
            values.append(value)

    return " ".join(values)


def run_evaluation(sample: dict) -> dict:
    """
    Golden Dataset 한 개를 평가한다.
    """

    raw_text = sample.get("raw_text", "")
    quiz = sample.get("expected_quiz", {})

    if isinstance(quiz, dict):
        question = quiz.get("question", "")
    else:
        question = str(quiz)

    expected_answer = (
        sample.get("expected_answer")
        or sample.get("expected_summary")
        or ""
    )

    relevance_answer = expected_answer

    if isinstance(quiz, dict):
        explanation = quiz.get("explanation", "")
        options = quiz.get("options", [])
        correct_option = quiz.get("correct_option")

        if (
            isinstance(options, list)
            and isinstance(correct_option, int)
            and 1 <= correct_option <= len(options)
        ):
            relevance_answer = f"{relevance_answer} {options[correct_option - 1]}"

        if explanation:
            relevance_answer = f"{relevance_answer} {explanation}"

    faithfulness = calculate_faithfulness_score(
        expected=raw_text,
        actual=expected_answer,
    )

    relevance = calculate_relevance_score(
        question=question,
        answer=relevance_answer,
    )

    average_score = calculate_average(
        [faithfulness, relevance]
    )

    return {
        "faithfulness": faithfulness,
        "relevance": relevance,
        "average_score": average_score,
        "threshold": PASS_THRESHOLD,
        "passed": is_passed(
            average_score,
            threshold=PASS_THRESHOLD,
        ),
    }


def run_evaluation_pipeline(sample=None):
    """
    테스트용 평가 파이프라인
    """

    if sample is None:
        sample = {
            "raw_text": "머신러닝은 데이터를 통해 학습한다.",
            "expected_quiz": {
                "question": "머신러닝은 무엇을 통해 학습하는가?"
            },
            "expected_answer": "머신러닝은 데이터를 통해 학습한다.",
        }

    return run_evaluation(sample)


def run_evaluation_from_state(state: dict) -> dict:
    """
    Orchestrator의 ReadingSessionState를 받아
    QA 평가를 수행한다.
    """

    questions = _extract_quiz_questions(state)

    raw_text = state.get("raw_text", "") or _extract_chunk_text(
        state,
        "original_text",
    )
    simplified_text = state.get("simplified_text", "") or _extract_chunk_text(
        state,
        "summary",
    )

    sample = {
        "raw_text": raw_text,
        "expected_quiz": {
            "question": " ".join(questions)
        },
        "expected_answer": simplified_text,
    }

    report = run_evaluation(sample)

    report["session_id"] = state.get("session_id")
    report["document_id"] = state.get("document_id")
    report["quiz_count"] = len(questions)
    report["has_trace"] = len(state.get("trace", [])) > 0
    report["has_errors"] = len(state.get("errors", [])) > 0

    return report
