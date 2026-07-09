/**
 * ProfilePage — '/profile'
 * 익명 프로필 요약 + 성장 대시보드.
 * 데이터 초기화(익명 ID 폐기) 및 새 세션 시작 진입점을 제공한다.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionConfig } from '../stores/sessionConfigStore';
import DashboardPage from './DashboardPage';

export default function ProfilePage() {
  const navigate = useNavigate();
  const userId = useSessionConfig((s) => s.userId);
  const reset = useSessionConfig((s) => s.reset);

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 내 프로필';
  }, []);

  const shortId = userId ? userId.replace('u_anon_', '').slice(0, 8) : 'guest';

  const handleReset = () => {
    const ok = window.confirm('익명 ID와 읽기 기록을 초기화할까요? 되돌릴 수 없습니다.');
    if (!ok) return;
    reset();
    navigate('/onboarding', { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* 프로필 밴드 */}
      <div
        className="rounded-xl border p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', boxShadow: 'var(--shadow-sm)', fontFamily: 'var(--font-sans)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{ backgroundColor: 'var(--color-primary-tint)' }}
        >
          🕶️
        </div>
        <div className="flex-1">
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>익명 사용자</div>
          <div className="font-semibold text-lg tabular-nums">#{shortId}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary-tint)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}
          >
            ＋ 새 세션
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md text-sm font-medium"
            style={{ backgroundColor: 'transparent', color: 'var(--color-danger)', border: '1px solid var(--color-danger)' }}
          >
            데이터 초기화
          </button>
        </div>
      </div>

      {/* 대시보드 본문 (기존 컴포넌트 재사용) */}
      <DashboardPage />
    </div>
  );
}
