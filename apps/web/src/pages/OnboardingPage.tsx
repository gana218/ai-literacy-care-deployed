/**
 * OnboardingPage — '/onboarding'
 * 링크 진입 첫 화면: 익명 로그인 + 개인정보 처리 동의 + 속도 측정 튜토리얼
 * 별도 계정/이메일 없이 익명 UUID를 발급받아 시작한다.
 * 
 * [7/11] 멘토링 피드백 반영:
 * 동의 후 샘플 텍스트(쉬운/어려운)를 읽게 하여 개인별 기준 스크롤 속도를 측정한다.
 * 측정된 속도는 localStorage에 저장되어 이후 집중도 판별에 활용된다. (스포티파이 취향 측정 벤치마킹)
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionConfig } from '../stores/sessionConfigStore';
import { Button } from '../components/common/Button';

// ── 캘리브레이션용 샘플 텍스트 ──
const SAMPLE_TEXTS = [
  {
    level: '쉬운 글',
    emoji: '📗',
    title: '인공지능이란 무엇일까?',
    content: `인공지능(AI)은 컴퓨터가 사람처럼 생각하고 배울 수 있도록 만드는 기술입니다. 예를 들어, 스마트폰의 음성 비서는 우리가 말하는 것을 알아듣고 적절한 대답을 해줍니다. 이것은 인공지능이 우리의 말을 이해하도록 학습했기 때문입니다.

인공지능은 크게 두 가지로 나눌 수 있습니다. 하나는 '약한 인공지능'으로, 특정한 일만 잘하는 AI입니다. 체스를 두거나 날씨를 예측하는 것이 여기에 해당합니다. 다른 하나는 '강한 인공지능'으로, 사람처럼 다양한 상황에서 스스로 판단할 수 있는 AI입니다. 하지만 강한 인공지능은 아직 실현되지 않았습니다.`,
  },
  {
    level: '어려운 글',
    emoji: '📕',
    title: '대규모 언어 모델(LLM)의 추론 메커니즘',
    content: `대규모 언어 모델(Large Language Model, LLM)은 트랜스포머(Transformer) 아키텍처를 기반으로, 자기회귀적(autoregressive) 방식으로 다음 토큰을 예측하는 확률 모델이다. 학습 과정에서 모델은 수십억 개의 파라미터를 통해 자연어의 통계적 패턴을 내재화하며, 이로 인해 문맥 의존적 추론(contextual reasoning)이 가능해진다.

그러나 LLM의 추론 능력에는 본질적 한계가 존재한다. 환각 현상(hallucination)은 모델이 학습 데이터에 없는 사실을 그럴듯하게 생성하는 문제로, 이는 소프트맥스 함수의 확률 분포가 항상 비영(non-zero) 값을 가지기 때문에 발생한다. 또한 인과적 추론(causal reasoning)과 상관적 패턴 매칭(correlational pattern matching)을 구분하지 못하는 구조적 제약이 있다.`,
  },
];

type OnboardingStep = 'consent' | 'calibration' | 'done';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const onboard = useSessionConfig((s) => s.onboard);
  const setBaselineSpeed = useSessionConfig((s) => s.setBaselineSpeed);
  const [agreed, setAgreed] = useState(false);
  const [step, setStep] = useState<OnboardingStep>('consent');
  const [currentSample, setCurrentSample] = useState(0);
  const [readingSpeeds, setReadingSpeeds] = useState<number[]>([]);
  const [isReading, setIsReading] = useState(false);
  const readStartTime = useRef<number>(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 시작하기';
  }, []);

  // Step 1: 동의 완료 → 캘리브레이션 단계로
  const handleConsentDone = () => {
    if (!agreed) return;
    onboard();
    setStep('calibration');
  };

  // Step 2: 읽기 시작
  const handleStartReading = () => {
    setIsReading(true);
    readStartTime.current = Date.now();
    // 스크롤을 맨 위로
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  // Step 2: 다 읽음 버튼
  const handleDoneReading = useCallback(() => {
    const elapsed = (Date.now() - readStartTime.current) / 1000; // 초
    const textLength = SAMPLE_TEXTS[currentSample].content.length;
    const speed = textLength / elapsed; // 글자/초
    
    setReadingSpeeds((prev) => [...prev, speed]);
    setIsReading(false);

    if (currentSample < SAMPLE_TEXTS.length - 1) {
      // 다음 샘플로
      setCurrentSample((prev) => prev + 1);
    } else {
      // 모든 샘플 완료 → 평균 속도 계산 및 저장
      const allSpeeds = [...readingSpeeds, speed];
      const avgSpeed = allSpeeds.reduce((a, b) => a + b, 0) / allSpeeds.length;
      setBaselineSpeed(Math.round(avgSpeed * 100) / 100);
      setStep('done');
    }
  }, [currentSample, readingSpeeds, setBaselineSpeed]);

  // Step 3: 완료 → 홈으로
  const handleFinish = () => {
    navigate('/home', { replace: true });
  };

  // ── Step 1: 동의 화면 ──
  if (step === 'consent') {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl border p-8"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-md, 0 8px 30px rgba(0,0,0,0.08))',
          }}
        >
          {/* 로고 / 타이틀 */}
          <div className="text-center mb-6">
            <div className="text-4xl mb-3 select-none">🧠</div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--color-primary)', letterSpacing: 'var(--tracking-kr)' }}
            >
              AI 리터러시 케어
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              GPT는 글을 대신 읽어주지만,<br />우리는 당신의 <b style={{ color: 'var(--color-text)' }}>문해력 성장</b>을 관리합니다.
            </p>
          </div>

          {/* 익명 로그인 안내 */}
          <div
            className="rounded-lg p-4 mb-4 text-sm"
            style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 font-semibold mb-1">
              <span>🕶️</span>
              <span>익명으로 시작</span>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-normal)' }}>
              이메일·비밀번호 없이 <b style={{ color: 'var(--color-text)' }}>익명 ID</b>가 자동 발급됩니다.
              읽기 기록은 이 브라우저에만 연결되며 언제든 초기화할 수 있습니다.
            </p>
          </div>

          {/* 개인정보 처리 동의 */}
          <div
            className="rounded-lg p-4 mb-5 text-xs"
            style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            <div className="font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              📋 개인정보 처리 안내
            </div>
            <ul className="space-y-1 list-disc pl-4">
              <li>수집 항목: 익명 ID, 읽기 행동(스크롤·체류·이탈), 퀴즈 응답</li>
              <li>수집 목적: 실시간 집중도 분석 및 문해력 성장 리포트 제공</li>
              <li>보관/파기: 브라우저 로컬 및 데모 서버, 세션 초기화 시 삭제</li>
              <li>제3자 제공 없음 · 민감정보 미수집</li>
            </ul>
          </div>

          {/* 동의 체크 */}
          <label className="flex items-start gap-2 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--color-primary)' }}
            />
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>
              위 개인정보 처리 안내를 확인했으며, 익명 데이터 수집에 동의합니다. <span style={{ color: 'var(--color-danger)' }}>(필수)</span>
            </span>
          </label>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!agreed}
            onClick={handleConsentDone}
            style={{ opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
          >
            동의 후 튜토리얼 시작 →
          </Button>

          <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            다음 단계에서 짧은 글 2개를 읽어 평소 읽기 속도를 측정합니다.
          </p>
        </div>
      </div>
    );
  }

  // ── Step 2: 캘리브레이션 (속도 측정) ──
  if (step === 'calibration') {
    const sample = SAMPLE_TEXTS[currentSample];
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-10"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
      >
        <div
          className="w-full max-w-lg rounded-2xl border p-8"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-md, 0 8px 30px rgba(0,0,0,0.08))',
          }}
        >
          {/* 진행률 */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-primary)' }}>
              📏 읽기 속도 측정
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {currentSample + 1} / {SAMPLE_TEXTS.length}
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div style={{ height: '4px', borderRadius: '2px', backgroundColor: 'var(--color-surface-alt)', marginBottom: '16px' }}>
            <div
              style={{
                height: '100%',
                borderRadius: '2px',
                backgroundColor: 'var(--color-primary)',
                width: `${((currentSample + (isReading ? 0.5 : 0)) / SAMPLE_TEXTS.length) * 100}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>

          {/* 샘플 정보 */}
          <div
            className="rounded-lg p-3 mb-4"
            style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{sample.emoji}</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {sample.level}: {sample.title}
              </span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {isReading ? '평소처럼 편하게 읽어주세요. 다 읽으면 아래 버튼을 눌러주세요.' : '아래 \'읽기 시작\' 버튼을 누르면 글이 나타납니다.'}
            </p>
          </div>

          {/* 본문 텍스트 */}
          {isReading && (
            <div
              ref={contentRef}
              className="rounded-lg p-5 mb-5"
              style={{
                backgroundColor: '#fffbf0',
                border: '1px solid var(--color-border)',
                maxHeight: '280px',
                overflowY: 'auto',
                fontSize: 'var(--text-sm)',
                lineHeight: '1.8',
                letterSpacing: 'var(--tracking-kr)',
                color: 'var(--color-text)',
                whiteSpace: 'pre-wrap',
              }}
            >
              {sample.content}
            </div>
          )}

          {/* 버튼 */}
          {!isReading ? (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartReading}
            >
              📖 읽기 시작
            </Button>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleDoneReading}
              style={{ backgroundColor: 'var(--color-engagement)' }}
            >
              ✅ 다 읽었습니다
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3: 완료 ──
  const avgSpeed = readingSpeeds.length > 0
    ? Math.round(readingSpeeds.reduce((a, b) => a + b, 0) / readingSpeeds.length * 10) / 10
    : 0;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          boxShadow: 'var(--shadow-md, 0 8px 30px rgba(0,0,0,0.08))',
        }}
      >
        <div className="text-5xl mb-4 select-none">🎉</div>
        <h2
          className="text-lg font-bold mb-2"
          style={{ color: 'var(--color-primary)' }}
        >
          준비 완료!
        </h2>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
          개인별 읽기 프로파일이 생성되었습니다.
        </p>

        {/* 측정 결과 카드 */}
        <div
          className="rounded-lg p-4 mb-6"
          style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>평균 읽기 속도</span>
            <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{avgSpeed} 글자/초</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>측정 완료</span>
            <span className="text-sm font-bold" style={{ color: 'var(--color-engagement)' }}>{readingSpeeds.length}개 샘플</span>
          </div>
        </div>

        <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)', lineHeight: 'var(--leading-relaxed)' }}>
          이 속도를 기준으로 글을 읽을 때 집중도를 측정합니다.<br/>
          평소와 크게 다른 패턴이 감지되면 맞춤형 넛지가 개입합니다.
        </p>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleFinish}
        >
          🚀 리터러시 케어 시작하기
        </Button>
      </div>
    </div>
  );
}
