import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function BottomTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePath = location.pathname;
  const { user, isAuthenticated } = useAuthStore();

  const shortId = user?.nickname || '사용자';

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[40] border-t flex justify-around items-center h-16 px-6"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.05)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* 🧠 AI 리터러시 케어 버튼 (Home) */}
      <button
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-200 text-sm font-semibold cursor-pointer"
        style={{
          backgroundColor: activePath === '/home' ? 'var(--color-primary-tint)' : 'transparent',
          color: activePath === '/home' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          border: activePath === '/home' ? '1px solid var(--color-primary)' : '1px solid transparent',
        }}
      >
        <span className="text-lg">🧠</span> AI 리터러시 케어
      </button>

      {/* 👤 내 프로필 버튼 (Profile) */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-200 text-sm font-semibold cursor-pointer"
        style={{
          backgroundColor: activePath === '/profile' ? 'var(--color-primary-tint)' : 'transparent',
          color: activePath === '/profile' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
          border: activePath === '/profile' ? '1px solid var(--color-primary)' : '1px solid transparent',
        }}
      >
        <span className="text-lg">{isAuthenticated ? '👤' : '🕶️'}</span>
        {isAuthenticated ? `${shortId}` : '내 프로필'}
      </button>
    </div>
  );
}
