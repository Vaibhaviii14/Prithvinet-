from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from bson import ObjectId

from app.database import db
from app.dependencies import get_current_active_user, RoleChecker
from app.models.user import UserResponse, UserRole
from app.models.alerts import AlertResponse
from pydantic import BaseModel
from datetime import datetime, timezone

class AlertRespondRequest(BaseModel):
    response_note: str

class AlertRejectRequest(BaseModel):
    rejection_reason: str

router = APIRouter(prefix="/api/alerts", tags=["Alerts & Compliance"])

def map_id(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc

@router.get("", response_model=List[AlertResponse])
async def get_alerts(
    type: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Returns active alerts. Applies exact same RBAC filtering as logs:
    - Industries see their own alerts.
    - ROs see alerts in their region.
    - Super admins see all alerts.
    """
    query = {}
    
    # Apply RBAC filtering
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role == UserRole.INDUSTRY.value:
        query["industry_id"] = current_user.entity_id
    elif user_role == UserRole.RO.value:
        industries_cursor = db.industries.find({"region_id": current_user.region_id})
        industries = await industries_cursor.to_list(length=None)
        region_industry_ids = [str(ind["_id"]) for ind in industries]
        query["industry_id"] = {"$in": region_industry_ids}
    
    # Filter by type (air, water, noise)
    if type:
        type_lower = type.lower()
        if type_lower == "air":
            query["parameter"] = {"$in": ["PM2.5", "SO2", "NO2", "CO", "AQI"]}
        elif type_lower == "water":
            query["parameter"] = {"$in": ["pH", "BOD", "COD", "TSS"]}
        elif type_lower == "noise":
            query["parameter"] = {"$in": ["Noise", "dB"]}
    
    cursor = db.alerts.find(query).sort("timestamp", -1)
    alerts = await cursor.to_list(length=100)
    return [map_id(alert) for alert in alerts]

@router.put("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    current_user: UserResponse = Depends(RoleChecker(["ro", "super_admin"]))
):
    """
    Allows an RO or Super Admin to change the alert status to "RESOLVED".
    """
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(status_code=400, detail="Invalid Alert ID format")

    alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role == UserRole.RO.value:
        # Check if the alert is for an industry within RO's region
        industry_id = alert.get("industry_id")
        if industry_id:
            try:
                industry_object_id = ObjectId(industry_id) if ObjectId.is_valid(industry_id) else industry_id
            except:
                industry_object_id = industry_id
                
            industry = await db.industries.find_one({"_id": industry_object_id})
            if not industry or industry.get("region_id") != current_user.region_id:
                raise HTTPException(status_code=403, detail="Not authorized to resolve alerts for this industry")

    # Update alert
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"status": "RESOLVED"}}
    )
    
    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    return map_id(updated_alert)

@router.put("/{alert_id}/respond", response_model=AlertResponse)
async def respond_alert(
    alert_id: str,
    payload: AlertRespondRequest,
    current_user: UserResponse = Depends(RoleChecker(["industry"]))
):
    """
    Allows an Industry user to respond to an alert by providing a corrective action note.
    """
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(status_code=400, detail="Invalid Alert ID format")

    alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    # Authorize industry 
    if str(alert.get("industry_id")) != current_user.entity_id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this alert")

    # Update alert with note, time, and status
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "industry_response": payload.response_note,
                "responded_at": datetime.now(timezone.utc),
                "status": "ACTION_TAKEN"
            }
        }
    )

    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    return map_id(updated_alert)

@router.put("/{alert_id}/reject", response_model=AlertResponse)
async def reject_alert(
    alert_id: str,
    payload: AlertRejectRequest,
    current_user: UserResponse = Depends(RoleChecker(["ro", "super_admin"]))
):
    """
    Allows an RO or Super Admin to reject an industry's response.
    Sets status back to 'UNRESOLVED', adds 'ro_feedback', and clears 'industry_response'.
    """
    if not ObjectId.is_valid(alert_id):
        raise HTTPException(status_code=400, detail="Invalid Alert ID format")

    alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    user_role = getattr(current_user.role, "value", current_user.role)
    if user_role == UserRole.RO.value:
        industry_id = alert.get("industry_id")
        if industry_id:
            try:
                industry_object_id = ObjectId(industry_id) if ObjectId.is_valid(industry_id) else industry_id
            except:
                industry_object_id = industry_id
                
            industry = await db.industries.find_one({"_id": industry_object_id})
            if not industry or industry.get("region_id") != current_user.region_id:
                raise HTTPException(status_code=403, detail="Not authorized to reject alerts for this industry")

    # Reject alert: set back to UNRESOLVED, add ro_feedback, clear industry responses
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "status": "UNRESOLVED",
                "ro_feedback": payload.rejection_reason,
                "industry_response": None
            }
        }
    )
    
    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    return map_id(updated_alert)
