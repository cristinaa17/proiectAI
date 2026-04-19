from fastapi import FastAPI
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor()

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