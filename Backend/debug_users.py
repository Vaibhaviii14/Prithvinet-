import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
uri = os.getenv('MONGO_URI')
client = AsyncIOMotorClient(uri)
db = client.prithvinet

async def main():
    print(f"Checking users in: {uri.split('@')[-1]}")
    docs = await db.users.find({"role": "ro"}).to_list(100)
    print(f"Found {len(docs)} users.")
    for index, doc in enumerate(docs):
        print(f"USER_{index}: {doc}")

if __name__ == "__main__":
    asyncio.run(main())
