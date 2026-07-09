/**
 * OnboardingPage — '/onboarding'
 * 링크 진입 첫 화면: 익명 로그인 + 개인정보 처리 동의
 * 별도 계정/이메일 없이 익명 UUID를 발급받아 시작한다.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionConfig } from '../stores/sessionConfigStore';
import { Button } from '../components/common/Button';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const onboard = useSessionConfig((s) => s.onboard);
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 시작하기';
  }, []);

  const handleStart = () => {
    if (!agreed) return;
    onboard();
    navigate('/home', { replace: true });
  };

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
          onClick={handleStart}
          style={{ opacity: agreed ? 1 : 0.5, cursor: agreed ? 'pointer' : 'not-allowed' }}
        >
          익명으로 시작하기 →
        </Button>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          시작하면 익명 ID가 발급되고 곧바로 케어를 이용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
