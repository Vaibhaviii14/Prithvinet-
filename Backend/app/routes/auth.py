from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.database import db
from app.models.user import UserCreate, UserRegisterCitizen, UserResponse, UserRole, Token
from app.security import get_password_hash, verify_password, create_access_token
from app.dependencies import get_current_active_user, RoleChecker

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register/citizen", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_citizen(user: UserRegisterCitizen):
    """
    Open route: Allows public users (citizens) to create an account.
    The role is hardcoded to "citizen".
    """
    # Check if the user already exists using email directly
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Hash the password and save with the hardcoded "citizen" role
    hashed_password = get_password_hash(user.password)
    new_user = {
        "email": user.email,
        "hashed_password": hashed_password,
        "role": UserRole.CITIZEN,
        "is_active": True,
        "region_id": None,
        "entity_id": None
    }
    
    result = await db.users.insert_one(new_user)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=new_user["email"],
        role=new_user["role"],
        is_active=new_user["is_active"]
    )

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Login endpoint expecting OAuth2 form payload (username and password).
    Returns JWT access_token holding the email ("sub") and "role", intended 
    to drive frontend route redirection.
    """
    # Using 'username' here because OAuth2PasswordRequestForm inherently sets the field to 'username' string
    user_doc = await db.users.find_one({"email": form_data.username})
    
    if not user_doc or not verify_password(form_data.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(
        data={"sub": user_doc["email"], "role": user_doc["role"]}
    )
    
    # Send the role alongside the token to easily redirect user dynamically on login page
    return {"access_token": access_token, "token_type": "bearer", "role": user_doc["role"]}

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: UserResponse = Depends(get_current_active_user)):
    """
    Protected route: Returns user profile by evaluating Bearer token from headers.
    """
    return current_user

@router.post("/admin/onboard-user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def onboard_user(
    new_user: UserCreate, 
    current_admin: UserResponse = Depends(RoleChecker([UserRole.SUPER_ADMIN]))
):
    """
    Protected logic: Requires "super_admin" role.
    Creates accounts for RO, Industries, or Monitoring Team Members.
    """
    # Prevent assigning SUPER_ADMIN from this endpoint conceptually
    if new_user.role == UserRole.SUPER_ADMIN:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign Super Admin role directly from this route"
        )

    existing_user = await db.users.find_one({"email": new_user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    hashed_password = get_password_hash(new_user.password)
    user_data = {
        "email": new_user.email,
        "hashed_password": hashed_password,
        "role": new_user.role,
        "is_active": True,
        "region_id": new_user.region_id,
        "entity_id": new_user.entity_id
    }
    
    result = await db.users.insert_one(user_data)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=user_data["email"],
        role=user_data["role"],
        is_active=user_data["is_active"],
        region_id=user_data.get("region_id"),
        entity_id=user_data.get("entity_id")
    )

@router.post("/ro/onboard-team", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def onboard_monitoring_team(
    new_member: UserCreate, 
    current_ro: UserResponse = Depends(RoleChecker([UserRole.RO]))
):
    """
    Protected Logic: Requires "ro" Regional Officer.
    Creates accounts STRICTLY bounded to 'monitoring_team' role 
    that report/operate under the RO's authority/region.
    """
    if new_member.role != UserRole.MONITORING_TEAM:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Regional Officers can only onboard members to the 'monitoring_team'"
        )

    existing_user = await db.users.find_one({"email": new_member.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    hashed_password = get_password_hash(new_member.password)
    member_data = {
        "email": new_member.email,
        "hashed_password": hashed_password,
        "role": new_member.role,
        "is_active": True,
        # Force region_id mapping linking Monitoring staff cleanly onto the exact RO's region
        "region_id": new_member.region_id or current_ro.region_id,
        "entity_id": new_member.entity_id
    }
    
    result = await db.users.insert_one(member_data)
    
    return UserResponse(
        id=str(result.inserted_id),
        email=member_data["email"],
        role=member_data["role"],
        is_active=member_data["is_active"],
        region_id=member_data.get("region_id"),
        entity_id=member_data.get("entity_id")
    )

@router.get("/users", response_model=list[UserResponse])
async def get_users(role: str = None, region_id: str = None, current_user: UserResponse = Depends(get_current_active_user)):
    query = {}
    if role:
        query["role"] = role
    if region_id:
        query["region_id"] = region_id
        
    cursor = db.users.find(query)
    users = await cursor.to_list(length=100)
    
    # Map _id -> id
    formatted_users = []
    for u in users:
        u["id"] = str(u.pop("_id"))
        formatted_users.append(u)
        
    return formatted_users
