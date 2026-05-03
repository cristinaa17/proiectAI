from fastapi import FastAPI, UploadFile, File, Form, HTTPException
import psycopg2
import os
import uuid
import fitz
from dotenv import load_dotenv

from qdrant_client.models import Filter, FieldCondition, MatchValue, VectorParams, Distance, PointStruct
from qdrant_client import QdrantClient
from sentence_transformers import SentenceTransformer
from groq import Groq

from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from fastapi import Body
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()

app = FastAPI()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

qdrant = QdrantClient(host=os.getenv("QDRANT_HOST", "qdrant"), port=6333)

model = SentenceTransformer("all-MiniLM-L6-v2")

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        return user_id
    except:
        raise HTTPException(status_code=401, detail="Invalid token")


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
def add_text(text: str, user_id: int = Depends(get_current_user)):
    vector = model.encode(text).tolist()

    qdrant.upsert(
        collection_name="documents",
        points=[
            PointStruct(
                id=str(uuid.uuid4()),
                vector=vector,
                payload={"text": text, "user_id": user_id}
            )
        ]
    )

    return {"status": "text added "}

@app.get("/search")
def search(query: str, user_id: int = Depends(get_current_user)):
    query_vector = model.encode(query).tolist()

    results = qdrant.query_points(
        collection_name="documents",
        query=query_vector,
        query_filter=Filter(
            must=[
                FieldCondition(key="user_id", match=MatchValue(value=user_id))
            ]
        ),
        limit=3
    ).points

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
    user_id: int = Depends(get_current_user)
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
                    "user_id":  user_id,
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

@app.post("/chat")

async def chat(request: dict, user_id: int = Depends(get_current_user)):

    question = request.get("question")

    subject = request.get("subject", None)

    if not question:

        raise HTTPException(status_code=400, detail="Întrebarea nu poate fi goală.")

    # 1. Embed întrebarea

    query_vector = model.encode(question).tolist()

    # 2. Filtru user + subject

    query_filter = Filter(

        must=[

            FieldCondition(key="user_id", match=MatchValue(value=user_id))

        ]

    )

    if subject:

        query_filter.must.append(

            FieldCondition(key="subject", match=MatchValue(value=subject))

        )

    # 3. Query Qdrant

    results = qdrant.query_points(

        collection_name="documents",

        query=query_vector,

        query_filter=query_filter,

        limit=5

    ).points

    if not results:

        return {"answer": "Nu am găsit informații relevante."}

    # 4. Construiește contextul din chunks găsite
    context = "\n\n".join([r.payload["text"] for r in results])

    # 5. Trimite la Gemini
    prompt = f"""Ești MindCore, un asistent academic pentru studenții ULBS.
Răspunde la întrebarea studentului folosind DOAR informațiile din contextul de mai jos.
Dacă răspunsul nu se găsește în context, spune că nu ai informații despre asta.

Context:
{context}

Întrebarea studentului: {question}

Răspuns:"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    return {
        "answer": response.choices[0].message.content,
        "sources": [
            {"filename": r.payload["filename"], "page": r.payload["page"]}
            for r in results
    ]
}

def hash_password(password):
    return pwd_context.hash(password)

def verify_password(password, hashed):
    return pwd_context.verify(password, hashed)

def create_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=60)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@app.post("/register")
def register(request: dict):
    email = request.get("email")
    password = request.get("password")

    if not email or not email.lower().strip().endswith("@ulbsibiu.ro"):
        raise HTTPException(
            status_code=400,
            detail="Doar email-urile @ulbsibiu.ro sunt acceptate"
        )

    hashed = hash_password(password)

    try:
        cur.execute(
            'INSERT INTO "MindCore".users (email, password_hash) VALUES (%s, %s)',
            (email, hashed)
        )
        conn.commit()

        return {"message": "user created"}

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/login")

def login(data: dict = Body(...)):

    email = data.get("email")

    password = data.get("password")

    cur.execute('SELECT id, password_hash FROM "MindCore".users WHERE email=%s', (email,))

    user = cur.fetchone()

    if not user:

        raise HTTPException(status_code=400, detail="User not found")

    user_id, hashed_password = user

    if not verify_password(password, hashed_password):

        raise HTTPException(status_code=400, detail="Wrong password")

    token = create_token({"user_id": user_id})

    return {"access_token": token}
