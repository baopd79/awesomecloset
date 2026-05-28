from typing import Annotated

from arq import ArqRedis
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.core.config import settings
from backend.core.database import get_db

bearer = HTTPBearer()


async def get_arq(request: Request) -> ArqRedis:
    return request.app.state.arq


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


CurrentUserDep = Annotated[str, Depends(get_current_user_id)]
SessionDep = Annotated[AsyncSession, Depends(get_db)]
ArqDep = Annotated[ArqRedis, Depends(get_arq)]
