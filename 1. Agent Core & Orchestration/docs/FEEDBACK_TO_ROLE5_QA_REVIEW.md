# [1번→5번] QA·Evaluation 재점검 피드백 (2026-07-13 갱신)

작성: 1번(오케스트레이션) · 대상: 5번(QA & Evaluation)
점검 대상: `naaaayeonn/AI-literacy-care-Agent @ main` `5. QA &Evaluation Agent/` + 실제 실행 경로(1·3번 vendored)
방법: 코드 정독 + `pytest` 실행 + grep 사용처 추적 + 실 state 시뮬레이션

> **이번 갱신 요지** — 지난 피드백 이후 **테스트 빨간불(3 FAIL)은 해결**됐어(9 passed). 잘했어! 👏
> 그런데 **"실제로 돌아가는 평가"는 여전히 사실상 0점**이고, 지난 문서엔 없던 **더 근본적인 문제 2개**를 새로 찾았어:
> 1. 🆕 **웹(3번) 경로엔 QA 모듈이 아예 없어** import가 실패하고 조용히 스킵됨 → `qaEvaluation` 부재. (C2)
> 2. 🆕 **평가 코드가 3벌로 갈라져** 실행되는 vendored 사본이 원본보다 더 깨져 있음. (C3)
> 3. ♻️ **Relevance 항상 0**(존재하지 않는 필드) — 지난 문서의 "실세션 0점"의 핵심 원인, 아직 안 고쳐짐. (C1)

심각도: 🔴 Critical · 🟠 Major · 🟡 Minor · ✅ 지난 이후 개선됨

---

## ✅ 지난 피드백 이후 개선된 것 (확인함)
- **테스트 스위트 green** — `pytest backend/tests` → **9 passed** (예전 3 FAIL 해소).
- threshold 0.30 일관, 비차단 통합, `EVALUATION_HONESTY.md` 유지 — 좋음.

---

## 🔴 C1. Answer Relevance가 구조적으로 항상 0 (지난 "실세션 0점"의 핵심)

**위치:** `evaluation_pipeline.py` `run_evaluation_from_state` L78~87

- relevance의 질문을 `state["quiz_result"].get("question")`에서 읽는데, `quiz_result`는 채점 집계 `{correct_count, total_count, answers}`라 **`question` 필드가 없음** → question=`""` → relevance 0 (metrics.py L37 빈 입력 가드).
- **실행되는 1번 vendored 사본은 더 나쁨**: `"expected_quiz": str(quiz_result)` → dict를 통째 문자열화 → question이 `"{'correct_count':4,...}"` → 단어중첩 ≈ 0.
- 결과: **average = (faithfulness + 0)/2**. relevance 지표가 죽어 있음.

**고치기:** 실제 O/X 퀴즈는 `state["quizzes"]{chunkId:{quizId, question/statement, sourceChunkId}}`에 있음.
```python
quizzes = (state.get("quizzes") or {}).values()
q = [ (x.get("question") or x.get("statement","")) for x in quizzes ]
# relevance: 각 퀴즈 진술 vs 해당 문단 요약/본문 단어중첩 평균
```

---

## 🔴 C2. 🆕 웹(3번) 경로엔 QA 모듈이 없어 평가가 통째로 스킵

**위치:** `3. Cognitive Care Backend/backend/app/api/endpoints.py` L442~443
```python
try:
    from backend.evaluation.evaluation_pipeline import run_evaluation_from_state
    initial_state["qa_evaluation"] = run_evaluation_from_state(initial_state)
except Exception as _qa_err:  # ← ImportError가 여기 잡힘
    ...
```
- **`3. Cognitive Care Backend/backend/evaluation/` 디렉터리가 존재하지 않음** → `ImportError` → except로 **조용히 스킵**. 4번이 실제로 쓰는 **웹 세션 결과엔 `qaEvaluation`이 항상 없음**.
- 즉 QA는 **1번(확장) 경로에서만 부분 동작**, **웹 경로엔 부재**. "검증 가능한 시스템"이 데모 화면(웹)에 안 뜸.

