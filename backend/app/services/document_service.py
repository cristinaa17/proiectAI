from fastapi import HTTPException, UploadFile

from app.services.pdf_service import extract_smart_chunks_from_pdf
from app.services.qdrant_service import upload_chunks
from app.database import get_db, get_dict_db


async def process_uploaded_document(
    file: UploadFile,
    subject: str,
    user_id: int
) -> dict:

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Doar fișiere PDF sunt acceptate."
        )

    pdf_bytes = await file.read()

    chunks = extract_smart_chunks_from_pdf(pdf_bytes)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="PDF-ul nu conține text."
        )

    total_uploaded = upload_chunks(
        chunks=chunks,
        filename=file.filename,
        subject=subject,
        user_id=user_id
    )

    conn, cur = get_db()

    try:

        cur.execute(
            '''
            INSERT INTO "MindCore".documents
            (
                user_id,
                title,
                file_name
            )
            VALUES (%s, %s, %s)
            ''',
            (
                user_id,
                subject,
                file.filename
            )
        )

        conn.commit()

    except Exception as exc:

        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )

    finally:

        cur.close()
        conn.close()

    return {
        "status": "document uploaded in batches ✅",
        "filename": file.filename,
        "total_chunks": total_uploaded,
    }
    
def get_user_documents(user_id: int):

    conn, cur = get_dict_db()

    try:

        cur.execute(

            '''

            SELECT

                id,

                title,

                file_name,

                created_at

            FROM "MindCore".documents

            WHERE user_id = %s

            ORDER BY created_at DESC

            ''',

            (user_id,)

        )

        return cur.fetchall()

    finally:

        cur.close()

        conn.close()