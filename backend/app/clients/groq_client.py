from typing import Optional

from groq import Groq
from app.config import GROQ_API_KEY

groq_client: Optional[Groq] = None

if GROQ_API_KEY:
	try:
		groq_client = Groq(api_key=GROQ_API_KEY)
	except Exception:
		groq_client = None
else:
	groq_client = None
