from fastapi import HTTPException

from app.clients.groq_client import groq_client
from app.config import GROQ_MODEL
from app.database import get_db
from app.services.qdrant_service import search_documents
from app.database import get_dict_db
import traceback

def create_conversation_for_user(user_id: int) -> dict:
    conn, cur = get_db()

    try:
        cur.execute(
            '''
            INSERT INTO "MindCore".conversations (user_id, title)
            VALUES (%s, %s)
            RETURNING id
            ''',
            (user_id, "New chat"),
        )

        conversation_id = cur.fetchone()[0]
        conn.commit()

        return {"conversation_id": conversation_id}

    except Exception as exc:
        conn.rollback()
        print("\n========== ERROR ==========")
        traceback.print_exc()
        print("===========================\n")
        raise HTTPException(status_code=500, detail=str(exc))

    finally:
        cur.close()
        conn.close()


def save_message(cur, conversation_id: int, role: str, content: str) -> None:
    cur.execute(
        '''
        INSERT INTO "MindCore".messages (conversation_id, role, content)
        VALUES (%s, %s, %s)
        ''',
        (conversation_id, role, content),
    )


def get_conversation_history(cur, conversation_id: int) -> str:
    cur.execute(
        '''
        SELECT role, content
        FROM "MindCore".messages
        WHERE conversation_id = %s
        ORDER BY created_at ASC
        ''',
        (conversation_id,),
    )

    history = cur.fetchall()

    return "\n".join(
        [f"{role}: {content}" for role, content in history]
    )


def build_sources(results) -> list[dict]:
    unique_sources = []
    seen = set()

    for result in results:
        payload = result.payload or {}

        filename = payload.get("filename")
        page = payload.get("page")

        if not filename or page is None:
            continue

        source_id = (filename, page)

        if source_id not in seen:
            seen.add(source_id)

            unique_sources.append(
                {
                    "filename": filename,
                    "page": page,
                }
            )

    return unique_sources


def build_prompt(
    history_text: str,
    context: str,
    question: str,
) -> str:
    return f"""
Ești MindCore, un asistent AI academic pentru studenți.

Folosește STRICT informațiile din CONTEXT.

Nu folosi cunoștințe externe.

Dacă răspunsul nu poate fi găsit în CONTEXT,
spune exact:

Nu am găsit informația în cursurile încărcate.

Răspunde:
- clar
- structurat
- academic
- pe înțelesul studentului

ISTORIC:
{history_text}

CONTEXT:
{context}

ÎNTREBARE:
{question}
"""


def generate_answer(prompt: str) -> str:

    try:

        if groq_client is None:
            return "Groq client este None"

        response = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4
        )

        return response.choices[0].message.content

    except Exception as e:

        print("GROQ ERROR:", e)

        return f"EROARE GROQ: {str(e)}"


def answer_question(
    question: str,
    conversation_id: int,
    user_id: int,
    subject: str | None = None,
) -> dict:

    if not question:
        raise HTTPException(
            status_code=400,
            detail="Întrebarea nu poate fi goală.",
        )

    if not conversation_id:
        raise HTTPException(
            status_code=400,
            detail="conversation_id is required",
        )

    conn, cur = get_db()

    try:
        save_message(
            cur,
            conversation_id,
            "user",
            question,
        )
        
        cur.execute(
            '''
            SELECT title
            FROM "MindCore".conversations
            WHERE id = %s
            ''',
            (conversation_id,)
        )

        current_title = cur.fetchone()[0]

        if current_title == "New chat":
            title = question[:60]

            cur.execute(
                '''
                UPDATE "MindCore".conversations
                SET title = %s
                WHERE id = %s
                ''',
                (
                    title,
                    conversation_id,
                ),
            )

        conn.commit()

        history_text = get_conversation_history(
            cur,
            conversation_id,
        )

        results = search_documents(
            query=question,
            user_id=user_id,
            limit=5,
        )

        for result in results:
            try:
                print("SCORE =", result.score)
            except Exception:
                pass
    
        if not results:
            answer = "Nu am găsit informația în cursurile încărcate."

            save_message(
                cur,
                conversation_id,
                "assistant",
                answer,
            )

            conn.commit()

            return {
                "answer": answer,
                "sources": [],
            }

        context = "\n\n".join(
            [
                (result.payload or {}).get("text", "")
                for result in results
                if result.payload
            ]
        )

        prompt = build_prompt(
            history_text=history_text,
            context=context,
            question=question,
        )

        answer = generate_answer(prompt)

        save_message(
            cur,
            conversation_id,
            "assistant",
            answer,
        )

        conn.commit()

        return {
            "answer": answer,
            "sources": build_sources(results),
        }

    except Exception as exc:
        conn.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    finally:
        cur.close()
        conn.close()
        
def get_user_conversations(user_id: int):
    conn, cur = get_dict_db()

    try:
        cur.execute(
            '''
            SELECT
                id,
                title,
                created_at
            FROM "MindCore".conversations
            WHERE user_id = %s
            ORDER BY created_at DESC
            ''',
            (user_id,)
        )

        return cur.fetchall()

    finally:
        cur.close()
        conn.close()


def get_conversation_messages(
    conversation_id: int,
    user_id: int,
):
    conn, cur = get_dict_db()

    try:
        cur.execute(
            '''
            SELECT id
            FROM "MindCore".conversations
            WHERE id = %s
            AND user_id = %s
            ''',
            (
                conversation_id,
                user_id,
            )
        )

        conversation = cur.fetchone()

        if not conversation:
            raise HTTPException(
                status_code=404,
                detail="Conversation not found"
            )

        cur.execute(
            '''
            SELECT
                id,
                role,
                content,
                created_at
            FROM "MindCore".messages
            WHERE conversation_id = %s
            ORDER BY created_at ASC
            ''',
            (conversation_id,)
        )

        return cur.fetchall()

    finally:
        cur.close()
        conn.close()
        
def delete_conversation(conversation_id: int, user_id: int):
    conn, cur = get_db()
    try:
        # verify ownership
        cur.execute(
            '''
            SELECT id FROM "MindCore".conversations
            WHERE id = %s AND user_id = %s
            ''',
            (conversation_id, user_id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Conversation not found")

        cur.execute(
            'DELETE FROM "MindCore".messages WHERE conversation_id = %s',
            (conversation_id,)
        )
        cur.execute(
            'DELETE FROM "MindCore".conversations WHERE id = %s',
            (conversation_id,)
        )
        conn.commit()
        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        cur.close()
        conn.close()


def update_conversation_title(
    conversation_id: int,
    title: str,
):
    conn, cur = get_db()

    try:

        cur.execute(
            '''
            UPDATE "MindCore".conversations
            SET title = %s
            WHERE id = %s
            ''',
            (
                title,
                conversation_id,
            )
        )

        conn.commit()

    finally:

        cur.close()
        conn.close()
