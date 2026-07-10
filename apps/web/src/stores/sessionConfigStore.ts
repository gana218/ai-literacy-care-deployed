/**
 * sessionConfigStore — 온보딩/모드/업로드 세션 설정
 * 링크 배포용 흐름: 익명 로그인(UUID) → 개인정보 동의 → 모드 선택(care/upload)
 * userId·동의 여부는 localStorage에 영구 저장하여 재방문 시 유지한다.
 */
import { create } from 'zustand';

const UID_KEY = 'literacy_uid';
const CONSENT_KEY = 'literacy_consent';
const BASELINE_SPEED_KEY = 'literacy_baseline_speed';
const CALIBRATED_KEY = 'literacy_calibrated';

function loadUserId(): string | null {
  try {
    return localStorage.getItem(UID_KEY);
  } catch {
    return null;
  }
}

function loadConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

function genUserId(): string {
  const raw =
    (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : String(Math.random()).slice(2) + String(Math.random()).slice(2)).replace(/-/g, '');
  return 'u_anon_' + raw.slice(0, 12);
}

export type CareMode = 'care' | 'upload';

interface SessionConfigState {
  userId: string | null;
  consentGiven: boolean;
  mode: CareMode;
  uploadedTitle: string | null;
  uploadedContent: string[] | null; // 단락 배열
  baselineScrollSpeed: number | null; // 온보딩에서 측정한 개인별 기준 스크롤 속도 (px/s)
  isCalibrated: boolean; // 온보딩 튜토리얼(속도 측정) 완료 여부

  /** 익명 UUID 발급(최초 1회) + 동의 저장. 발급된 userId 반환 */
  onboard: () => string;
  setMode: (m: CareMode) => void;
  setUpload: (title: string, content: string[]) => void;
  clearUpload: () => void;
  /** 온보딩 튜토리얼에서 측정한 기준 스크롤 속도 저장 */
  setBaselineSpeed: (speed: number) => void;
  reset: () => void;
}

export const useSessionConfig = create<SessionConfigState>((set, get) => ({
  userId: loadUserId(),
  consentGiven: loadConsent(),
  mode: 'care',
  uploadedTitle: null,
  uploadedContent: null,
  baselineScrollSpeed: (() => { try { const v = localStorage.getItem(BASELINE_SPEED_KEY); return v ? parseFloat(v) : null; } catch { return null; } })(),
  isCalibrated: (() => { try { return localStorage.getItem(CALIBRATED_KEY) === 'true'; } catch { return false; } })(),

  onboard: () => {
    let uid = get().userId;
    if (!uid) {
      uid = genUserId();
      try {
        localStorage.setItem(UID_KEY, uid);
      } catch {
        /* localStorage 불가 환경 무시 */
      }
    }
    try {
      localStorage.setItem(CONSENT_KEY, 'true');
    } catch {
      /* noop */
    }
    set({ userId: uid, consentGiven: true });
    return uid;
  },

  setMode: (mode) => set({ mode }),
  setUpload: (uploadedTitle, uploadedContent) =>
    set({ mode: 'upload', uploadedTitle, uploadedContent }),
  clearUpload: () => set({ mode: 'care', uploadedTitle: null, uploadedContent: null }),

  setBaselineSpeed: (speed: number) => {
    try {
      localStorage.setItem(BASELINE_SPEED_KEY, String(speed));
      localStorage.setItem(CALIBRATED_KEY, 'true');
    } catch { /* noop */ }
    set({ baselineScrollSpeed: speed, isCalibrated: true });
  },

  reset: () => {
    try {
      localStorage.removeItem(UID_KEY);
      localStorage.removeItem(CONSENT_KEY);
      localStorage.removeItem(BASELINE_SPEED_KEY);
      localStorage.removeItem(CALIBRATED_KEY);
    } catch {
      /* noop */
    }
    set({
      userId: null,
      consentGiven: false,
      mode: 'care',
      uploadedTitle: null,
      uploadedContent: null,
      baselineScrollSpeed: null,
      isCalibrated: false,
    });
  },
}));

/** 온보딩 완료 여부 (라우터 가드용 · 스토어 인스턴스 밖에서도 호출 가능) */
export function isOnboarded(): boolean {
  return loadConsent();
}
