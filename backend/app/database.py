import psycopg2
from psycopg2.extras import RealDictCursor

from app.config import DATABASE_URL


def get_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    return conn, cur


def get_dict_db():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    return conn, cur
