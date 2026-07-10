/**
 * NudgeController — 6/24 신규 생성 (폐루프 핵심)
 *
 * focusScore를 구독해 nudgeLevel을 자동으로 결정하고,
 * 적절한 Nudge 컴포넌트 + QuizCard를 조건부 렌더링한다.
 *
 * [집중도 → 개입 단계 매핑]
 *   focusScore >= 80  → none   (개입 없음)
 *   focusScore 60~79  → soft   (SoftNudge: 가벼운 환기)
 *   focusScore 40~59  → medium (MediumNudge: 요약 힌트 + 퀴즈 권유)
 *   focusScore < 40   → hard   (HardNudge + QuizCard: 락다운)
 *
 * 데모 시연 시: 우측 패널 하단 [집중도 시뮬] 버튼으로 focusScore를 직접 낮출 수 있음.
 * (NudgeController는 ReadingPage 안에 배치)
 *
 * TODO 7/6: ③번 WebSocket InterventionCommand에서 nudgeLevel 수신 시 직접 setNudgeLevel 호출
 */
import React, { useEffect } from 'react';
import { useFocusStore } from '../../stores/focusStore';
import SoftNudge from '../nudge/SoftNudge';
import MediumNudge from '../nudge/MediumNudge';
import HardNudge from '../nudge/HardNudge';
import QuizCard from '../quiz/QuizCard';

export const NudgeController: React.FC = () => {
  const { focusScore, showNudge, dismissNudge, isNudgeVisible } = useFocusStore();

  useEffect(() => {
    // 7/6 추가: 서버 개입 명령(REST/WS)이 상태를 제어하므로
    // 로컬에서의 자동 집중도 기반 넛지 판단은 바이패스(우회)합니다.
    // (backend polling in ReadingPage handles the logic)
  }, [focusScore, showNudge, dismissNudge, isNudgeVisible]);

  // nudgeLevel은 focusStore에서 관리되므로 여기서는 렌더만 담당
  return (
    <>
      {/* 3단계 Nudge — focusStore.nudgeLevel 기반 AnimatePresence 내부에서 처리 */}
      <SoftNudge />
      <MediumNudge />
      <HardNudge />

      {/* QuizCard — focusStore.isQuizVisible 구독 (portal-like 고정 팝업) */}
      <QuizCard />
    </>
  );
};

export default NudgeController;
