from fastapi import APIRouter, Depends, status, HTTPException
from typing import List
from bson import ObjectId

from app.database import db
from app.dependencies import get_current_active_user, RoleChecker
from app.models.user import UserResponse
from app.models.master import (
    RegionalOfficeCreate, RegionalOfficeUpdate, RegionalOfficeResponse,
    IndustryCreate, IndustryUpdate, IndustryResponse,
    MonitoringLocationCreate, MonitoringLocationResponse,
    PrescribedLimitCreate, PrescribedLimitUpdate, PrescribedLimitResponse
)

router = APIRouter(prefix="/api/master", tags=["Master Data"])

# Helper function to map MongoDB _id to string id
def map_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# Regional Offices
# ==========================================

@router.post("/regional-offices", response_model=RegionalOfficeResponse, status_code=status.HTTP_201_CREATED)
async def create_regional_office(
    ro_data: RegionalOfficeCreate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin"]))
):
    """Creates a new Regional Office. Requires 'super_admin' role."""
    new_ro = await db.regional_offices.insert_one(ro_data.model_dump())
    created_ro = await db.regional_offices.find_one({"_id": new_ro.inserted_id})
    return map_id(created_ro)

@router.get("/regional-offices", response_model=List[RegionalOfficeResponse])
async def get_regional_offices(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Returns all Regional Offices."""
    cursor = db.regional_offices.find({})
    ros = await cursor.to_list(length=100)
    return [map_id(ro) for ro in ros]

@router.put("/regional-offices/{ro_id}", response_model=RegionalOfficeResponse)
async def update_regional_office(
    ro_id: str,
    update_data: RegionalOfficeUpdate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin"]))
):
    """Updates a regional office."""
    if not ObjectId.is_valid(ro_id):
        raise HTTPException(status_code=400, detail="Invalid RO ID format")

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = await db.regional_offices.update_one({"_id": ObjectId(ro_id)}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Regional Office not found")

    updated_ro = await db.regional_offices.find_one({"_id": ObjectId(ro_id)})
    return map_id(updated_ro)

@router.delete("/regional-offices/{ro_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_regional_office(
    ro_id: str,
    current_user: UserResponse = Depends(RoleChecker(["super_admin"]))
):
    """Deletes a regional office."""
    if not ObjectId.is_valid(ro_id):
        raise HTTPException(status_code=400, detail="Invalid RO ID format")
        
    result = await db.regional_offices.delete_one({"_id": ObjectId(ro_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Regional Office not found")

# ==========================================
# Industries
# ==========================================

@router.post("/industries", response_model=IndustryResponse, status_code=status.HTTP_201_CREATED)
async def create_industry(
    industry_data: IndustryCreate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin", "ro"]))
):
    """Creates a new Industry. Requires 'super_admin' or 'ro' role."""
    new_industry = await db.industries.insert_one(industry_data.model_dump())
    created_industry = await db.industries.find_one({"_id": new_industry.inserted_id})
    return map_id(created_industry)

@router.get("/industries", response_model=List[IndustryResponse])
async def get_industries(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Returns Industries. 
    If user is RO, returns only industries in their region.
    Otherwise, returns all.
    """
    query = {}
    if current_user.role == "ro":
        query["region_id"] = current_user.region_id

    cursor = db.industries.find(query)
    industries = await cursor.to_list(length=100)
    return [map_id(ind) for ind in industries]

@router.put("/industries/{industry_id}", response_model=IndustryResponse)
async def update_industry(
    industry_id: str,
    update_data: IndustryUpdate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin", "ro"]))
):
    """Updates an industry (e.g., Suspending a non-compliant factory)."""
    if not ObjectId.is_valid(industry_id):
        raise HTTPException(status_code=400, detail="Invalid Industry ID format")

    # Drop None values so we only update provided fields
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    # If user is RO, ensure they only update industries in their region
    query = {"_id": ObjectId(industry_id)}
    if current_user.role == "ro":
        query["region_id"] = current_user.region_id

    result = await db.industries.update_one(query, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Industry not found or unauthorized")

    updated_industry = await db.industries.find_one({"_id": ObjectId(industry_id)})
    return map_id(updated_industry)

@router.delete("/industries/{industry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_industry(
    industry_id: str,
    current_user: UserResponse = Depends(RoleChecker(["super_admin", "ro"]))
):
    """Deletes an industry."""
    if not ObjectId.is_valid(industry_id):
        raise HTTPException(status_code=400, detail="Invalid Industry ID format")

    # If user is RO, ensure they only delete industries in their region
    query = {"_id": ObjectId(industry_id)}
    if current_user.role == "ro":
        query["region_id"] = current_user.region_id

    result = await db.industries.delete_one(query)
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Industry not found or unauthorized")

# ==========================================
# Monitoring Locations
# ==========================================

@router.post("/locations", response_model=MonitoringLocationResponse, status_code=status.HTTP_201_CREATED)
async def create_location(
    location_data: MonitoringLocationCreate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin", "ro"]))
):
    """
    Creates a new Monitoring Location. Requires 'super_admin' or 'ro' role.
    If user is RO, forces region_id to be current_user.region_id.
    """
    data_dict = location_data.model_dump()
    
    if current_user.role == "ro" and current_user.region_id:
        data_dict["region_id"] = current_user.region_id

    new_location = await db.monitoring_locations.insert_one(data_dict)
    created_location = await db.monitoring_locations.find_one({"_id": new_location.inserted_id})
    return map_id(created_location)

@router.get("/locations", response_model=List[MonitoringLocationResponse])
async def get_locations():
    """
    Returns all Monitoring Locations. Open route for frontend heatmaps.
    """
    cursor = db.monitoring_locations.find({})
    locations = await cursor.to_list(length=1000)
    return [map_id(loc) for loc in locations]

# ==========================================
# Prescribed Limits
# ==========================================

@router.post("/limits", response_model=PrescribedLimitResponse, status_code=status.HTTP_200_OK)
async def create_limit(
    limit_data: PrescribedLimitCreate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin"]))
):
    """
    Upserts an environmental limit. Requires 'super_admin' role.
    If a limit for the given category and parameter exists, it updates the max limit and unit.
    Otherwise, it creates a new one.
    """
    query = {
        "category": limit_data.category,
        "parameter": limit_data.parameter
    }
    
    update = {
        "$set": {
            "max_allowed_value": limit_data.max_allowed_value,
            "unit": limit_data.unit
        }
    }
    
    await db.prescribed_limits.update_one(query, update, upsert=True)

    # Automatically resolve any LIMIT_MISSING alerts for this parameter
    await db.alerts.update_many(
        {
            "category": limit_data.category,
            "parameter": limit_data.parameter,
            "alert_type": "LIMIT_MISSING"
        },
        {"$set": {"status": "RESOLVED"}}
    )
    
    # Retrieve the document to return (updated or newly created)
    updated_limit = await db.prescribed_limits.find_one(query)
    return map_id(updated_limit)

@router.get("/limits", response_model=List[PrescribedLimitResponse])
async def get_limits(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """Returns the master list of prescribed limits."""
    cursor = db.prescribed_limits.find({})
    limits = await cursor.to_list(length=100)
    return [map_id(limit) for limit in limits]

@router.get("/limits/{limit_id}", response_model=PrescribedLimitResponse)
async def get_single_limit(limit_id: str, current_user: UserResponse = Depends(get_current_active_user)):
    if not ObjectId.is_valid(limit_id):
         raise HTTPException(status_code=400, detail="Invalid Limit ID")
         
    limit = await db.prescribed_limits.find_one({"_id": ObjectId(limit_id)})
    if not limit:
        raise HTTPException(status_code=404, detail="Limit not found")
    return map_id(limit)

@router.put("/limits/{limit_id}", response_model=PrescribedLimitResponse)
async def update_limit(
    limit_id: str,
    update_data: PrescribedLimitUpdate,
    current_user: UserResponse = Depends(RoleChecker(["super_admin"]))
):
    """Updates a prescribed limit."""
    if not ObjectId.is_valid(limit_id):
        raise HTTPException(status_code=400, detail="Invalid Limit ID format")

    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    result = await db.prescribed_limits.update_one({"_id": ObjectId(limit_id)}, {"$set": update_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Limit not found")

    updated_limit = await db.prescribed_limits.find_one({"_id": ObjectId(limit_id)})
    return map_id(updated_limit)
