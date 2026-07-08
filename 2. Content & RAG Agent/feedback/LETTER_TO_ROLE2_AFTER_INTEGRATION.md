# [편지] 2번에게 — real 교체하면서 내가 걸렸던 것들

> from 1번(오케스트레이션) · 2026-07-08
> 관련: `HANDOFF_TO_ROLE2_GEMINI_BRIDGE.md`, `FEEDBACK_TO_ROLE2_FROM_ROLE1.md`

2번 안녕하세요! 오늘 드디어 **임시 브릿지를 폐기하고 2번 real(`content_reducer`)을 1번 폐루프에 실제로 붙였습니다.** 결론부터: **잘 붙었고, 폐루프가 end-to-end로 돕니다.** 통합 회귀도 통과했어요(아래 §0). 정말 고생 많으셨습니다 🙏

이 편지는 붙이면서 **내가 실제로 걸렸거나 갸우뚱했던 지점**만 모은 겁니다. 계약은 완벽했고(진짜로요), 아래는 대부분 "지금 안 고쳐도 데모는 되지만, 프리즈 전에 정리하면 더 깔끔/정직해질" 것들입니다. 🔴는 보안이라 오늘 봐주세요.

---

## 0. 먼저 — 잘 된 것 (이건 진짜 칭찬)

- **진입점 계약 완벽**: `run_content_reducer(state) -> state`, snake_case 4필드(chunks/terms/difficulty_score/simplified_text) 그대로. 1번은 `_REAL_IMPL` 한 줄만 바꿔서 끝났습니다.
- **내가 요청했던 블로커 다 고쳐져 있었음**: H3(용어주입→재구성 순서), M2(`_meta` chunk 밖으로 pop), H1(용어집 임베딩 `_TERM_VECS` 1회 캐시). 확인했습니다. 👏
- **폴백이 튼튼**: 키·패키지·네트워크 다 없는 1번 환경에서도 안 죽고 결정론 경로(가독성·청킹·키워드 RAG)로 degrade됐습니다.
- **핸드오프 §5 초과달성**: 우리말샘 API + 동음이의어 판별 + 조사 전처리 `lookup_term()`까지. 용어 커버리지 걱정이 사라졌어요.

**회귀 결과**: 1번 기본 스위트 **96 passed**, content_reducer=real로 폐루프 관통 시 trace 8단계 전부 success, errors/warnings 없음. 실사전 용어 4개 매칭(출처=표준국어대사전/TTA, faith=1.0). ✅

---

## 1. 🔴 오늘 꼭 — API 키가 평문으로 커밋돼 있어요

- **어디**: `feedback/ROLE2_INTEGRATION_REPORT_FOR_ROLE3.md` 본문에 SnowChat 베어러 토큰이 그대로 (`W21Ai…OjPA`).
- **왜 위험**: public repo면 이미 노출입니다. 봇이 GitHub 스캔해서 긁어가요.
- **조치**: (1) 그 키 **회수/재발급**, (2) 문서에서 키 제거하고 `.env`로만, (3) `.env.example`엔 `GEMINI_API_KEY=your_snowchat_token_here` 자리표시자만.
- 데모 당일 여유 키 하나 더 있으면 안전합니다(무료 quota 소진 대비).

---

## 2. 🟡 걸렸던/갸우뚱했던 코드 지점

### (a) `restructurer.py` — 같은 코드가 두 번 정의돼 있어요
- `_demo_restructure`, `_LEVEL_LABELS`, 데모 섹션 주석이 **두 벌**(대략 80~103행 / 120~134행). merge 흔적 같아요. 뒤엣것이 이기니 동작엔 문제없지만 읽을 때 헷갈렸습니다.
- 같은 파일 `_get_client()`(직접 `google.genai` 클라이언트 만드는 함수)는 **아무도 안 부릅니다** — 지금 재구성은 `snowchat_client` 경유라서요. 死코드라 지워도 됩니다.
- **docstring이 옛날**: 파일 상단이 아직 "Claude API를 호출하여…"라고 적혀 있어요. 실제론 SnowChat(Gemini)입니다. 심사 때 코드 열면 어긋나 보입니다.

### (b) `router.py` — 난이도 라우팅이 지금은 명목뿐
- `MODEL_HEAVY`와 `MODEL_LIGHT`가 **둘 다 `"gemini-2.5-flash"`** (21~22행). 그래서 `select_model()`이 뭘 고르든 같은 모델이 나옵니다.
- 동작엔 문제없지만, **"난이도 기반 모델 라우팅"을 세일즈 포인트로 발표하면 정직성 문제**가 됩니다(코드상 항상 동일 모델).
- 선택지: SnowChat에서 2개 모델을 실제로 가르거나(가능하면), 아니면 발표에서 "라우팅 로직은 있으나 현재 단일 모델 서빙"이라고 정직하게 표현.