**고치기:** evaluation을 3번도 접근 가능한 **단일 공유 위치**로(권장) 또는 최소 3번 `backend/evaluation/`에도 동일 모듈 vendored. (C3와 함께)

---

## 🔴 C3. 🆕 평가 코드가 3벌로 분기 — 단일 진실 없음

- **5번 원본** ≠ **1번 vendored**(`1. Agent .../backend/evaluation/…`), 내용 diff 확인. **실행되는 건 vendored**이고 1번 것은 C1이 더 심한 옛 버전. **3번엔 사본 자체가 없음**(C2).
- 5번 원본을 고쳐도 **1·3번 실행 동작은 안 바뀜.** "고쳤는데 왜 그대로지?"가 반복될 구조.

**고치기:** evaluation을 **canonical 한 곳(5번)** 으로 정하고, 소비 역할은 재-vendor 규칙을 파일 상단 주석으로 명시(출처/일시). 또는 저장소 공용 패키지로 승격.

---

## 🟠 M1. 3번 /result 입력이 비어 평가 대상이 없음
- 웹 `/result`의 `initial_state`는 `raw_text=""`, content_reducer가 stub → `simplified_text=""`, chunks 비어 있음. **C2가 풀려도 평가할 실데이터가 state에 없음** → faithfulness/relevance 0.
- **고치기:** 3번이 Redis `session:{id}:chunks`(원문·요약·용어 포함)를 `/result`에서 state로 복원해 QA에 전달. (1번 쪽엔 이미 textmeta 복원 패턴 있음 — 참고)

## 🟠 M2. golden_dataset이 회귀에 미연결
- `golden_dataset/article_001~005.json`(구조 양호)을 **로드/순회하는 코드가 없음**(grep 0). `EVALUATION_HONESTY.md`는 "Golden Dataset 평가 | 구현됨"이라 적었지만 **실제 미연결** → 표기 정정 + 러너 추가 필요.
- 002~005는 여전히 스텁/스키마 불일치(001만 dict `expected_quiz`) 가능성 — 확인 후 001 수준으로 통일.

## 🟠 M3. 프레임워크 3개 여전히 dead code
- `evaluate_with_local_heuristic`·`compare_evaluation_results`·`save_local_trace` **비테스트 호출 0건**(재확인). LangSmith 트레이스 파일 실제 미생성, promptfoo 회귀 미실행.
- `EVALUATION_HONESTY.md`가 "대체 적용"으로 서술 → 실제와 불일치. **정직성 문서의 신뢰가 핵심 자산이니** (i)흐름에 연결 or (ii)"미연결"로 하향 표기 중 택1.

## 🟠 M4. metrics에 리터러시 공식이 또 하나 (divergent) — 이번에 더 어긋남
- `metrics.py` `calculate_literacy_score = comp*0.5 + eng*0.3 + diff*0.2`. **우리 canonical이 이번에 v2로 바뀜**: `이해도 0.45 + 집중 0.30 + 도전성취 0.25 − 감점`(난이도·**이독성** 반영). 이 QA 사본은 **세 번째 공식**이고 이제 더 안 맞음.
- QA 자체 `test_score.py`에서만 사용(프로덕션 미사용)이라 위험은 낮지만, "평가 에이전트가 점수를 틀리게 정의"한 인상. **삭제 or score 엔진 import해 재현성만 검사**.

---

