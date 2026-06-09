from fastapi import APIRouter

from app.schemas.auth_schemas import LoginRequest, RegisterRequest
from app.services.auth_service import login_user, register_user

router = APIRouter(prefix="/api/auth", tags=["Auth"])
legacy_router = APIRouter(tags=["Auth legacy"])


@router.post("/register")
def register(data: RegisterRequest):
    return register_user(email=data.email, password=data.password)


@router.post("/login")
def login(data: LoginRequest):
    return login_user(email=data.email, password=data.password)


@legacy_router.post("/register")
def legacy_register(data: RegisterRequest):
    return register_user(email=data.email, password=data.password)


@legacy_router.post("/login")
def legacy_login(data: LoginRequest):
    return login_user(email=data.email, password=data.password)
