# 🔍 퀴즈 채점 및 스크롤 이벤트 500 에러 분석 및 해결 보고서

안녕하세요! 크롬 확장 프로그램에서 스크롤 이벤트를 전송하거나 퀴즈를 제출할 때 백엔드에서 500 Internal Server Error가 발생했던 원인과 해결 방안을 공유합니다.

---

## 1. 🚨 버그 현상
* **이벤트 전송 실패**: 스크롤 중 `POST /api/session/{session_id}/events` 호출이 500 에러를 반환하여 퀴즈가 더 이상 팝업되지 않는 현상.
* **퀴즈 채점 실패**: 퀴즈 제출 시 `POST /api/session/{session_id}/quiz/submit` 호출이 `quiz submit 500` 에러를 반환하며 채점이 막히는 현상.

---

## 2. 🕵️‍♂️ 원인 분석 (Root Cause)
백엔드(`endpoints.py`)와 퀴즈 서비스(`quiz_service.py`) 내부에서 Redis에 저장된 퀴즈 캐시(`session:{session_id}:quizzes`)를 읽어와 파싱할 때 발생한 **자료형 역직렬화(Deserialization) 불일치**가 원인이었습니다.

### 상세 이슈:
1. **타입 가정 오류**: 퀴즈를 조회하는 로직(`endpoints.py:341` 및 `quiz_service.py:130`)에서는 Redis에서 가져온 퀴즈 객체가 항상 **Dictionary(사전형)** 타입일 것이라 가정하고 `.values()` 또는 `.get()` 함수를 호출하고 있었습니다.
2. **실제 데이터 구조**: JIT(Just-In-Time) 퀴즈 생성 등 일부 백엔드 처리 흐름을 거치면서 Redis 캐시에 퀴즈 데이터가 **List(배열)** 형태로 저장되는 상황이 발생했습니다.
3. **오류 유발**: 파이썬의 List 객체에는 `.values()`나 `.get()` 함수가 정의되어 있지 않으므로, 호출 시 아래와 같은 unhandled 예외가 발생하여 서버가 500 에러를 반환했습니다:
   * `AttributeError: 'list' object has no attribute 'values'` (퀴즈 제출 시)
   * `AttributeError: 'list' object has no attribute 'get'` (이벤트 전송 시)
4. **CORS 차단 현상**: 서버가 500 에러로 비정상 종료되면 브라우저 CORS 필터에 적절한 헤더가 전달되지 않아 콘솔창에 CORS 차단 경고(`No 'Access-Control-Allow-Origin' header is present`)가 함께 표시되었습니다.

---

## 3. 🛠️ 해결 조치 사항
서버 캐시 데이터가 Dictionary나 List 중 어떤 형태로 들어와도 안전하게 대응할 수 있도록 **방어적 코드(Defensive Coding)**를 적용했습니다.

### 1) 퀴즈 제출 API (`endpoints.py`) 수정:
```python
# quizzes가 dict 형태인지 list 형태인지 감지하여 단일 인터페이스(list)로 정규화
if isinstance(quizzes, dict):
    quiz_list = list(quizzes.values())
elif isinstance(quizzes, list):
    quiz_list = quizzes
else:
    quiz_list = []

target_quiz = next((q for q in quiz_list if q["quizId"] == req.quizId), None)
```

### 2) 퀴즈 선택 로직 (`quiz_service.py`) 수정:
```python
# quizzes가 list 형태일 경우, chunkId를 키로 가지는 dictionary로 변환하여 get() 지원
if isinstance(quizzes, list):
    quizzes = {
        (q.get("sourceChunkId") or q.get("chunkId") or q.get("source_chunk_id")): q
        for q in quizzes if isinstance(q, dict)
    }
```

---

## 🚀 사용자 테스트 가이드
1. 수정된 조치는 모두 메인 저장소(`origin/main`) 및 배포용 저장소(`personal/main`)에 정상 배포되었습니다.
2. **주의**: 500 에러가 났던 기존 브라우저 탭은 **이전 백엔드 버전에서 생성된 깨진 세션 ID**를 물고 있습니다. 
3. 해당 웹 페이지를 **새로고침(F5)하여 완전히 새로운 세션(Session ID)을 시작**하시면, 이후 스크롤 및 퀴즈 제출이 200 OK로 완벽하게 작동합니다.
