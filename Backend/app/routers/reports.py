from fastapi import APIRouter, Depends
from typing import List, Dict, Any

from app.database import db
from app.dependencies import get_current_active_user
from app.models.user import UserResponse, UserRole

router = APIRouter(prefix="/api/reports", tags=["Reporting & Analytics"])

@router.get("/summary", response_model=List[Dict[str, Any]])
async def get_reports_summary(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Aggregation pipeline to group raw ingestion data by day and calculate 
    the average, max, and min values for environmental parameters.
    Applies RBAC filtering at the match stage.
    """
    match_stage = {}
    
    # Apply RBAC filtering at the very beginning of the pipeline
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role == UserRole.INDUSTRY.value:
        match_stage["industry_id"] = current_user.entity_id
    elif user_role == UserRole.RO.value:
        # Fetch industrials in this RO's region
        industries_cursor = db.industries.find({"region_id": current_user.region_id})
        industries = await industries_cursor.to_list(length=None)
        region_industry_ids = [str(ind["_id"]) for ind in industries]
        match_stage["industry_id"] = {"$in": region_industry_ids}
        
    pipeline = []
    
    if match_stage:
        pipeline.append({"$match": match_stage})
        
    # Build aggregation pipeline to group by day and calculate stats
    pipeline.extend([
        {
            "$addFields": {
                # Format the timestamp to get only the date string YYYY-MM-DD
                "day": {"$dateToString": {"format": "%Y-%m-%d", "date": "$timestamp"}},
                # Convert the parameters dictionary to an array for easy grouping
                # Input: {"PM2.5": 45.5, "SO2": 12.1} 
                # Output: [{"k": "PM2.5", "v": 45.5}, {"k": "SO2", "v": 12.1}]
                "params_array": {"$objectToArray": "$parameters"}
            }
        },
        {
            # Unwind the parameters array so each parameter gets its own document
            "$unwind": "$params_array"
        },
        {
            # Group by the specific date and parameter name to calculate metrics
            "$group": {
                "_id": {
                    "day": "$day",
                    "parameter": "$params_array.k"
                },
                "avg_value": {"$avg": "$params_array.v"},
                "max_value": {"$max": "$params_array.v"},
                "min_value": {"$min": "$params_array.v"}
            }
        },
        {
            # Group again by day to reconstruct the parameters summary per day
            "$group": {
                "_id": "$_id.day",
                "stats": {
                    "$push": {
                        "parameter": "$_id.parameter",
                        "avg": "$avg_value",
                        "max": "$max_value",
                        "min": "$min_value"
                    }
                }
            }
        },
        {
            # Sort chronologically
            "$sort": {"_id": 1}
        },
        {
            "$project": {
                "_id": 0,
                "date": "$_id",
                "stats": 1
            }
        }
    ])
    
    cursor = db.pollution_logs.aggregate(pipeline)
    results = await cursor.to_list(length=1000)
    return results

@router.get("/map-data", response_model=List[Dict[str, Any]])
async def get_map_data(
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Aggregation pipeline to fetch the latest environmental readings and 
    active alert configurations to render discrete status markers.
    """
    match_stage = {}
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role == UserRole.RO.value:
        # Limit strictly to current User's region
        match_stage["region_id"] = current_user.region_id
        
    pipeline = []
    
    if match_stage:
        pipeline.append({"$match": match_stage})

    pipeline.extend([
        {
            "$lookup": {
                "from": "pollution_logs",
                "let": { "loc_id": {"$toString": "$_id"} },
                "pipeline": [
                    { "$match": { "$expr": { "$eq": ["$location_id", "$$loc_id"] } } },
                    { "$sort": { "timestamp": -1 } },
                    { "$limit": 1 }
                ],
                "as": "latest_reading_doc"
            }
        },
        {
            "$lookup": {
                "from": "alerts",
                "let": { "loc_id": {"$toString": "$_id"} },
                "pipeline": [
                    { "$match": {
                        "$expr": {
                            "$and": [
                                { "$eq": ["$location_id", "$$loc_id"] },
                                { "$in": ["$status", ["UNRESOLVED", "ACTION_TAKEN", "INSPECTION_PENDING"]] }
                            ]
                        }
                    }}
                ],
                "as": "active_alerts"
            }
        },
        {
            "$addFields": {
                "marker_status": {
                    "$cond": {
                        "if": { "$in": ["UNRESOLVED", "$active_alerts.status"] },
                        "then": "UNRESOLVED",
                        "else": {
                            "$cond": {
                                "if": { "$in": ["INSPECTION_PENDING", "$active_alerts.status"] },
                                "then": "INSPECTION_PENDING",
                                "else": {
                                    "$cond": {
                                        "if": { "$in": ["ACTION_TAKEN", "$active_alerts.status"] },
                                        "then": "ACTION_TAKEN",
                                        "else": "NORMAL"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "id": { "$toString": "$_id" },
                "name": 1,
                "lat": "$latitude",
                "lng": "$longitude",
                "marker_status": 1,
                "latest_reading": {
                    "$let": {
                        "vars": {
                            "first_read": { "$arrayElemAt": ["$latest_reading_doc", 0] }
                        },
                        "in": "$$first_read.parameters"
                    }
                }
            }
        }
    ])
    
    cursor = db.monitoring_locations.aggregate(pipeline)
    return await cursor.to_list(length=None)
