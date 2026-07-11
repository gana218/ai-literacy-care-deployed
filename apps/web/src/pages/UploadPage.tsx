/**
 * UploadPage — '/upload'
 * 읽고 싶은 문서(제목 + 본문 텍스트)를 붙여넣어 내 문서로 케어를 시작한다.
 * 붙여넣은 본문은 빈 줄 기준으로 단락 배열로 나뉘어 백엔드(2번 Content Reducer)로 전달된다.
 * ?ext=1 쿼리로 진입하면 상단에 확장 프로그램 설치 안내를 함께 노출한다.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSessionConfig } from '../stores/sessionConfigStore';
import { useReadingStore } from '../stores/readingStore';
import { Button } from '../components/common/Button';
import BottomTabBar from '../components/common/BottomTabBar';

const SAMPLE = `인공지능 기술이 일상에 빠르게 스며들면서, 정보를 비판적으로 읽는 능력의 중요성이 커지고 있습니다.

특히 대규모 언어 모델이 만들어내는 그럴듯한 문장은 사실과 허구를 구분하기 어렵게 만듭니다. 따라서 출처를 확인하고 맥락을 따지는 습관이 필요합니다.

이 글을 붙여넣고 [읽기 시작]을 누르면, 실제로 집중도가 측정되고 필요한 순간에 퀴즈가 제시됩니다.`;

export default function UploadPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const showExt = params.get('ext') === '1';

  const setUpload = useSessionConfig((s) => s.setUpload);
  const setArticle = useReadingStore((s) => s.setArticle);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'AI 리터러시 케어 — 페이지 업로드';
  }, []);

  const paragraphs = useMemo(
    () =>
      body
        .split(/\n\s*\n/)
        .map((p) => p.replace(/\s+/g, ' ').trim())
        .filter((p) => p.length > 0),
    [body]
  );

  const charCount = body.replace(/\s/g, '').length;

  const handleStart = () => {
    if (paragraphs.length === 0 || charCount < 20) {
      setError('본문을 20자 이상 붙여넣어 주세요.');
      return;
    }
    const finalTitle = title.trim() || '내가 올린 문서';
    setUpload(finalTitle, paragraphs);
    setArticle({
      id: 'uploaded',
      title: finalTitle,
      category: '내 업로드',
      author: '익명 업로드',
      publishedAt: '방금',
      content: paragraphs,
    });
    navigate('/reading');
  };

  return (
    <div
      className="min-h-screen px-4 pt-10 pb-24"
      style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
    >
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/home')}
          className="text-sm mb-4"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← 모드 선택으로
        </button>

        <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: 'var(--tracking-kr)' }}>
          📄 읽을 문서 올리기
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          기사·리포트·PDF에서 복사한 텍스트를 붙여넣으세요. 붙여넣은 그대로 케어가 적용됩니다.
        </p>

        {showExt && (
          <div
            className="rounded-lg border p-4 mb-6 text-sm"
            style={{ backgroundColor: 'var(--color-surface-alt)', borderColor: 'var(--color-border)' }}
          >
            <div className="font-semibold mb-1">🧩 확장 프로그램으로 실제 브라우징 케어</div>
            <ol className="list-decimal pl-5 space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
              <li>확장 폴더를 <code>chrome://extensions</code> → 개발자 모드 → “압축해제된 확장 프로그램 로드”로 설치</li>
              <li>읽고 싶은 페이지에서 확장 아이콘 → <b>케어 ON</b></li>
              <li>실제 페이지에서 집중도·넛지·퀴즈가 그대로 작동합니다</li>
            </ol>
            <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              지금은 아래에 텍스트를 붙여넣어 웹에서 바로 체험할 수도 있습니다.
            </p>
          </div>
        )}

        <label className="block text-sm font-medium mb-1">제목 (선택)</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: AI 시대의 디지털 리터러시"
          className="w-full rounded-md border px-3 py-2 mb-4 text-sm outline-none"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        />

        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium">본문 <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <button
            onClick={() => { setBody(SAMPLE); setError(''); }}
            className="text-xs underline"
            style={{ color: 'var(--color-primary)' }}
          >
            샘플로 채우기
          </button>
        </div>
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); if (error) setError(''); }}
          placeholder="여기에 읽을 문서 텍스트를 붙여넣으세요. (단락은 빈 줄로 구분됩니다)"
          rows={12}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none resize-y"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)', lineHeight: 'var(--leading-normal)' }}
        />

        <div className="flex items-center justify-between mt-2 mb-5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          <span>{paragraphs.length}개 단락 · {charCount}자</span>
          {error && <span style={{ color: 'var(--color-danger)' }}>{error}</span>}
        </div>

        <Button variant="primary" size="lg" className="w-full" onClick={handleStart}>
          이 문서로 읽기 시작 →
        </Button>
      </div>
      
      {/* 7/11: 하단 고정 탭 네비게이션 바 */}
      <BottomTabBar />
    </div>
  );
}
