
import asyncio
import os
import sys
from bson import ObjectId

# Ensure the parent directory is in the Python path to allow "app" imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db

async def check_locations():
    print("Checking monitoring locations in collection 'monitoring_locations'...")
    cursor = db.monitoring_locations.find({})
    locations = await cursor.to_list(length=100)
    for loc in locations:
        print(f"ID: {str(loc['_id'])}, Name: {loc.get('name')}, Industry: {loc.get('industry_id')}, Region: {loc.get('region_id')}")

if __name__ == "__main__":
    asyncio.run(check_locations())
