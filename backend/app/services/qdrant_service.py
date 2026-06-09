import uuid

from qdrant_client.models import Distance, FieldCondition, Filter, MatchValue, PointStruct, VectorParams

from app.clients.embedding_model import embedding_model
from app.clients.qdrant_client import qdrant
from app.config import QDRANT_COLLECTION


def ensure_collection() -> None:
    if qdrant is None:
        raise RuntimeError("Qdrant client is not configured (QDRANT_URL or client init failed)")

    existing = [collection.name for collection in qdrant.get_collections().collections]

    if QDRANT_COLLECTION not in existing:
        qdrant.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )

    try:
        qdrant.create_payload_index(
            collection_name=QDRANT_COLLECTION,
            field_name="user_id",
            field_schema="integer",
        )
    except Exception:
        pass


def recreate_collection() -> None:
    qdrant.recreate_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )
    ensure_collection()


def add_text_for_user(text: str, user_id: int) -> str:
    if qdrant is None:
        raise RuntimeError("Qdrant client is not configured")

    vector = embedding_model.encode(text).tolist()
    point_id = str(uuid.uuid4())

    qdrant.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[PointStruct(id=point_id, vector=vector, payload={"text": text, "user_id": user_id})],
    )

    return point_id


def upload_chunks(chunks: list[dict], filename: str, subject: str, user_id: int) -> int:
    batch_size = 50
    uploaded = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        points = []

        for item in batch:
            if qdrant is None:
                raise RuntimeError("Qdrant client is not configured")

            vector = embedding_model.encode(item["text"]).tolist()
            points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={
                        "text": item["text"],
                        "subject": subject,
                        "filename": filename,
                        "page": item["page"],
                        "user_id": user_id,
                    },
                )
            )

        qdrant.upsert(collection_name=QDRANT_COLLECTION, points=points)
        uploaded += len(points)

    return uploaded

def search_documents(
    query: str,
    user_id: int | None = None,
    limit: int = 10,
):

    if qdrant is None:

        print("QDRANT IS NONE")

        return []

    query_vector = embedding_model.encode(query).tolist()

    query_filter = None

    if user_id is not None:

        query_filter = Filter(
            must=[
                FieldCondition(
                    key="user_id",
                    match=MatchValue(value=user_id)
                )
            ]
        )

    try:

        return qdrant.query_points(
            collection_name=QDRANT_COLLECTION,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
        ).points

    except Exception as e:

        print("QDRANT SEARCH ERROR:", e)

        return []