# Evaluation Implementation Status

## 1. 문서 목적

이 문서는 AI 리터러시 케어 에이전트의 QA 및 평가 기능 중 현재 실제로 구현된 기능과 휴리스틱으로 대체된 기능, 미구현 기능 및 한계를 명확하게 기록한다.

현재 평가 시스템은 외부 유료 API 없이도 데모 환경에서 반복적으로 실행할 수 있도록 로컬 휴리스틱 평가를 기본 방식으로 사용한다.

---

## 2. 현재 실제 구현된 기능

| 항목 | 상태 | 구현 내용 |
|---|---|---|
| Faithfulness 평가 | 구현됨 | 생성 결과 단어 중 원문에 근거한 단어 비율을 기반으로 점수 계산 |
| Answer Relevance 평가 | 구현됨 | 질문과 답변 사이의 단어 중첩을 기반으로 점수 계산 |
| Overall Score | 구현됨 | Faithfulness와 Relevance의 평균값 계산 |
| Pass / Fail 판정 | 구현됨 | `PASS_THRESHOLD`와 평균 점수를 비교하여 판정 |
| Golden Dataset 평가 | 구현됨 | `golden_dataset/article_*.json` 전체를 pytest 회귀 테스트로 실행 |
| Orchestrator 통합 | 부분 구현 | `run_evaluation_from_state()`가 `quizzes`와 `chunks` 기반 state를 평가하나, 소비 경로의 vendor 갱신이 필요 |
| 웹 결과 QA 표시 | 미구현 | 3번 웹 경로에 evaluation 모듈과 Redis chunk 복원 연결 필요 |
| 비차단 평가 연결 | 부분 구현 | 소비 역할에서 동일 모듈을 사용하도록 재-vendor 필요 |
| 평가 결과 메타데이터 | 구현됨 | session ID, document ID, trace 및 error 존재 여부 기록 |

---

## 3. 현재 평가 방식

현재 Faithfulness와 Answer Relevance는 RAGAS 또는 LLM Judge가 아니라 단어 중첩 기반 Local Heuristic 방식으로 계산한다.

평가 흐름은 다음과 같다.

```text
원문·질문·답변 입력
        ↓
텍스트 정규화 및 토큰 추출
        ↓
단어 중첩 비율 계산
        ↓
Faithfulness / Relevance 산출
        ↓
평균 점수 계산
        ↓
PASS_THRESHOLD 비교
        ↓
Pass / Fail 결정
```

현재 통과 기준은 다음과 같다.

```text
PASS_THRESHOLD = 0.30
```

이 점수는 절대적인 품질 인증 점수가 아니라 다음 목적에 사용한다.

- Golden Dataset 내 샘플 간 상대 비교
- 코드 변경 전후 성능 비교
- Regression 발생 감지
- 비어 있거나 관련 없는 출력 탐지
- 데모 파이프라인의 정상 동작 확인

---

## 4. 휴리스틱으로 대체된 기능

| 기술 | 현재 상태 | 현재 대체 방식 | 대체 이유 |
|---|---|---|---|
| RAGAS | 실제 라이브러리 미연결 | 단어 중첩 기반 Faithfulness 및 Relevance | 외부 LLM API 비용과 네트워크 의존성 제거 |
| Promptfoo | 실제 실행 환경 미연결 | Golden Dataset pytest 회귀 테스트 | 제한된 개발 기간 내 재현 가능한 회귀 평가 우선 |
| LangSmith | 클라우드 추적 미연결 | 상태 메타데이터 기록, 로컬 Trace 확장 예정 | API 키 없이도 실행 흐름과 오류 여부를 기록하기 위함 |

위 기능은 구현 완료로 표시하지 않으며, 현재 적용한 대체 방식과 향후 교체 지점을 코드와 문서에 명시한다.

---

## 5. 현재 방식의 한계

단어 중첩 기반 평가는 다음과 같은 한계를 가진다.

- 의미가 같아도 표현이 다르면 낮은 점수가 나올 수 있다.
- 동의어와 문맥적 유사성을 충분히 인식하지 못한다.
- 사실관계가 잘못되었지만 원문 단어를 많이 포함한 답변이 높은 점수를 받을 수 있다.
- 문장의 자연스러움과 논리적 완성도를 직접 평가하지 못한다.
- 현재 Threshold는 LLM Judge의 기준과 직접 비교할 수 없다.

따라서 현재 점수는 절대적인 의미 품질 평가보다는 회귀 감지와 파이프라인 검증 지표로 해석해야 한다.

---

## 6. 향후 교체 및 확장 지점

### RAGAS

현재 휴리스틱 평가 함수를 실제 RAGAS 평가 호출로 교체할 수 있도록 평가 파이프라인과 점수 계산 모듈을 분리한다.

```text
현재:
evaluation_pipeline
→ Local Heuristic

향후:
evaluation_pipeline
→ RAGAS Evaluator
→ LLM Judge
```

### Promptfoo

프롬프트 또는 모델 버전별 결과를 동일 Golden Dataset으로 평가하고, 기준 버전보다 점수가 낮아지는 경우 Regression으로 기록하도록 확장한다.

### LangSmith

현재 로컬 JSON Trace를 LangSmith 클라우드 Trace로 교체하여 에이전트별 호출 시간, 입력, 출력 및 오류를 시각화할 수 있다.

---

## 7. 심사 및 데모 설명 원칙

발표와 문서에서는 다음과 같이 설명한다.

> 현재 평가 시스템은 외부 유료 API 없이 반복 실행 가능한 로컬 휴리스틱 평가를 기본값으로 사용합니다. Faithfulness와 Relevance 점수는 절대 평가보다 회귀 감지와 비정상 출력 탐지를 위한 지표입니다. 실제 RAGAS, Promptfoo, LangSmith는 동일 인터페이스를 통해 교체할 수 있도록 확장 지점을 분리했습니다.

현재 구현되지 않은 기능을 구현 완료로 표현하지 않는다.

---

## 8. 구현 상태 요약

| 구분 | 상태 |
|---|---|
| 로컬 휴리스틱 평가 | Real |
| Golden Dataset 실행 구조 | Real |
| Orchestrator state 평가 함수 | Real |
| 소비 역할 vendor 통합 | Partial |
| 웹 결과 QA 표시 | Missing |
| Pass / Fail 판정 | Real |
| 실제 품질 리포트 생성 | 구현 진행 |
| 실제 RAGAS 실행 | 미구현 |
| 실제 Promptfoo 실행 | 미구현 |
| 실제 LangSmith 클라우드 추적 | 미구현 |
| 로컬 JSON Trace | 구현 예정 |
