from backend.evaluation.metrics import calculate_literacy_score


def test_calculate_score():
    score = calculate_literacy_score(
        comprehension_score=90,
        focus_score=80,
        challenge_score=70,
    )

    assert score == 82.0

def test_zero_score():
    score = calculate_literacy_score(
        comprehension_score=0,
        focus_score=0,
        challenge_score=0,
    )

    assert score == 0

def test_negative_score():
    score = calculate_literacy_score(
        comprehension_score=-10,
        focus_score=20,
        challenge_score=30,
    )

    assert score == 9.0

def test_penalty_score():
    score = calculate_literacy_score(
        comprehension_score=90,
        focus_score=80,
        challenge_score=70,
        penalty=5,
    )

    assert score == 77.0