### (c) `rag_engine.py` — faithfulness는 여전히 상수 1.0
- `inject_rag_terms`에서 `faith = 1.0  # 직접 인용`(≈397행) 하드코딩. 실계산 함수 `_faithfulness_score()`(≈346행)는 정의만 돼 있고 **호출 안 됩니다**.
- 근거("사전 직접 인용이라 환각0")는 저도 동의해요 — 다만 **5번 QA한텐 "실측이 아니라 설계상 상수 1.0"이라고 명시**해줘야 검증 리포트가 정직해집니다. `_faithfulness_score`를 살릴지/지울지도 정해주세요.

### (d) `_meta` — chunk에선 잘 뺐는데, term에도 남을 수 있어요
- `agent.py`가 chunk의 `_meta`를 pop해줘서 chunk 계약은 깨끗합니다(고마워요). 다만 `contracts.py`의 `TermDict`엔 아직 `_meta: NotRequired[dict]`가 있고, `lookup_term` 응답엔 `_meta`가 실려 나갑니다. 프론트로 나가는 term에 디버그 메타가 새지 않게 한 번만 확인해주세요.

---

## 3. 🟢 이식하면서 내가 실제로 손봐야 했던 것 (2번이 알아두면 좋음)

- **데이터 파일 경로 의존**: `rag_engine`/`restructurer`가 `Path(__file__).parents[4] / "data" / …`로 `term_dictionary.json`·`demo_fallback_data.json`을 찾더라고요. 그래서 1번 레포로 옮길 때 **`data/` 폴더도 같이 이식**했습니다. (다행히 절대임포트 구조가 같아 경로가 맞았어요. `_load_term_dictionary`의 parents 재탐색 폴백도 잘 만들어놔서 안전했습니다 👍)
- **키 변수 의미 혼선**: `snowchat_client`가 `GEMINI_API_KEY`에서 **SnowChat 토큰**을 읽어요. 처음에 "이게 진짜 Google Gemini 키인가?" 하고 헷갈렸습니다. 1번 옛 브릿지는 진짜 google-generativeai 키를 기대했었거든요. 브릿지는 폐기됐으니 최종 충돌은 없지만, `.env.example` 주석에 "이 키는 SnowChat 게이트웨이 토큰"이라고 한 줄 적어주면 다음 사람이 안 헷갈립니다.
- **키워드 모드 RAG 정밀도**: 1번 환경엔 `sentence-transformers`가 없어서 키워드 매칭으로 돌았는데, 데모 문장에서 **"포트"가 오매칭**됐습니다(임베딩이면 안 걸렸을 것). 데모엔 지장 없지만, 시연 문서에 나오는 용어면 `term_dictionary`에서 그 항목을 빼거나, 데모 머신엔 `pip install sentence-transformers`로 임베딩 모드를 켜는 걸 추천.
- **절대임포트**: 2번 코드가 `from backend.app.agents.content_reducer.…` 절대경로라, 이식 위치가 정확히 그 트리에 맞아야 resolve됩니다. (2번 마지막 커밋이 "resolve absolute backend import error"던데, 같은 걸 겪으신 것 같아요. 1번 레포에선 위치를 맞춰서 해결했습니다.)

---

## 4. 내가 1번 쪽에서 해둔 것 (2번은 안 건드려도 됨)

- 2번 `content_reducer/` 패키지 + `data/`를 1번 레포에 **이식**하고, `content_reducer_client.py._REAL_IMPL`을 2번 `agent.run_content_reducer`로 교체.
- 임시 브릿지(`real/content_reducer_bridge.py`)는 **폐기 안 하고 보존**(비상 폴백).
- 브릿지에 하드코딩됐던 토글 테스트를 2번 real 기준으로 갱신 → 96 green 유지.
- 활성화 스위치: `LITERACY_CONTENT_REDUCER_IMPL=real` (+ 내부 `CONTENT_REDUCER_MODE=real` 기본).

> ⚠️ **계약(진입점 시그니처·4필드명) 바꾸면 1번에 먼저 핑** 주세요. 그거 하나만 지켜주면 2번은 자유롭게 내부 개선하셔도 됩니다. 재구성 품질은 점수에 안 들어가니 Gemini/프롬프트 마음껏 손봐도 재현성 안 깨집니다.

우선순위만 정리: **§1(키) 오늘 → §2 프리즈 전 → §3은 참고**. 막히면 바로 핑 주세요. 붙는 거 확인해서 저도 기쁩니다 🙌

— 1번 드림
