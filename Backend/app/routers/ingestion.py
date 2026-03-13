from fastapi import APIRouter, Depends, status, WebSocket, WebSocketDisconnect, Query
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId

from app.database import db
from app.dependencies import get_current_active_user, RoleChecker
from app.models.user import UserResponse
from app.models.ingestion import PollutionLogCreate, PollutionLogResponse
from app.models.user import UserRole

router = APIRouter(prefix="/api/ingestion", tags=["Data Ingestion"])

# Helper function to map MongoDB _id to string id
def map_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

# ==========================================
# REST Routes
# ==========================================

@router.post("/manual", response_model=PollutionLogResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_log(
    log_data: PollutionLogCreate,
    current_user: UserResponse = Depends(RoleChecker(["industry", "monitoring_team"]))
):
    """
    Manually submit a pollution log entry.
    Requires 'industry' or 'monitoring_team' role.
    """
    # Force the source to be manual
    data_dict = log_data.model_dump()
    data_dict["source"] = "Manual"
    
    if "timestamp" not in data_dict or data_dict["timestamp"] is None:
        data_dict["timestamp"] = datetime.now(timezone.utc)

    new_log = await db.pollution_logs.insert_one(data_dict)
    
    # Query limits collection for the corresponding category
    limits_cursor = db.prescribed_limits.find({"category": log_data.category})
    limits = await limits_cursor.to_list(length=100)
    limits_map = {limit["parameter"]: limit["max_allowed_value"] for limit in limits}

    # If any parameter in the reading exceeds the max_allowed_value, insert a new alert
    for param, value in log_data.parameters.items():
        if param in limits_map and value > limits_map[param]:
            alert_doc = {
                "industry_id": log_data.industry_id,
                "location_id": log_data.location_id,
                "category": log_data.category,
                "parameter": param,
                "exceeded_value": value,
                "allowed_value": limits_map[param],
                "status": "UNRESOLVED",
                "timestamp": datetime.now(timezone.utc)
            }
            await db.alerts.insert_one(alert_doc)

    created_log = await db.pollution_logs.find_one({"_id": new_log.inserted_id})
    return map_id(created_log)

@router.get("/logs", response_model=List[PollutionLogResponse])
async def get_logs(
    location_id: Optional[str] = Query(None, description="Filter by location_id"),
    category: Optional[str] = Query(None, description="Filter by category (e.g., Air, Water)"),
    start_date: Optional[datetime] = Query(None, description="Start date for logs"),
    end_date: Optional[datetime] = Query(None, description="End date for logs"),
    industry_id: Optional[str] = Query(None, description="Filter by industry_id"),
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Fetch historical pollution logs.
    Supports filtering by location_id, category, and date range.
    RBAC Filtering:
    - industry: only sees their own logs.
    - ro: sees logs from industries in their region.
    - super_admin: full access.
    """
    query = {}
    
    # RBAC Filtering Logic
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role == UserRole.INDUSTRY.value:
        query["industry_id"] = current_user.entity_id
    elif user_role == UserRole.RO.value:
        # Fetch all industries in this RO's region
        industries_cursor = db.industries.find({"region_id": current_user.region_id})
        industries = await industries_cursor.to_list(length=None)
        region_industry_ids = [str(ind["_id"]) for ind in industries]
        
        if industry_id:
            # If specifically requesting an industry, ensure it belongs to their region
            if industry_id in region_industry_ids:
                query["industry_id"] = industry_id
            else:
                return [] # Not authorized to view this industry's logs
        else:
            query["industry_id"] = {"$in": region_industry_ids}
    elif user_role == UserRole.SUPER_ADMIN.value:
        if industry_id:
            query["industry_id"] = industry_id
    else:
        # For other roles (like citizen or monitoring_team), just use the provided ID if any
        # Or you could restrict their access if required. We will respect the parameter.
        if industry_id:
            query["industry_id"] = industry_id

    if location_id:
        query["location_id"] = location_id
    if category:
        query["category"] = category
        
    date_query = {}
    if start_date:
        date_query["$gte"] = start_date
    if end_date:
        date_query["$lte"] = end_date
    if date_query:
        query["timestamp"] = date_query

    cursor = db.pollution_logs.find(query).sort("timestamp", -1)
    logs = await cursor.to_list(length=100)
    return [map_id(log) for log in logs]


# ==========================================
# WebSocket Routes
# ==========================================

@router.websocket("/live/{location_id}")
async def websocket_IoT_endpoint(websocket: WebSocket, location_id: str):
    """
    WebSocket endpoint for live IoT streams.
    IoT devices can connect here to push continuous metrics.
    """
    await websocket.accept()
    try:
        while True:
            # Await JSON payload from the IoT device
            # Expected payload similar to:
            # {"industry_id": "123", "category": "Air", "parameters": {"PM2.5": 55.0}}
            data = await websocket.receive_json()
            
            # Construct the log entry. We force the source to "IoT"
            # and inject the location_id from the URL connection.
            log_entry = {
                "location_id": location_id,
                "industry_id": data.get("industry_id"),
                "category": data.get("category", "Unknown"),
                "parameters": data.get("parameters", {}),
                "source": "IoT",
                "timestamp": datetime.now(timezone.utc)
            }
            
            # Insert the record directly into the database
            await db.pollution_logs.insert_one(log_entry)
            
            # Send back acknowledgment
            await websocket.send_json({"status": "success", "message": "Log received and saved", "location_id": location_id})
            
    except WebSocketDisconnect:
        # Client gracefully closed the connection or dropped off
        print(f"IoT Device at Location {location_id} disconnected.")
    except Exception as e:
        # Catch unexpected errors (like invalid JSON)
        print(f"Error in IoT WebSocket for Location {location_id}: {e}")
        try:
            await websocket.close()
        except:
            pass
