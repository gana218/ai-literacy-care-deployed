# 레포 구조 & 역할 경계 (혼동 방지 가이드)

> 목적: 2번·3번을 비롯한 폴더 간 역할·중복 관계를 명확히 해서 "누가 뭘 고쳐야 하는지" 혼동을 없앤다.
> 최종 갱신: 2026-07-10

---

## 1. 폴더 = 역할

| 폴더 | 역할 | 책임 |
|---|---|---|
| `1. Agent Core & Orchestration` | ①번 | Shared State, Orchestrator 실행 흐름, Literacy Score·Routing 엔진, 에이전트 계약 |
| `2. Content & RAG Agent` | ②번 | **Content Reducer** — 가독성/청킹, 쉬운 문장 재구성, 용어 RAG(사전 조회), 퀴즈 생성 |
| `3. Cognitive Care Backend` | ③번 | **실행 백엔드** — FastAPI, DB/Redis, WebSocket/REST, 집중도(focus) 엔진. **앱의 런타임 진입점** |
| `5. QA &Evaluation Agent` | ⑤번 | 평가/QA — Ragas·Promptfoo·품질 리포트, 골든셋 |
| `apps/web` | ④번 | 프론트엔드(React/Vite) — 읽기 화면, 넛지/퀴즈 UI, 대시보드 |

**런타임 = ③번.** 배포(단일 호스트 Docker)는 `3. Cognitive Care Backend`를 띄우고, 그 안에서 ①②번 코드가 함께 돈다. ④번 프론트는 빌드되어 ③번이 서빙한다.

---

## 2. ⚠️ "vendored 복사본" 구조 (2번↔3번 중복의 정체)

③번 백엔드는 실행 시 ①번 오케스트레이터와 ②번 Content Reducer가 필요하다. 그런데 폴더명에 **공백과 `&`** 가 있어 파이썬 패키지로 서로 `import` 할 수 없다. 그래서 ③번은 두 모듈을 **자기 폴더에 복사(vendoring)** 해서 사용한다:

- `3. Cognitive Care Backend/backend/app/agents/content_reducer/`  ← **②번 `content_reducer/`의 복사본**
- `3. Cognitive Care Backend/backend/app/orchestrator/`            ← **①번 orchestrator의 복사본**

즉 2번과 3번에 `content_reducer/`가 둘 다 있는 건 "중복 버그"가 아니라 **의도된 vendoring**이다. 다만 아래 문제가 있다.

### 알려진 문제 (2026-07-10)
- **복사본이 원본과 갈라졌다.** `2. Content & RAG Agent`의 `content_reducer`와 `3. Cognitive Care Backend`의 복사본이 상당히 다르다(예: `rag_engine.py` 약 218줄 차이, `quiz_generator.py`·`restructurer.py`·`snowchat_client.py` 등도 크게 다름). **배포는 ③번 복사본을 쓰므로, ②번의 최신 개선이 자동 반영되지 않는다.**
- 그래서 "2번은 됐는데 데모에선 안 된다"는 어긋남이 생길 수 있다.

### ✅ 편집 규칙 (지금 당장 지킬 것)
- **Content/RAG 로직의 canonical = ②번 폴더.** 여기서 고친다.
- 고친 뒤 **③번 복사본에도 반영**해야 데모/배포에 나온다. (수동 복사 또는 아래 개선안)
- 집중도(focus)·DB·Redis·API 엔드포인트는 **③번이 canonical.**

### 권장 개선 (데모 후, 리스크 있음 → 팀 합의 필요)
1. `content_reducer`를 **공용 패키지**(예: 루트 `packages/content_reducer/`)로 승격 → ②③번이 **같은 코드를 import**, 복사본 삭제.
2. 또는 CI에서 **②번 → ③번 자동 동기화** 스크립트.
> 지금(데모 직전)은 위험해서 미룸: ③번 복사본엔 `from backend.app.` import 경로 등 ③번 전용 수정이 섞여 있어, 단순 덮어쓰기 시 앱이 깨진다.

---

## 3. 그 밖의 중복/혼동 지점

| 항목 | 상태 | 조치 |
|---|---|---|
| `3번 services/rag_service.py` | `agents/content_reducer/rag_engine.py`와 **겹치는 별도 RAG 경로**. 앱은 안 쓰고 `test_integration.py`만 사용 | 데모 후 정리(테스트를 실제 경로로 이관 or 제거) |
| `3번 add_terms.py / reset_db.py / test_stdict.py` | 폴더 루트의 개발용 유틸 스크립트 | 데모 후 `scripts/`로 이동 권장 |
| `2번 readability.py`(루트) vs `content_reducer/readability.py` | 내용 다름(별개) | ②번 내부 정리 사항 |

---

## 4. 최근 정리 내역 (2026-07-10)

- 루트 정크 제거: `3.zip`, `hi`, `test/`
- 죽은 코드 제거: `3번 services/profile_service.py` (참조 0건)
- 위 "vendored 구조/중복"은 **문서화**로 혼동 해소, 코드 de-dup은 데모 후로 분리

---

## 5. 한 줄 요약

> **2번=Content/RAG 원본, 3번=실행 백엔드(2번·1번을 복사해 탑재).** 복사본이 갈라져 있으니, 콘텐츠 로직은 2번에서 고치고 3번 복사본에 반영하라. 근본 해결(공용 패키지화)은 데모 후.
