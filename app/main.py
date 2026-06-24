import uvicorn
from fastapi import FastAPI

from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine
from app.models.base_class import Base

# Create database tables (For development/MVP database seeding)
# In production, alembic migrations would be used.
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully.")
except Exception as e:
    print(f"Database table initialization failed: {e}")

app = FastAPI(

    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register WebSocket router
from app.websocket.endpoint import router as websocket_router
app.include_router(websocket_router)

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "project": settings.PROJECT_NAME
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
