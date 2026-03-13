from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum

class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"          # Super Admin (State HQ)
    RO = "ro"                            # Regional Officer (RO)
    MONITORING_TEAM = "monitoring_team"  # Monitoring Team
    INDUSTRY = "industry"                # Industry User
    CITIZEN = "citizen"                  # Citizen

class UserDBModel(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    email: EmailStr
    hashed_password: str
    role: UserRole
    is_active: bool = True
    region_id: Optional[str] = None      # Ties ROs and Industries to specific regions/master data
    entity_id: Optional[str] = None      # Ties users to specific entities

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: UserRole = UserRole.CITIZEN
    region_id: Optional[str] = None
    entity_id: Optional[str] = None

class UserRegisterCitizen(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    role: UserRole
    is_active: bool
    region_id: Optional[str] = None
    entity_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: UserRole
