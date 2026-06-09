# MindCore Backend Modular

Backend refactorizat pe structură inspirată din CampusMind, dar adaptat pe codul vostru existent.

## Pornire locală

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Swagger:
```text
http://localhost:8000/docs
```

## Rute noi

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/documents/upload`
- `POST /api/chat/conversation`
- `POST /api/chat`

## Rute vechi păstrate pentru frontend

- `POST /register`
- `POST /login`
- `POST /upload-document`
- `POST /create-conversation`
- `POST /chat`
