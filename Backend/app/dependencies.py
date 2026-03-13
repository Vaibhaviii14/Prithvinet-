from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from app.database import db
from app.models.user import UserDBModel, UserResponse, UserRole
from app.security import SECRET_KEY, ALGORITHM
from typing import List

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    """
    Dependency that decodes token and extracts user details from database.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None or role is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Find user in MongoDB using the injected email dependency mapped in token payload
    user_doc = await db.users.find_one({"email": email})
    
    if user_doc is None:
        raise credentials_exception
    
    # Map MongoDB document (_id) to standard user response format
    return UserResponse(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        role=user_doc["role"],
        is_active=user_doc["is_active"],
        region_id=user_doc.get("region_id"),
        entity_id=user_doc.get("entity_id")
    )


async def get_current_active_user(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    """
    Dependency to ensure the current authenticated user isn't suspended/inactive.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


class RoleChecker:
    """
    Factory class to instantiate FastAPI dependencies restricted by specified roles.
    Example Usage: Depends(RoleChecker(["super_admin", "ro"]))
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: UserResponse = Depends(get_current_active_user)) -> UserResponse:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {self.allowed_roles}"
            )
        return user
