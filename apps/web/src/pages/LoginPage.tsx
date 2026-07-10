import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/common/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, isLoading, error, setError } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 로그인';
    setError(null); // 진입 시 에러 초기화
  }, [setError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      await signIn(email, password);
      // 로그인 성공 시 대시보드로 이동
      navigate('/dashboard', { replace: true });
    } catch (err) {
      // 에러는 스토어 내부에서 set하므로 무시
    }
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
        {/* 타이틀 */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3 select-none">🔑</div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--color-primary)', letterSpacing: 'var(--tracking-kr)' }}
          >
            초기 등록자 로그인
          </h1>
          <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            AI 리터러시 케어 베타 서비스 로그인을 진행해 주세요.
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg p-3.5 mb-5 text-xs text-center border border-red-500/20 font-semibold"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#ef4444' }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              이메일 주소
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm"
              style={{
                backgroundColor: 'var(--color-surface-alt)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>
              비밀번호
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3.5 py-2.5 text-sm"
              style={{
                backgroundColor: 'var(--color-surface-alt)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text)',
                outline: 'none',
              }}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading || !email || !password}
            style={{ marginTop: '10px' }}
          >
            {isLoading ? '로그인 중...' : '로그인 하기'}
          </Button>
        </form>

        <div className="mt-6 text-center text-xs text-muted">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-semibold text-blue-500 hover:underline">
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}
