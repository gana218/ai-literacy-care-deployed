/**
 * LandingPage — '/home'
 * 온보딩 이후 모드 선택 화면.
 *  - 실시간 케어 ON : 인앱 리더에서 집중도 추적 + 넛지 + 퀴즈 (데모 메인)
 *  - 페이지 업로드   : URL/텍스트를 붙여넣어 내 문서로 케어
 *  - 확장 설치 CTA   : 실제 크롬/PDF 브라우징에 케어 적용
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionConfig } from '../stores/sessionConfigStore';

export default function LandingPage() {
  const navigate = useNavigate();
  const userId = useSessionConfig((s) => s.userId);
  const setMode = useSessionConfig((s) => s.setMode);
  const clearUpload = useSessionConfig((s) => s.clearUpload);

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 모드 선택';
  }, []);

  const startCare = () => {
    setMode('care');
    clearUpload();
    navigate('/reading');
  };

  const goUpload = () => navigate('/upload');

  const shortId = userId ? userId.replace('u_anon_', '').slice(0, 8) : 'guest';

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
    >
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl select-none">🧠</span>
            <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              AI 리터러시 케어
            </span>
          </div>
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
            style={{ backgroundColor: 'var(--color-surface-alt)', border: '1px solid var(--color-border)' }}
          >
            <span>🕶️</span>
            <span style={{ color: 'var(--color-text-secondary)' }}>익명</span>
            <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)' }}>#{shortId}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: 'var(--tracking-kr)' }}>
          어떻게 케어를 시작할까요?
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          읽을 콘텐츠를 고르면 실시간으로 집중도를 측정하고 맞춤 개입을 제공합니다.
        </p>

        {/* 모드 카드 2개 */}
        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <ModeCard
            emoji="⚡"
            title="실시간 케어 ON"
            desc="준비된 데모 글로 바로 시작. 스크롤·집중도를 추적해 넛지와 퀴즈가 실시간으로 뜹니다."
            badge="가장 빠른 체험"
            accent="var(--color-engagement)"
            onClick={startCare}
          />
          <ModeCard
            emoji="📄"
            title="페이지 업로드"
            desc="읽고 싶은 기사 URL이나 텍스트를 붙여넣으면, 그 문서를 가져와 똑같이 케어합니다."
            badge="내 문서로"
            accent="var(--color-primary)"
            onClick={goUpload}
          />
        </div>

        {/* 확장 설치 CTA */}
        <div
          className="rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center gap-4"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)' }}
        >
          <div className="text-3xl select-none">🧩</div>
          <div className="flex-1">
            <div className="font-semibold mb-0.5">실제 브라우징에도 케어를 적용하려면?</div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-normal)' }}>
              크롬 확장 프로그램을 설치하면 <b style={{ color: 'var(--color-text)' }}>내가 실제로 보는 웹페이지·PDF</b>에서
              집중도 측정과 퀴즈 개입이 그대로 작동합니다.
            </p>
          </div>
          <button
            onClick={() => navigate('/upload?ext=1')}
            className="shrink-0 px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary-tint)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
          >
            확장 설치 안내
          </button>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/profile')}
            className="text-sm underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            📊 내 성장 대시보드 보기
          </button>
        </div>
      </div>
    </div>
  );
}

function ModeCard({
  emoji,
  title,
  desc,
  badge,
  accent,
  onClick,
}: {
  emoji: string;
  title: string;
  desc: string;
  badge: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl border p-6 transition-transform hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        cursor: 'pointer',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-3xl select-none">{emoji}</span>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'var(--color-surface-alt)', color: accent, border: `1px solid ${accent}` }}
        >
          {badge}
        </span>
      </div>
      <div className="font-semibold text-lg mb-1" style={{ letterSpacing: 'var(--tracking-kr)' }}>
        {title}
      </div>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-normal)' }}>
        {desc}
      </p>
      <div className="mt-4 text-sm font-medium" style={{ color: accent }}>
        선택하기 →
      </div>
    </button>
  );
}
