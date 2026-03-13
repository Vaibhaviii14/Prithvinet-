
import asyncio
import os
import sys

# Ensure the parent directory is in the Python path to allow "app" imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db
from app.security import get_password_hash
from app.models.user import UserRole


async def seed_super_admin():
    print("Checking database for existing Super Admin...")
    
    # Check if a super admin already exists to prevent duplicate entries
    admin_exists = await db.users.find_one({"role": UserRole.SUPER_ADMIN})
    if admin_exists:
        print(f"Super Admin already exists with email: {admin_exists['email']}. Skipping seed.")
        return

    print("No Super Admin found. Creating master account...")
    
    # The default password. Change this once you log in!
    plain_password = "SuperSecretPassword123!" 
    hashed_password = get_password_hash(plain_password)
    
    super_admin_user = {
        "email": "meranaam@gmail.com",
        "hashed_password": hashed_password,
        "role": UserRole.SUPER_ADMIN,
        "is_active": True,
        "region_id": "STATE_HQ", # Helps identify this is the master account
        "entity_id": None
    }

    result = await db.users.insert_one(super_admin_user)
    
    print("✅ Super Admin created successfully!")
    print("-" * 30)
    print(f"User ID: {result.inserted_id}")
    print(f"Email:   {super_admin_user['email']}")
    print(f"Pass:    {plain_password}")
    print("-" * 30)
    print("You can now use these credentials to hit the /api/auth/login endpoint.")

if __name__ == "__main__":
    # Run the async function using asyncio
    asyncio.run(seed_super_admin())