
import asyncio
import os
import sys
from bson import ObjectId

# Ensure the parent directory is in the Python path to allow "app" imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db

async def check_users():
    print("Checking users in collection 'users'...")
    cursor = db.users.find({})
    users = await cursor.to_list(length=100)
    for u in users:
        print(f"Email: {u.get('email')}, Role: {u.get('role')}, Entity: {u.get('entity_id')}, Region: {u.get('region_id')}")

if __name__ == "__main__":
    asyncio.run(check_users())
