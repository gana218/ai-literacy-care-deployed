import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';
import ReadingPage from '../pages/ReadingPage';
import DashboardPage from '../pages/DashboardPage';
import OnboardingPage from '../pages/OnboardingPage';
import LandingPage from '../pages/LandingPage';
import UploadPage from '../pages/UploadPage';
import ProfilePage from '../pages/ProfilePage';
import { isOnboarded } from '../stores/sessionConfigStore';

/**
 * 앱 라우터 정의 (배포 흐름)
 * /            → 온보딩 여부에 따라 /onboarding 또는 /home 으로 분기
 * /onboarding  → 익명 로그인 + 개인정보 동의 (풀스크린)
 * /home        → 모드 선택 랜딩 (실시간 케어 / 업로드 / 확장) (풀스크린)
 * /upload      → 페이지 업로드 (풀스크린)
 * /reading     → 읽기 화면 (헤더 레이아웃)
 * /dashboard   → 성장 대시보드 (헤더 레이아웃)
 * /profile     → 익명 프로필 + 대시보드 (헤더 레이아웃)
 */
function IndexRedirect() {
  return <Navigate to={isOnboarded() ? '/home' : '/onboarding'} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <IndexRedirect /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/home', element: <LandingPage /> },
  { path: '/upload', element: <UploadPage /> },
  {
    element: <RootLayout />,
    children: [
      { path: '/reading', element: <ReadingPage /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
