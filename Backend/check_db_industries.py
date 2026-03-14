
import asyncio
import os
import sys
from bson import ObjectId

# Ensure the parent directory is in the Python path to allow "app" imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db

async def check_industries():
    print("Checking industries in collection 'industries'...")
    cursor = db.industries.find({})
    industries = await cursor.to_list(length=100)
    for ind in industries:
        print(f"ID: {str(ind['_id'])}, Name: {ind.get('name')}, Region: {ind.get('region_id')}, Status: {ind.get('status')}")
    
    print("\nChecking ROs in collection 'regional_offices'...")
    cursor = db.regional_offices.find({})
    ros = await cursor.to_list(length=100)
    for ro in ros:
        print(f"ID: {str(ro['_id'])}, Name: {ro.get('name')}")

if __name__ == "__main__":
    asyncio.run(check_industries())