## 🟡 Minor
- **Faithfulness 분모 방향**: `|expected ∩ actual| / |expected_words|`는 recall(원문 커버리지). "답변이 원문에 근거하는 비율"이면 분모는 `|actual_words|`가 맞음. (요약/용어 평가로 대상 재정의 시 함께 정리)
- **한국어 토큰화**: `split()`만으론 조사(`은/는/이/가/을/를`)·하이픈(`X-선`vs`X선`)이 다른 토큰 → 관련 답변도 0. 조사 제거 or 문자 n-gram 자카드 권장.
- `is_passed` 기본 0.8인데 실제 0.30 사용 — 죽은 기본값 정리.
- `README.md`/`docs/DEPLOY_CHECKLIST.md`/`TEST_CHECKLIST.md` 빈 파일이면 3~5줄 채우기.

---

## ✅ 지금 기준에서 5번이 더 해야 할 것 (현재 아키텍처 반영)

시스템이 그새 바뀜: **O/X 퀴즈 폐루프 · 2번 summary/이독성/난이도 · 문해 5대 지표 · 리터러시 v2**. QA도 이 산출물을 평가해야 함.

**A. 급함(데모 신뢰도)**
- [ ] **C1**: relevance를 `state["quizzes"]` 실제 퀴즈 질문 기반으로.
- [ ] **C2/C3**: evaluation 단일 소스화 + 3번도 접근 가능하게(모듈 추가/공용 패키지) + 재-vendor 규칙.
- [ ] **M1**: 3번 `/result`에서 Redis chunks를 state로 복원해 QA에 실데이터 공급.

**B. 현재 산출물 평가 항목 추가 (제품 피벗 반영)**
- [ ] **요약 faithfulness**: `chunk.original_text` vs `chunk.summary`(2번) 근거 비율(분모 수정판).
- [ ] **O/X 퀴즈 타당성**: `quiz.statement`가 `sourceChunkId` 문단으로 **참·거짓 판별 가능**한지 + answer True/False 분포 편향 체크. → **3번 O/X 회귀 테스트로도 재사용**(협업 포인트).
- [ ] **용어풀이 faithfulness**: `terms[].definition` vs `source`(신뢰출처). 2번 `faithfulness_summary` 활용.
- [ ] **점수/5대 지표 재현성**: 같은 state→같은 `literacy_score`·`literacy_domains`(결정론) 회귀. (score 엔진 import, M4 대체)

**C. 회귀 자동화 (QA 본질)**
- [ ] **M2**: golden 5개 로드→평가→기대/임계 비교 **pytest 회귀** + CI. 002~005 채우고 스키마 통일.
- [ ] `EVALUATION_HONESTY.md` 현행화(golden "미연결→연결", relevance/dead-code 상태 정정).

**D. 선택(고도화)**
- [ ] SnowChat(Gemini) 붙여 heuristic→**LLM-judge 토글**(키 없으면 heuristic 폴백).

---

## 부록. QA가 읽어야 할 현재 state 필드
| 목적 | 필드 |
|---|---|
| 원문/요약 | `chunks[].original_text`, `chunks[].summary` |
| 퀴즈 | `state["quizzes"]{chunkId:{quizId, question, statement, answer(서버전용), sourceChunkId}}` |
| 채점 | `state["quiz_answers"]`(문항별) / `quiz_result`(집계) |
| 점수 | `literacy_score`, `score_breakdown`(comprehension/engagement/**readability**/challenge…) |
| 5대 지표 | `state["literacy_domains"]`(comprehension/focus/closeReading/challenge/stability) |
| 글 프로필 | `state["text_profile"]`(readability/difficulty + label) |
| 용어 | `terms[]`{term, definition, source, faithfulness_score} |

---

**한 줄 요약:** 테스트 초록은 잘했고, 이제 **① relevance 항상 0(C1) ② 웹 경로 QA 부재(C2) ③ 코드 3벌 분기(C3)** 이 셋이 제일 급해 — 이게 풀려야 "웹 데모에서 QA 점수가 실제로 뜬다"가 됨. 그다음 O/X·요약 평가와 golden 회귀를 붙이면 발표의 "검증 가능한 시스템" 근거가 완성돼. 🙌
