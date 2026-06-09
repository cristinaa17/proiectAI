import psycopg2
from fastapi import HTTPException

from app.database import get_db
from app.security.security import create_token, hash_password, verify_password


def register_user(email: str, password: str) -> dict:
    if not email:
        raise HTTPException(status_code=400, detail="Email invalid")

    conn, cur = get_db()

    try:
        cur.execute(
            '''
            INSERT INTO "MindCore".users (email, password_hash)
            VALUES (%s, %s)
            ''',
            (email, hash_password(password)),
        )
        conn.commit()
        return {"message": "user created"}

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")

    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))

    finally:
        cur.close()
        conn.close()


def login_user(email: str, password: str) -> dict:
    conn, cur = get_db()

    try:
        cur.execute(
            '''
            SELECT id, password_hash
            FROM "MindCore".users
            WHERE email=%s
            ''',
            (email,),
        )
        user = cur.fetchone()

    finally:
        cur.close()
        conn.close()

    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    user_id, hashed_password = user

    if not verify_password(password, hashed_password):
        raise HTTPException(status_code=400, detail="Wrong password")

    return {"access_token": create_token({"user_id": user_id})}
