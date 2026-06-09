from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routes.auth import legacy_router as legacy_auth_router
from app.routes.auth import router as auth_router
from app.routes.chat import legacy_router as legacy_chat_router
from app.routes.chat import router as chat_router
from app.routes.documents import legacy_router as legacy_documents_router
from app.routes.documents import router as documents_router
from app.routes.health import router as health_router
from app.services.qdrant_service import ensure_collection

app = FastAPI(title="MindCore API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(documents_router)

app.include_router(legacy_auth_router)
app.include_router(legacy_chat_router)
app.include_router(legacy_documents_router)

app.include_router(health_router)


@app.on_event("startup")
def setup_vector_database():
    try:
        ensure_collection()
        print("Qdrant initialized")
    except Exception as e:
        print("Qdrant initialization skipped:", e)