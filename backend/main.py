from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import psycopg2
import os
import uuid
import fitz
from dotenv import load_dotenv

from qdrant_client.models import VectorParams, Distance, PointStruct
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer

load_dotenv()

app = FastAPI()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

qdrant = QdrantClient(host=os.getenv("QDRANT_HOST", "qdrant"), port=6333)

model = SentenceTransformer("all-MiniLM-L6-v2")

@app.get("/")
def home():
    return {"status": "connected to db ✅"}

@app.get("/test-db")
def test_db():
    cur.execute("SELECT 1;")
    return {"db": "working ✅"}

@app.get("/test")
def get_test():
    cur = conn.cursor()
    cur.execute("SELECT * FROM test;")
    rows = cur.fetchall()
    return {"data": rows}

@app.post("/create-collection")
def create_collection():
    qdrant.recreate_collection(
        collection_name="documents",
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE
        ),
    )
    return {"status": "collection created "}

@app.get("/test-qdrant")
def test_qdrant():
    collections = qdrant.get_collections()
    return {"collections": collections}

@app.post("/add-text")
def add_text(text: str):
    vector = model.encode(text).tolist()

    qdrant.upsert(
        collection_name="documents",
        points=[
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"text": text}
            )
        ]
    )

    return {"status": "text added "}

@app.get("/search")
def search(query: str):
    query_vector = model.encode(query).tolist()

    results = qdrant.search(
        collection_name="documents",
        query_vector=query_vector,
        limit=3
    )

    return results

def extract_paragraphs_from_pdf(pdf_bytes: bytes) -> list[dict]:
    """
    Returnează o listă de dict-uri cu:
      - text: textul paragrafului
      - page: numărul paginii (1-indexed)
    Filtrează paragrafele goale sau prea scurte (sub 30 caractere).
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    paragraphs = []

    for page_num, page in enumerate(doc, start=1):
        blocks = page.get_text("blocks")
        for block in blocks:
            if block[6] != 0:
                continue
            text = block[4].strip()
            if len(text) < 30:
                continue
            paragraphs.append({
                "text": text,
                "page": page_num,
            })

    doc.close()
    return paragraphs

@app.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form(...),  
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Doar fișiere PDF sunt acceptate.")
    pdf_bytes = await file.read()
    paragraphs = extract_paragraphs_from_pdf(pdf_bytes)

    if not paragraphs:
        raise HTTPException(
            status_code=422,
            detail="PDF-ul nu conține text extractibil sau toate blocurile sunt prea scurte."
        )

    points = []
    for para in paragraphs:
        vector = model.encode(para["text"]).tolist()
        points.append(
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={
                    "text":     para["text"],
                    "subject":  subject,      
                    "filename": file.filename, 
                    "page":     para["page"], 
                }
            )
        )

    qdrant.upsert(
        collection_name="documents",
        points=points,
    )

    return {
        "status":        "document uploaded ✅",
        "filename":      file.filename,
        "subject":       subject,
        "total_chunks":  len(points),
    }
