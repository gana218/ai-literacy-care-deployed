# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────
# AI 리터러시 케어 — 단일 호스트 배포 이미지
# 1) 프론트(apps/web, Vite)를 빌드하고
# 2) 백엔드(3. Cognitive Care Backend, FastAPI)가 그 정적 파일을
#    같은 오리진(/)에서 서빙한다. → 링크 하나로 전체 동작.
# ─────────────────────────────────────────────────────────────

# ---- Stage 1: 프론트엔드 빌드 ----
FROM node:20-slim AS frontend
WORKDIR /fe
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web/ ./
# 같은 오리진 상대경로(/api)로 호출하도록 API base를 비워둠
ENV VITE_API_BASE_URL=""
ENV VITE_USE_MOCK="false"
RUN npm run build

# ---- Stage 2: 백엔드 + 정적 서빙 ----
FROM python:3.13-slim AS app
WORKDIR /app

# 시스템 의존성 최소화, 파이썬 의존성 설치
COPY ["3. Cognitive Care Backend/requirements.txt", "./requirements.txt"]
RUN pip install --no-cache-dir -r requirements.txt \
 && pip install --no-cache-dir "psycopg[binary]" aiosqlite greenlet

# 백엔드 소스 복사 (1·2번 vendored 포함)
COPY ["3. Cognitive Care Backend/", "./"]

# 빌드된 프론트 정적 파일을 백엔드가 서빙하는 위치로 복사
COPY --from=frontend /fe/dist ./frontend_dist

EXPOSE 8000

# DB/Redis 미제공 환경에서도 SQLite/InMemory로 자동 폴백 (lifespan에서 테이블 생성)
# import 루트가 app.* 이므로 backend/ 에서 uvicorn 실행
WORKDIR /app/backend
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
