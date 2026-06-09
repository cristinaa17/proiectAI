from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.clients.qdrant_client import qdrant
from app.security.security import get_current_user
from app.services.document_service import process_uploaded_document
from app.services.qdrant_service import add_text_for_user, recreate_collection, search_documents
from app.services.document_service import get_user_documents
from app.security.security import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/api/documents", tags=["Documents"])
legacy_router = APIRouter(tags=["Documents legacy"])


@router.post("/create-collection")
def create_collection():
    try:
        recreate_collection()
        return {"status": "collection created"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


@router.get("/test-qdrant")
def test_qdrant():
    if qdrant is None:
        return {"status": "qdrant_not_configured"}

    return {"collections": qdrant.get_collections()}


@router.post("/add-text")
def add_text(text: str, user_id: int = Depends(get_current_user)):
    point_id = add_text_for_user(text=text, user_id=user_id)
    return {"status": "text added", "id": point_id}


@router.get("/search")
def search(query: str, user_id: int = Depends(get_current_user)):
    results = search_documents(query=query, user_id=user_id, limit=10)
    return [{"id": str(result.id), "score": result.score, "payload": result.payload} for result in results]


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form(...),
    user_id: int = Depends(get_current_user),
):
    return await process_uploaded_document(file=file, subject=subject, user_id=user_id)


@legacy_router.post("/create-collection")
def legacy_create_collection():
    return create_collection()


@legacy_router.get("/test-qdrant")
def legacy_test_qdrant():
    return test_qdrant()


@legacy_router.post("/add-text")
def legacy_add_text(text: str, user_id: int = Depends(get_current_user)):
    return add_text(text=text, user_id=user_id)


@legacy_router.get("/search")
def legacy_search(query: str, user_id: int = Depends(get_current_user)):
    return search(query=query, user_id=user_id)


@legacy_router.post("/upload-document")
async def legacy_upload_document(
    file: UploadFile = File(...),
    subject: str = Form(...),
    user_id: int = Depends(get_current_user),
):
    return await upload_document(file=file, subject=subject, user_id=user_id)

@router.get("")
def get_documents(
    current_user: int = Depends(get_current_user)
):
    return get_user_documents(
        user_id=current_user
    )