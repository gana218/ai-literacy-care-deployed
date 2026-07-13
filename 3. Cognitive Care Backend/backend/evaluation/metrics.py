import re
from typing import List


def _normalize_text(text: str) -> str:
    return re.sub(r"[^0-9a-zA-Z가-힣]+", "", text.lower())


def _char_ngrams(text: str, size: int = 2) -> set[str]:
    normalized = _normalize_text(text)

    if not normalized:
        return set()

    if len(normalized) <= size:
        return {normalized}

    return {
        normalized[index:index + size]
        for index in range(len(normalized) - size + 1)
    }


def _word_tokens(text: str) -> set[str]:
    return {
        token.strip(".,!?()[]{}'\"")
        for token in text.lower().split()
        if token.strip(".,!?()[]{}'\"")
    }


def calculate_average(scores: List[float]) -> float:
    """
    여러 평가 점수의 평균을 계산한다.
    """
    if not scores:
        return 0.0
    return round(sum(scores) / len(scores), 4)


def calculate_faithfulness_score(expected: str, actual: str) -> float:
    """
    실제 생성 문장의 단어 중 원문에 근거한 단어 비율로 충실도를 계산한다.
    무료 평가용 간단 휴리스틱이다.
    """
    if not expected or not actual:
        return 0.0

    expected_words = _word_tokens(expected)
    actual_words = _word_tokens(actual)

    if not actual_words:
        return 0.0

    matched_words = expected_words.intersection(actual_words)
    word_score = len(matched_words) / len(actual_words)

    expected_grams = _char_ngrams(expected)
    actual_grams = _char_ngrams(actual)

    if not actual_grams:
        return round(word_score, 4)

    char_score = len(expected_grams.intersection(actual_grams)) / len(actual_grams)
    score = max(word_score, char_score)

    return round(score, 4)


def calculate_relevance_score(question: str, answer: str) -> float:
    """
    질문과 답변의 단어 겹침 비율로 관련성을 계산한다.
    """
    if not question or not answer:
        return 0.0

    question_words = _word_tokens(question)
    answer_words = _word_tokens(answer)

    if not question_words:
        return 0.0

    matched_words = question_words.intersection(answer_words)
    word_score = len(matched_words) / len(question_words)

    question_grams = _char_ngrams(question)
    answer_grams = _char_ngrams(answer)

    if not question_grams:
        return round(word_score, 4)

    char_score = len(question_grams.intersection(answer_grams)) / len(question_grams)
    score = max(word_score, char_score)

    return round(score, 4)


def calculate_accuracy(correct_count: int, total_count: int) -> float:
    """
    퀴즈 정답률을 계산한다.
    """
    if total_count == 0:
        return 0.0

    return round(correct_count / total_count, 4)


def is_passed(score: float, threshold: float = 0.8) -> bool:
    """
    기준 점수 이상이면 통과로 판단한다.
    """
    return score >= threshold

def calculate_literacy_score(
    comprehension_score: float,
    focus_score: float,
    challenge_score: float,
    penalty: float = 0.0,
) -> float:
    """
    리터러시 v2 공식으로 Literacy Score를 계산한다.

    Literacy Score = 이해도 45% + 집중 30% + 도전성취 25% - 감점
    """
    score = (
        comprehension_score * 0.45
        + focus_score * 0.30
        + challenge_score * 0.25
        - penalty
    )

    return round(score, 1)
