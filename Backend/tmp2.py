import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def test():
    db = AsyncIOMotorClient('mongodb://localhost:27017').prithvinet
    industry_id_str = "69b3a4fb550dfcd479f58c79"
    industry_object_id = ObjectId(industry_id_str)
    
    industry = await db.industries.find_one({"_id": industry_object_id})
    print("Found industry:", industry)
    if industry:
        print("Industry Region ID:", industry.get("region_id"))
        ro_user = await db.users.find_one({"role": "ro", "region_id": industry.get("region_id")})
        print("RO USER WITH string 'ro':", ro_user)
        
        ro_user2 = await db.users.find_one({"region_id": industry.get("region_id")})
        print("ANY USER IN REGION:", ro_user2)
        
        ro_user3 = await db.users.find_one({"role": "ro", "region_id": str(industry.get("region_id"))})
        print("RO USER WITH str(region_id):", ro_user3)

if __name__ == "__main__":
    asyncio.run(test())
