import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Search, Trash2, X, AlertCircle, BookOpen } from 'lucide-react';
import { Card } from '../common/Card';
import { api, type GrowthReportResponse } from '../../lib/api';
import { useSessionConfig } from '../../stores/sessionConfigStore';
import { useAuthStore } from '../../stores/authStore';

// ── 커스텀 툴팁 ──────────────────────────────────────────────────────
const CustomRadarTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
        {payload[0].payload.subject}
      </p>
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color, margin: '2px 0' }}>
          {item.name}: <strong>{item.value}점</strong>
        </p>
      ))}
    </div>
  );
};

const CustomActivityTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        boxShadow: 'var(--shadow-md)',
        fontFamily: 'var(--font-sans)',
        fontSize: 'var(--text-sm)',
      }}
    >
      <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: '6px' }}>
        {label}
      </p>
      {payload.map((item: any) => (
        <p key={item.name} style={{ color: item.color, margin: '2px 0' }}>
          {item.name}: <strong>{item.value}{item.name === '독해 시간' ? '분' : ' XP'}</strong>
        </p>
      ))}
    </div>
  );
};

const DetailedGrowthReport = React.memo(function DetailedGrowthReport() {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  const [data, setData] = useState<GrowthReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const anonId = useSessionConfig((s) => s.userId);
  const userId = user?.id || anonId;

  // 단어장 인터랙션 상태
  const [activeWord, setActiveWord] = useState<any | null>(null);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  async function refetchData() {
    if (!userId) return;
    try {
      const res = await api.getGrowthReport(userId);
      setData(res);
    } catch (err) {
      console.error('[GrowthReport] Failed to refetch report:', err);
    }
  }

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      setLoading(true);
      try {
        const res = await api.getGrowthReport(userId);
        setData(res);
      } catch (err) {
        console.error('[GrowthReport] Failed to fetch report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  if (loading || !data) {
    return (
      <Card variant="default" className="p-6 space-y-6 flex justify-center items-center h-64">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>리포트 데이터를 불러오는 중...</p>
      </Card>
    );
  }

  const currentRadarData = tab === 'weekly' ? data.weekly.radarData : data.monthly.radarData;
  const currentActivityData = tab === 'weekly' ? data.weekly.activityData : data.monthly.activityData;
  const currentWords = tab === 'weekly' ? data.weekly.words : data.monthly.words;

  // 단어 필터링 로직 (전체 단어장용)
  const filteredWords = currentWords.filter((w) => {
    const matchesSearch =
      w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.meaning.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || w.level === filterLevel;
    const matchesStatus = filterStatus === 'all' || w.status === filterStatus;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  // 단어장 메인 노출은 최대 4개
  const previewWords = currentWords.slice(0, 4);

  // 핵심 성장 성과 계산
  const topGrowth = currentRadarData.reduce(
    (best, d) => (d.after - d.before > best.delta ? { subject: d.subject, delta: d.after - d.before } : best),
    { subject: '', delta: -Infinity }
  );
  const topGrowthLabel =
    topGrowth.subject && topGrowth.delta > 0
      ? `${topGrowth.subject} +${topGrowth.delta.toFixed(1)}점 성장`
      : '데이터 축적 중';

  // 단어 상태 업데이트 처리
  const handleUpdateStatus = async (word: string, newStatus: 'completed' | 'review') => {
    if (!userId) return;
    try {
      await api.updateVocabStatus(userId, word, newStatus);
      if (activeWord && activeWord.word === word) {
        setActiveWord({ ...activeWord, status: newStatus });
      }
      await refetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // 단어 삭제 처리
  const handleDeleteWord = async (word: string) => {
    if (!userId) return;
    if (!window.confirm(`'${word}' 단어를 단어장에서 삭제하시겠습니까?`)) return;
    try {
      await api.updateVocabStatus(userId, word, 'deleted');
      setActiveWord(null);
      await refetchData();
    } catch (err) {
      console.error('Failed to delete word:', err);
    }
  };

  return (
    <Card variant="default" className="p-6 space-y-6">
      {/* ── 헤더 & 탭 전환 ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div>
          <h2
            className="text-lg font-bold flex items-center gap-2"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)', letterSpacing: 'var(--tracking-kr)' }}
          >
            📈 주간 / 월간 상세 성장 분석 리포트
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
            학습자의 상세 문해력 성장 지표 및 오케스트레이션 분석 데이터
          </p>
        </div>

        {/* 탭 버튼 */}
        <div className="flex bg-[var(--color-surface-alt)] p-1 rounded-lg self-start sm:self-center">
          <button
            onClick={() => setTab('weekly')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
              tab === 'weekly'
                ? 'bg-[var(--color-surface)] shadow-sm'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
          >
            주간 분석
          </button>
          <button
            onClick={() => setTab('monthly')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
              tab === 'monthly'
                ? 'bg-[var(--color-surface)] shadow-sm'
                : 'opacity-60 hover:opacity-100'
            }`}
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
          >
            월간 분석
          </button>
        </div>
      </div>

      {/* ── 리포트 상세 콘텐츠 grid ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-6"
        >
          {/* M3/M4: Recharts 기반 2개 차트 (좌측 7칸) */}
          <div className="md:col-span-7 space-y-6">
            {/* 1. 문해 5대 지표 분석 (레이더 차트) */}
            <div className="p-4 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-1.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                문해 5대 세부 지표 변화
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={currentRadarData}>
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: 'var(--color-text-secondary)', fontSize: 11, fontWeight: 600 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fill: 'var(--color-text-muted)', fontSize: 9 }}
                    />
                    <Radar
                      name="케어 전 (Baseline)"
                      dataKey="before"
                      stroke="var(--color-text-muted)"
                      fill="var(--color-text-muted)"
                      fillOpacity={0.15}
                    />
                    <Radar
                      name="현재 수준"
                      dataKey="after"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.25}
                    />
                    <Tooltip content={<CustomRadarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. 주간/월간 독해 활동량 추이 */}
            <div className="p-4 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-1.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                독해 시간 및 획득 XP 추이
              </h4>
              <div className="h-64">
                {currentActivityData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    아직 이번 주 활동 기록이 없습니다. 글을 읽고 학습해 보세요!
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={currentActivityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                        stroke="var(--color-border)"
                      />
                      <YAxis
                        yAxisId="left"
                        label={{ value: '독해 시간 (분)', angle: -90, position: 'insideLeft', style: { fill: 'var(--color-text-muted)', fontSize: 10 } }}
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                        stroke="var(--color-border)"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        label={{ value: '경험치 (XP)', angle: 90, position: 'insideRight', style: { fill: 'var(--color-text-muted)', fontSize: 10 } }}
                        tick={{ fill: 'var(--color-text-secondary)', fontSize: 10 }}
                        stroke="var(--color-border)"
                      />
                      <Tooltip content={<CustomActivityTooltip />} />
                      <Legend wrapperStyle={{ fontSize: '11px' }} />
                      <Bar yAxisId="left" dataKey="time" name="독해 시간" fill="var(--color-engagement)" radius={[4, 4, 0, 0]} barSize={24} />
                      <Line yAxisId="right" type="monotone" dataKey="xp" name="획득 XP" stroke="var(--color-xp)" strokeWidth={2} dot={{ r: 4 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* 처방전 + 어휘 보드 (우측 5칸) */}
          <div className="md:col-span-5 space-y-6 flex flex-col">
            {/* M5: 주간 AI 성장 처방전 */}
            <div className="p-5 bg-[var(--color-surface-alt)] rounded-[var(--radius-md)] border border-[var(--color-border)] flex-1 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  🧠 AI 리터러시 코치의 주간 성장 처방전
                </h4>
                <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                  {data[tab].prescription.map((para: string, idx: number) => (
                    <p key={idx} dangerouslySetInnerHTML={{ __html: para }} />
                  ))}
                </div>
              </div>

              {/* 핵심 성과 요약 */}
              <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs font-semibold">
                <span style={{ color: 'var(--color-text-secondary)' }}>핵심 성장 성과</span>
                <span className="text-[var(--color-growth)]">
                  {topGrowthLabel}
                </span>
              </div>
            </div>

            {/* 어휘 마스터 보드 */}
            <div className="p-5 bg-[var(--color-surface)] rounded-[var(--radius-md)] border border-[var(--color-border)] flex flex-col justify-between" style={{ minHeight: '320px' }}>
              <div>
                <h4 className="text-sm font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>
                  {tab === 'weekly' ? '이번 주' : '이번 달'} 습득 핵심 어휘 보드
                </h4>
                <div className="space-y-3">
                  {previewWords.length === 0 ? (
                    <div className="py-12 text-center text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', lineHeight: '1.6' }}>
                      🔍 아직 조회한 단어가 없습니다.<br />글을 읽으면서 모르는 단어를 드래그해 보세요!
                    </div>
                  ) : (
                    previewWords.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => setActiveWord(item)}
                        className="p-2.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] cursor-pointer transition-colors duration-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                            {item.word}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-medium rounded"
                              style={{
                                backgroundColor:
                                  item.level === '상'
                                    ? 'var(--color-nudge-hard-tint)'
                                    : item.level === '중'
                                    ? 'var(--color-nudge-medium-tint)'
                                    : 'var(--color-primary-tint)',
                                color:
                                  item.level === '상'
                                    ? 'var(--color-nudge-hard)'
                                    : item.level === '중'
                                    ? 'var(--color-nudge-medium)'
                                    : 'var(--color-primary)',
                              }}
                            >
                              난이도:{item.level}
                            </span>
                            <span
                              className="px-1.5 py-0.5 text-[9px] font-bold rounded"
                              style={{
                                backgroundColor:
                                  item.status === 'completed'
                                    ? 'var(--color-growth-tint)'
                                    : 'var(--color-nudge-medium-tint)',
                                color:
                                  item.status === 'completed'
                                    ? 'var(--color-growth)'
                                    : 'var(--color-nudge-medium)',
                              }}
                            >
                              {item.status === 'completed' ? '완료' : '복습 필요'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[11px] leading-tight line-clamp-1" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-sans)' }}>
                          {item.meaning}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 단어장 바로가기 버튼 */}
              <button
                onClick={() => setIsVocabModalOpen(true)}
                className="mt-4 w-full py-2 bg-[var(--color-surface-alt)] border border-[var(--color-border)] hover:bg-[var(--color-border)] text-xs font-semibold rounded-lg transition-colors duration-200"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}
              >
                전체 단어장 보러가기 ({currentWords.length}개)
              </button>
            </div>

          </div>

        </motion.div>
      </AnimatePresence>

      {/* ── 1. 단어 상세 보기 모달 ── */}
      <AnimatePresence>
        {activeWord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ position: 'fixed' }}>
            {/* 어두운 반투명 백드롭 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveWord(null)}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* 모달 카드 바디 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl z-10"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {/* 닫기 버튼 */}
              <button
                onClick={() => setActiveWord(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-[var(--color-surface-alt)] transition-colors"
                style={{ position: 'absolute', top: '16px', right: '16px' }}
              >
                <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
              </button>

              {/* 상세 정보 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                    {activeWord.word}
                  </h3>
                  <span
                    className="px-2 py-0.5 text-xs font-medium rounded"
                    style={{
                      backgroundColor:
                        activeWord.level === '상'
                          ? 'var(--color-nudge-hard-tint)'
                          : activeWord.level === '중'
                          ? 'var(--color-nudge-medium-tint)'
                          : 'var(--color-primary-tint)',
                      color:
                        activeWord.level === '상'
                          ? 'var(--color-nudge-hard)'
                          : activeWord.level === '중'
                          ? 'var(--color-nudge-medium)'
                          : 'var(--color-primary)',
                    }}
                  >
                    난이도 {activeWord.level}
                  </span>
                </div>

                <div className="p-3 bg-[var(--color-surface-alt)] rounded-lg border border-[var(--color-border)]">
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {activeWord.meaning}
                  </p>
                </div>

                {/* 학습 상태 전환 토글 */}
                <div className="flex items-center justify-between text-xs border-t border-[var(--color-border)] pt-4">
                  <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>학습 진행 상태</span>
                  <div className="flex bg-[var(--color-surface-alt)] p-0.5 rounded-lg border border-[var(--color-border)]">
                    <button
                      onClick={() => handleUpdateStatus(activeWord.word, 'review')}
                      className={`px-3 py-1 text-xs rounded-md transition-all ${
                        activeWord.status === 'review'
                          ? 'bg-[var(--color-surface)] font-bold shadow-sm'
                          : 'opacity-50'
                      }`}
                      style={{ color: 'var(--color-text)' }}
                    >
                      복습 필요
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(activeWord.word, 'completed')}
                      className={`px-3 py-1 text-xs rounded-md transition-all ${
                        activeWord.status === 'completed'
                          ? 'bg-[var(--color-surface)] font-bold shadow-sm'
                          : 'opacity-50'
                      }`}
                      style={{ color: 'var(--color-text)' }}
                    >
                      학습 완료
                    </button>
                  </div>
                </div>

                {/* 삭제 및 하단 액션 */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => handleDeleteWord(activeWord.word)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors font-semibold px-2 py-1 rounded hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    단어장에서 삭제
                  </button>
                  <button
                    onClick={() => setActiveWord(null)}
                    className="px-4 py-1.5 text-xs font-bold rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] transition-colors"
                    style={{ color: 'var(--color-text)' }}
                  >
                    닫기
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 2. 전체 단어장 모달 ── */}
      <AnimatePresence>
        {isVocabModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4" style={{ position: 'fixed' }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsVocabModalOpen(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 15 }}
              className="relative w-full max-w-2xl h-[560px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 shadow-2xl z-10 flex flex-col justify-between"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {/* 모달 헤더 */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                    <BookOpen size={18} style={{ color: 'var(--color-primary)' }} />
                    나의 누적 단어장
                  </h3>
                  <button
                    onClick={() => setIsVocabModalOpen(false)}
                    className="p-1 rounded-full hover:bg-[var(--color-surface-alt)] transition-colors"
                    style={{ position: 'absolute', top: '24px', right: '24px' }}
                  >
                    <X size={18} style={{ color: 'var(--color-text-secondary)' }} />
                  </button>
                </div>

                {/* 검색 및 필터 컨트롤 바 */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
                  {/* 검색창 */}
                  <div className="sm:col-span-6 relative">
                    <Search className="absolute left-3 top-2.5 text-xs opacity-40" size={14} style={{ color: 'var(--color-text)' }} />
                    <input
                      type="text"
                      placeholder="단어 또는 뜻 검색..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  {/* 난이도 필터 */}
                  <div className="sm:col-span-3">
                    <select
                      value={filterLevel}
                      onChange={(e) => setFilterLevel(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none"
                    >
                      <option value="all">난이도 (전체)</option>
                      <option value="상">난이도: 상</option>
                      <option value="중">난이도: 중</option>
                      <option value="하">난이도: 하</option>
                    </select>
                  </div>
                  {/* 상태 필터 */}
                  <div className="sm:col-span-3">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none"
                    >
                      <option value="all">학습 상태 (전체)</option>
                      <option value="review">복습 필요</option>
                      <option value="completed">학습 완료</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 단어 리스트 컨테이너 (스크롤) */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4 scrollbar-thin">
                {filteredWords.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-xs opacity-50 py-16">
                    <AlertCircle size={32} className="mb-2" />
                    검색 조건에 부합하는 단어가 단어장에 없습니다.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredWords.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveWord(item)}
                        className="p-3 rounded-xl border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)] cursor-pointer flex flex-col justify-between transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                            {item.word}
                          </span>
                          <div className="flex items-center gap-1">
                            <span
                              className="px-1.5 py-0.5 text-[9px] rounded font-medium"
                              style={{
                                backgroundColor:
                                  item.level === '상'
                                    ? 'var(--color-nudge-hard-tint)'
                                    : 'var(--color-nudge-medium-tint)',
                                color:
                                  item.level === '상'
                                    ? 'var(--color-nudge-hard)'
                                    : 'var(--color-nudge-medium)',
                              }}
                            >
                              {item.level}
                            </span>
                            <span
                              className="px-1.5 py-0.5 text-[9px] rounded font-bold"
                              style={{
                                backgroundColor:
                                  item.status === 'completed'
                                    ? 'var(--color-growth-tint)'
                                    : 'var(--color-nudge-medium-tint)',
                                color:
                                  item.status === 'completed'
                                    ? 'var(--color-growth)'
                                    : 'var(--color-nudge-medium)',
                              }}
                            >
                              {item.status === 'completed' ? '완료' : '복습'}
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] leading-tight line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {item.meaning}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 푸터 */}
              <div className="border-t border-[var(--color-border)] pt-4 flex items-center justify-between text-xs">
                <span style={{ color: 'var(--color-text-muted)' }}>
                  총 {filteredWords.length}개의 단어가 검색되었습니다.
                </span>
                <button
                  onClick={() => setIsVocabModalOpen(false)}
                  className="px-5 py-1.5 font-bold bg-[var(--color-surface-alt)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-lg transition-colors"
                  style={{ color: 'var(--color-text)' }}
                >
                  단어장 닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
});

export default DetailedGrowthReport;
