from typing import List, Dict, Any, Tuple

def _scroll_velocity(event: Dict[str, Any]) -> float:
    """스크롤 속도(px/s)를 이벤트에서 정규화해 읽는다.
    - 확장(tracker.js): 최상위 velocity 미제공(대신 duration_ms=스크롤 간격)
    - 웹(ReadingPane): metadata.payload.scrollVelocity 에 담겨 옴
    """
    v = event.get("velocity")
    if v is None:
        meta = event.get("metadata") or {}
        payload = meta.get("payload") if isinstance(meta, dict) else None
        if isinstance(payload, dict):
            v = payload.get("scrollVelocity")
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def calculate_focus_score(events: List[Dict[str, Any]], baseline_speed: float = None) -> float:
    """
    행동 이벤트 리스트를 분석하여 0~100 사이의 실시간 집중도(Focus Score)를 계산합니다.
    baseline_speed(초당 읽는 글자 수)가 주어지면 속도 임계값을 조절합니다.
    """
    if not events:
        return 100.0

    recent = events[-12:]
    score = 100.0

    # 기본 기준: 15자/초 일 때 스크롤 속도 1500px/s 이상이면 스키밍으로 판정
    base_chars_per_sec = 15.0
    velocity_threshold = 1500.0
    if baseline_speed and baseline_speed > 0:
        velocity_threshold = 1500.0 * (baseline_speed / base_chars_per_sec)

    for event in recent:
        etype = event.get("type")

        if etype == "blur":
            duration = event.get("duration_ms")
            if duration is None:
                duration = 3000
            score -= 20.0 + min((duration / 1000.0) * 2.0, 15.0)

        elif etype == "scroll":
            duration = event.get("duration_ms")
            velocity = _scroll_velocity(event)
            too_fast_interval = duration is not None and duration < 250
            too_fast_velocity = velocity > velocity_threshold
            if too_fast_interval or too_fast_velocity:
                score -= 8.0

        elif etype == "pause":
            # 무동작이 임계 시간 이상 지속(멍때림·이탈)
            score -= 18.0

        elif etype == "dwell":
            meta = event.get("metadata") or {}
            payload = meta.get("payload") if isinstance(meta, dict) else None
            dwell_ms = None
            if isinstance(payload, dict):
                dwell_ms = payload.get("dwellMs")
            if dwell_ms is None:
                dwell_ms = event.get("duration_ms") or 0
            # 한 단락에 지나치게 오래 머무름 = 집중이 흐트러진 정체 상태
            if dwell_ms > 20000:
                score -= 12.0

        # focus(복귀)·정상 스크롤·적정 dwell 은 감점하지 않음

    return round(max(0.0, min(100.0, score)), 1)

def determine_intervention(focus_score: float) -> Tuple[bool, str, str]:
    """
    Focus Score에 따라 개입(Intervention) 여부 및 피드백 메시지를 결정합니다.
    """
    if focus_score >= 75.0:
        return False, "none", ""
    elif 50.0 <= focus_score < 75.0:
        return True, "soft", "핵심 문장을 다시 한번 살펴볼까요? 📌"
    elif 30.0 <= focus_score < 50.0:
        return True, "medium", "잠깐! 조금 쉬었다가 다시 읽어보는 건 어때요? ☕"
    else:
        return True, "hard", "집중이 필요해요! 간단한 퀴즈로 내용을 확인해봐요! 📝"
