import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
uri = os.getenv('MONGO_URI')
client = AsyncIOMotorClient(uri)
db = client.prithvinet

async def main():
    email = "shouryasinha23@gmail.com"
    doc = await db.users.find_one({"email": email})
    if doc:
        print(f"USER: {email}")
        print(f"ROLE: {doc.get('role')}")
        print(f"ENTITY_ID: {doc.get('entity_id')}")
        print(f"REGION_ID: {doc.get('region_id')}")
        print(f"MONGODB_ID: {str(doc.get('_id'))}")
    else:
        print(f"User {email} not found.")

if __name__ == "__main__":
    asyncio.run(main())
