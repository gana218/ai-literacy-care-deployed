# AI Literacy Care Backend

본 저장소는 2026 AI/SW 경진대회 프로젝트의 **3번 역할(Cognitive Care Agent 및 실시간 데이터 파이프라인)** 코드를 담고 있습니다.

## 🚀 빠른 시작 가이드 (Quick Start)

백엔드를 실행하기 위해 로컬에 Python을 직접 설치할 필요가 없습니다. Docker만 설치되어 있다면 단 한 줄의 명령어로 DB, Redis, 서버가 모두 실행됩니다.

1. **저장소를 클론합니다.**
   ```bash
   git clone https://github.com/naaaayeonn/AI-literacy-care-Agent.git
   cd AI-literacy-care-Agent
   git checkout feature/backend
   ```

2. **도커를 실행합니다.**
   ```bash
   docker-compose up -d --build
   ```

3. **서버 확인**
   - 백엔드 API 명세서 (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
   - 정상 가동 중이라면 위 링크에서 `/api/sessions/start` 와 `/api/sessions/{session_id}/finish` API를 테스트할 수 있습니다.

## 🔌 프론트엔드 연동 정보
- **REST API Base URL**: `http://localhost:8000`
- **WebSocket Endpoint**: `ws://localhost:8000/ws/session/{session_id}`

### 세션 시작 (Start Session)
`POST /api/sessions/start`
```json
{
  "user_id": "user_123",
  "document_id": "doc_abc"
}
```
**응답 (Response)**: `session_id` 발급

### 실시간 데이터 전송 (WebSocket)
프론트엔드에서 사용자가 글을 읽는 동안, 아래와 같은 JSON을 웹소켓으로 지속적으로 보냅니다.
```json
{
  "events": [
    {"type": "scroll", "timestamp_ms": 1700000000, "position": 0.45},
    {"type": "blur", "duration_ms": 3000}
  ]
}
```

### 세션 종료 및 점수 저장 (Finish Session)
`POST /api/sessions/{session_id}/finish`
- 웹소켓 연결 종료 후 호출합니다. Redis에 쌓였던 로그가 DB로 영구 저장됩니다.
