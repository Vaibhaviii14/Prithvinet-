from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, timezone

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


@router.get("/export-debug", response_model=List[Dict[str, Any]])
async def export_debug(
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Debug endpoint — returns the 5 most recent pollution_logs with no filters.
    """
    logs = await db.pollution_logs.find({}).sort("timestamp", -1).to_list(length=5)
    for r in logs:
        r["id"] = str(r.pop("_id"))
        if isinstance(r.get("timestamp"), datetime):
            r["timestamp"] = str(r["timestamp"])
    return logs


@router.get("/export", response_model=List[Dict[str, Any]])
async def export_reports(
    category: str = Query(..., description="Pivot type: 'region' or 'industry'"),
    target: str = Query(..., description="Region office id OR industry id depending on pivot"),
    days: str = Query(..., description="Number of days to look back, or 'all' for no date filter"),
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Exports pollution_logs filtered by region or industry pivot and timeframe.
    - region pivot:   target = regional_office id → finds all industries in that
                      region → filters logs by those industry_ids.
    - industry pivot: target = industry id → filters logs by that industry_id directly.
    Always returns HTTP 200 with [] when no records match.
    """
    from bson import ObjectId

    match: Dict[str, Any] = {}

    # ── Date filter ──────────────────────────────────────────────────────────
    if days.lower() != "all":
        try:
            start_date = datetime.now(timezone.utc) - timedelta(days=int(days))
            match["timestamp"] = {"$gte": start_date}
        except ValueError:
            pass

    # ── Pivot filter ─────────────────────────────────────────────────────────
    cat = category.lower()

    if cat == "region":
        # Resolve regional office → get all industry ids in that region
        ro_doc = None
        if ObjectId.is_valid(target):
            ro_doc = await db.regional_offices.find_one({"_id": ObjectId(target)})
        if not ro_doc:
            ro_doc = await db.regional_offices.find_one(
                {"name": {"$regex": target, "$options": "i"}}
            )

        region_id = str(ro_doc["_id"]) if ro_doc else target
        industries_cursor = db.industries.find({"region_id": region_id})
        industries = await industries_cursor.to_list(length=None)
        industry_ids = [str(ind["_id"]) for ind in industries]

        if not industry_ids:
            return []  # no industries in this region → no logs

        match["industry_id"] = {"$in": industry_ids}

    elif cat == "industry":
        # Direct industry filter
        ind_doc = None
        if ObjectId.is_valid(target):
            ind_doc = await db.industries.find_one({"_id": ObjectId(target)})
        if not ind_doc:
            ind_doc = await db.industries.find_one(
                {"name": {"$regex": target, "$options": "i"}}
            )

        industry_id = str(ind_doc["_id"]) if ind_doc else target
        match["industry_id"] = industry_id

    # ── Aggregation pipeline ─────────────────────────────────────────────────
    pipeline = [
        {"$match": match},
        {"$sort": {"timestamp": -1}},
        {"$lookup": {
            "from": "monitoring_locations",
            "let": {"loc_id": "$location_id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$loc_id"]}}},
                {"$project": {"_id": 0, "name": 1, "city": 1}}
            ],
            "as": "location_doc"
        }},
        {"$lookup": {
            "from": "industries",
            "let": {"ind_id": "$industry_id"},
            "pipeline": [
                {"$match": {"$expr": {"$eq": [{"$toString": "$_id"}, "$$ind_id"]}}},
                {"$project": {"_id": 0, "name": 1, "industry_type": 1}}
            ],
            "as": "industry_doc"
        }},
        {"$project": {
            "_id": 0,
            "id":               {"$toString": "$_id"},
            "timestamp":        {"$dateToString": {"format": "%Y-%m-%d %H:%M UTC", "date": "$timestamp"}},
            "source":           "$source",
            "category":         "$category",
            "location_id":      "$location_id",
            "location_name":    {"$ifNull": [{"$arrayElemAt": ["$location_doc.name", 0]}, "$location_id"]},
            "industry_id":      "$industry_id",
            "industry_name":    {"$ifNull": [{"$arrayElemAt": ["$industry_doc.name", 0]}, "$industry_id"]},
            "industry_type":    {"$ifNull": [{"$arrayElemAt": ["$industry_doc.industry_type", 0]}, ""]},
            "parameters":       "$parameters",
        }},
    ]

    logs = await db.pollution_logs.aggregate(pipeline).to_list(length=1000)

    # Flatten parameters dict → readable string for CSV
    for log in logs:
        params = log.get("parameters") or {}
        log["parameters_summary"] = ", ".join(f"{k}: {v}" for k, v in params.items())
        log.pop("parameters", None)

    return logs
