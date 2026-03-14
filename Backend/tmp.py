import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import pprint
import json
from bson import json_util

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.prithvinet
    users = await db.users.find().to_list(10)
    industries = await db.industries.find().to_list(10)
    with open('dump.json', 'w') as f:
        f.write(json_util.dumps({'users': users, 'industries': industries}, indent=2))
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
