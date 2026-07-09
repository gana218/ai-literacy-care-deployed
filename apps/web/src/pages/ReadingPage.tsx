import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSessionConfig } from '../stores/sessionConfigStore';
import ReadingPane from '../components/reading/ReadingPane';
import FloatingControlPanel from '../components/panel/FloatingControlPanel';
import NudgeController from '../components/nudge/NudgeController';
import SessionSummaryCard from '../components/dashboard/SessionSummaryCard';
import { Card } from '../components/common/Card';
import { useReadingStore } from '../stores/readingStore';
import { useScoreEngine } from '../lib/useScoreEngine';
import { useFocusStore } from '../stores/focusStore';
import { useScoreStore } from '../stores/scoreStore';
import { api } from '../lib/api';

/**
 * ReadingPage — /reading
 * 6/24: NudgeController 연결 — 폐루프 실시간 개입 시스템
 * 6/26: useScoreEngine 연결 — 실시간 Literacy Score 계산 + 차트 자동 갱신
 *       SessionSummaryCard — 완독(progress >= 100) 시 결과 카드 표시
 */
export default function ReadingPage() {
  const progress = useReadingStore((s) => s.progress);
  const startSessionStore = useReadingStore((s) => s.startSession);
  const setProgress = useReadingStore((s) => s.setProgress);
  const setHighlights = useReadingStore((s) => s.setHighlights);
  const setTermDefinition = useReadingStore((s) => s.setTermDefinition);

  const showNudge = useFocusStore((s) => s.showNudge);
  const setActiveQuiz = useFocusStore((s) => s.setActiveQuiz);
  const showQuiz = useFocusStore((s) => s.showQuiz);
  const setFocusScore = useFocusStore((s) => s.setFocusScore);

  const clearQueue = useReadingStore((s) => s.clearQueue);

  // 6/26: Score Engine 마운트 (ReadingPage 수명 동안 실행)
  useScoreEngine();

  const navigate = useNavigate();

  // 온보딩(익명 로그인+동의) 미완료 시 진입 차단
  useEffect(() => {
    if (!useSessionConfig.getState().consentGiven) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 읽기';
  }, []);

  // 7/8: 실시간 REST /events 배치 폴링 & 개입 커맨드 처리 (WebSocket 제거)
  useEffect(() => {
    let active = true;
    let flushIntervalId: any = null;
    let currentSessionId: string | null = null;

    // 개입 명령 처리 핸들러 (Intervention Command → UI)
    const handleInterventionCommand = (command: any) => {
      if (!command) return;
      console.log('[ReadingPage] ← Received REST Intervention Command:', command);
      switch (command.type) {
        case 'nudge':
          if (command.payload.nudgeLevel) {
            showNudge(command.payload.nudgeLevel, command.payload.nudgeMessage);
          }
          break;
        case 'quiz':
          if (command.payload.quiz) {
            setActiveQuiz(command.payload.quiz);
            showQuiz();
          }
          break;
        case 'highlight':
          if (command.payload.highlights) {
            const indices = command.payload.highlights.map((h: any) => h.paragraphIndex);
            setHighlights(indices);
          }
          break;
        case 'score_update':
          if (command.payload.focusScore !== undefined) {
            setFocusScore(command.payload.focusScore);
          }
          if (command.payload.progress !== undefined) {
            setProgress(command.payload.progress);
          }
          break;
        case 'session_end':
          if (currentSessionId) {
            api.getSessionResult(currentSessionId)
              .then((scoreResult) => {
                if (!active) return;
                useScoreStore.setState({
                  isFinalized: true,
                  literacyScore: scoreResult.literacyScore,
                  comprehensionScore: scoreResult.comprehensionScore,
                  engagementScore: scoreResult.engagementScore,
                  xp: scoreResult.totalXp,
                  level: scoreResult.level,
                  scoreSeries: scoreResult.scoreSeries.map((s) => ({
                    label: s.label,
                    before: s.before,
                    after: s.after,
                  })),
                  badges: scoreResult.badges.map((b) => ({
                    id: b.id,
                    name: b.name,
                    emoji: b.emoji,
                    description: b.description,
                    acquiredAt: b.acquiredAt,
                  })),
                });
              })
              .catch((err) => {
                console.error('[ReadingPage] Failed to fetch session result:', err);
              });
          }
          setProgress(100);
          break;
        default:
          console.warn('[ReadingPage] Unknown command type:', command.type);
      }
    };

    // 큐에 있는 이벤트를 서버로 Flush 전송
    const flushQueue = async () => {
      // 컴포넌트 마운트 해제 또는 세션 ID가 없을 경우 전송하지 않음
      const currentQueue = useReadingStore.getState().eventQueue;
      if (!active || !currentSessionId || currentQueue.length === 0) return;

      // 큐 선점 비우기
      const eventsToSend = [...currentQueue];
      clearQueue();

      try {
        const cmd = await api.sendEvents(currentSessionId, eventsToSend);
        if (active) {
          handleInterventionCommand(cmd);
        }
      } catch (err) {
        console.warn('[ReadingPage] Failed to send events:', err);
      }
    };

    async function initSession() {
      try {
        const cfg = useSessionConfig.getState();
        const isUpload =
          cfg.mode === 'upload' && !!cfg.uploadedContent && cfg.uploadedContent.length > 0;
        const sessionData = await api.startSession({
          articleId: isUpload ? 'uploaded' : 'default-article',
          userId: cfg.userId ?? 'u_anon_guest',
          content: isUpload ? cfg.uploadedContent! : undefined,
        });

        if (!active) return;

        currentSessionId = sessionData.sessionId;
        // Zustand store 세션 연동 시작
        startSessionStore(sessionData.article.id, sessionData.sessionId);

        // 7/5 추가: AI RAG 설명 사전 프리페치
        const termsToPrefetch = [
          '디지털 리터러시',
          'LLM',
          '환각 현상',
          '인지부하',
          '넛지',
          'Literacy Score',
        ];

        termsToPrefetch.forEach((term) => {
          api.getTermDefinition(sessionData.sessionId, term)
            .then((res) => {
              if (active) {
                setTermDefinition(term, res.explanation);
              }
            })
            .catch((err) => {
              console.error(`[ReadingPage] Failed to prefetch term '${term}':`, err);
            });
        });

        // 1.5초(1500ms) 주기적 배치 Flush 루프 시작
        flushIntervalId = setInterval(flushQueue, 1500);
      } catch (err) {
        console.error('[ReadingPage] Failed to initialize session REST APIs:', err);
      }
    }

    initSession();

    // 큐 변경 실시간 감시 (blur 또는 dwell 이입 시 즉시 flush)
    const unsubscribeQueue = useReadingStore.subscribe((state) => {
      const queue = state.eventQueue;
      if (queue.length > 0) {
        const lastEvent = queue[queue.length - 1];
        if (lastEvent.type === 'blur' || lastEvent.type === 'dwell') {
          flushQueue();
        }
      }
    });

    return () => {
      active = false;
      if (flushIntervalId) {
        clearInterval(flushIntervalId);
      }
      unsubscribeQueue();
      // 마지막 남은 잔여 이벤트 전송 시도
      flushQueue();
    };
  }, [
    startSessionStore,
    showNudge,
    setActiveQuiz,
    showQuiz,
    setHighlights,
    setFocusScore,
    setProgress,
    clearQueue,
  ]);

  const isFinished = progress >= 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* ── 폐루프 개입 시스템 ── */}
      <NudgeController />

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* ── 좌측: 본문 읽기 영역 ── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* 읽기 진행률 바 */}
          <ReadingProgressBar progress={progress} />

          {/* 본문 패널 */}
          <ReadingPane />

          {/* 완독 시: SessionSummaryCard 슬라이드업 등장 */}
          <SessionSummaryCard isVisible={isFinished} />

          {/* 완독 전: 안내 카드 */}
          {!isFinished && (
            <Card variant="flat" className="p-4">
              <p
                className="text-xs"
                style={{
                  color: 'var(--color-text-muted)',
                  fontFamily: 'var(--font-sans)',
                  lineHeight: 'var(--leading-normal)',
                }}
              >
                <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
                  [6/26 Score Engine 작동 중]
                </span>{' '}
                스크롤할수록 Literacy Score가 실시간 계산됩니다. 25%/50%/75%/90%/완독 구간마다 대시보드 차트에 새 포인트가 추가됩니다.
                우측 패널 [집중도 시뮬]로 넛지→퀴즈 흐름을 시연하면, 퀴즈 결과도 즉시 점수에 반영됩니다.
              </p>
            </Card>
          )}
        </div>

        {/* ── 우측: 플로팅 제어판 ── */}
        <aside className="w-full lg:w-80 lg:shrink-0 lg:sticky lg:top-20 space-y-4">
          <FloatingControlPanel />
        </aside>

      </div>
    </div>
  );
}

/** 읽기 진행률 상단 바 */
function ReadingProgressBar({ progress }: { progress: number }) {
  const remainingMin = Math.max(0, Math.round((5 * (100 - progress)) / 100));

  return (
    <div
      className="rounded-lg border p-3 flex items-center gap-4"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
          읽기 진행률
        </span>
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-sans)' }}
        >
          {progress}%
        </span>
      </div>
      <div
        className="flex-1 rounded-full h-2 overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            background: progress >= 100
              ? `linear-gradient(90deg, var(--color-engagement), var(--color-growth))`
              : `linear-gradient(90deg, var(--color-primary), var(--color-engagement))`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>
        {progress >= 100 ? '🎉 완독!' : `약 ${remainingMin}분 남음`}
      </span>
      {progress > 0 && (
        <Link
          to="/dashboard"
          className="shrink-0 text-xs px-2 py-1 rounded"
          style={{
            backgroundColor: 'var(--color-primary-tint)',
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          📊 점수 보기
        </Link>
      )}
    </div>
  );
}
