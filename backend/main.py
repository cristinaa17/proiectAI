from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os
import uuid
import fitz
from dotenv import load_dotenv
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter

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

# Permitem frontend-ului de pe portul 5173 să comunice cu noi


load_dotenv()
app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Permite toate metodele (GET, POST, PUT, DELETE etc.)
    allow_headers=["*"], # Permite toate headerele
)

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

qdrant = QdrantClient(
    url=os.getenv("QDRANT_URL"),
    api_key=os.getenv("QDRANT_API_KEY"),
)

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
from fastapi import HTTPException

@app.get("/test-db")
def test_db():
    try:
        cur.execute("SELECT 1;")
        return {"db": "working ✅"}
    except Exception as e:
        # Prindem orice eroare și returnăm textul/codul ei
        raise HTTPException(
            status_code=500, 
            detail=f"Eroare la conexiunea cu baza de date: {str(e)}"
        )

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


@app.on_event("startup")
def setup():
    qdrant.create_payload_index(
        collection_name="documents",
        field_name="user_id",
        field_schema="integer"
    )


@app.get("/search")
def search(query: str, user_id: int = Depends(get_current_user)):
    try:
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

        return [
            {
                "id": r.id,
                "score": r.score,
                "payload": r.payload
            }
            for r in results
        ]

    except Exception as e:
        print("EROARE SEARCH:", str(e))
        raise HTTPException(status_code=500, detail=str(e))


def extract_smart_chunks_from_pdf(pdf_bytes: bytes):
    # Deschidem PDF-ul din memorie
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    
    # Setăm splitter-ul inteligent
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,       # Dimensiunea maximă a unui chunk (în caractere)
        chunk_overlap=150,    # Câte caractere din chunk-ul vechi păstrăm în cel nou
        separators=["\n\n", "\n", ".", " ", ""],
        length_function=len
    )

    chunks = []
    
    for page_num in range(len(doc)):
        page_text = doc[page_num].get_text("text")
        
        # Curățăm whitespace-urile excesive care strică contextul
        page_text = " ".join(page_text.split())
        
        if not page_text:
            continue
            
        # Împărțim textul paginii în chunk-uri
        page_chunks = text_splitter.split_text(page_text)
        
        for chunk in page_chunks:
            chunks.append({
                "text": chunk,
                "page": page_num + 1 # Indexăm de la pagina 1
            })
            
    return chunks


@app.post("/upload-document")
async def upload_document(
    file: UploadFile = File(...),
    subject: str = Form(...),  
    user_id: int = Depends(get_current_user)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Doar fișiere PDF sunt acceptate.")
    
    pdf_bytes = await file.read()
    
    # Folosim noua funcție aici:
    chunks = extract_smart_chunks_from_pdf(pdf_bytes)

    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="PDF-ul nu conține text."
        )

    print(f"Încep procesarea pentru {len(chunks)} chunk-uri de text...")

    batch_size = 50
    total_uploaded = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        points = []

        for item in batch:
            # Modelul primește acum un text mai mare, curat și cu context
            vector = model.encode(item["text"]).tolist() 
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "text": item["text"],
                        "subject": subject,      
                        "filename": file.filename, 
                        "page": item["page"], 
                        "user_id": user_id,
                    }
                )
            )
        
        qdrant.upsert(
            collection_name="documents",
            points=points,
        )
        
        total_uploaded += len(points)
        print(f"Progres: {total_uploaded}/{len(chunks)} chunk-uri încărcate...")

    return {
        "status": "document uploaded in batches ✅",
        "filename": file.filename,
        "total_chunks": len(chunks),
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

   # 5. Trimite la Groq cu un prompt de "Profesor/Tutor"
    prompt = f"""Ești MindCore, un asistent academic și un tutore răbdător pentru studenții ULBS.
Răspunde la întrebarea studentului pornind de la contextul de mai jos. 
Sarcina ta este să folosești informația din context ca bază, dar SĂ O EXPLICI detaliat. 
Ai voie să adaugi explicații suplimentare, să detaliezi conceptele și să folosești cunoștințele tale generale pentru a ajuta studentul să înțeleagă cât mai bine subiectul. Fii prietenos, folosește un ton educațional și dezvoltă ideea astfel încât răspunsul să fie amplu și util.

Context:
{context}

Întrebarea studentului: {question}

Răspuns:"""

    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.6  # 👈 Am crescut temperatura ca să fie creativ în explicații
    )

    # 6. Extragem sursele unice (fără duplicate)
    unique_sources = []
    seen = set()
    for r in results:
        source_id = (r.payload["filename"], r.payload["page"])
        if source_id not in seen:
            seen.add(source_id)
            unique_sources.append({"filename": r.payload["filename"], "page": r.payload["page"]})

    # 7. Returnăm răspunsul curat către frontend
    return {
        "answer": response.choices[0].message.content,
        "sources": unique_sources
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
