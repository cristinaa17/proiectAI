from fastapi import APIRouter, HTTPException

from app.database import get_db

router = APIRouter(tags=["Health"])


@router.get("/")
def home():
    return {"status": "MindCore API running ✅"}


@router.get("/test-db")
def test_db():
    conn, cur = get_db()

    try:
        cur.execute("SELECT 1;")
        return {"db": "working ✅"}

    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Eroare DB: {str(exc)}")

    finally:
        cur.close()
        conn.close()
