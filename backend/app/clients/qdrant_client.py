from typing import Optional

from qdrant_client import QdrantClient
from app.config import QDRANT_URL, QDRANT_API_KEY

qdrant: Optional[QdrantClient] = None

if QDRANT_URL:
    try:
        qdrant = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY or None)
    except Exception:
        qdrant = None
else:
    qdrant = None