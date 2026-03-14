from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from typing import List, Optional
from app.utils.email_sender import send_html_email
from bson import ObjectId

from app.database import db
from app.dependencies import get_current_active_user, RoleChecker
from app.models.user import UserResponse, UserRole
from app.models.alerts import AlertResponse
from pydantic import BaseModel
from datetime import datetime, timezone
from app.utils.telegram_push import send_telegram_alert

from app.utils.websocket_manager import manager

class AlertRespondRequest(BaseModel):
    response_note: str

class AlertRejectRequest(BaseModel):
    rejection_reason: str

class AlertDispatchRequest(BaseModel):
    monitoring_team_id: str

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
    elif user_role == UserRole.MONITORING_TEAM.value:
        query["monitoring_team_id"] = str(current_user.id)
    
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
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(RoleChecker(["ro", "super_admin", "monitoring_team"]))
):
    """
    Allows an RO, Super Admin, or Monitoring Team to change the alert status to "RESOLVED".
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
    await manager.broadcast({"event": "REFRESH_ALERTS"})
    
    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})

    # Fetch Industry Email 
    industry_id = updated_alert.get("industry_id")
    if industry_id:
        try:
            industry_object_id = ObjectId(industry_id) if ObjectId.is_valid(industry_id) else industry_id
        except:
            industry_object_id = industry_id
        
        industry_user = await db.users.find_one({"entity_id": str(industry_object_id)})
        
        if industry_user and "email" in industry_user:
            subject = "RESOLVED: Environmental Alert Closed"
            body = f"<p>Your environmental compliance alert tracking ID <b>{alert_id}</b> has been marked as <strong>RESOLVED</strong> by the regulatory officer.</p>"
            background_tasks.add_task(send_html_email, industry_user["email"], subject, body)

            # --- SPLICED: Telegram Push Notification ---
            if "telegram_chat_id" in industry_user:
                tg_msg = f"✅ *ALERT RESOLVED*\n\nYour alert tracking ID *{alert_id}* has been marked as *RESOLVED* by the officer."
                background_tasks.add_task(send_telegram_alert, industry_user["telegram_chat_id"], tg_msg)

        else:
            print(f"Warning: No valid industry user found for entity_id {industry_id}. No RESOLVED email sent.")

    return map_id(updated_alert)

@router.put("/{alert_id}/respond", response_model=AlertResponse)
async def respond_alert(
    alert_id: str,
    payload: AlertRespondRequest,
    background_tasks: BackgroundTasks,
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
    await manager.broadcast({"event": "REFRESH_ALERTS"})

    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    
    industry_id = updated_alert.get("industry_id")
    if industry_id:
        try:
            industry_object_id = ObjectId(industry_id) if ObjectId.is_valid(industry_id) else industry_id
        except:
            industry_object_id = industry_id
            
        industry = await db.industries.find_one({"_id": industry_object_id})
        if industry and "region_id" in industry:
            region = industry["region_id"]
            # Find RO for this region
            ro_user = await db.users.find_one({"role": {"$in": ["ro", "RO"]}, "region_id": str(region)})
            if ro_user and "email" in ro_user:
                subject = "UPDATE: Corrective Action Submitted by Industry"
                body = f"<p>An industry has submitted corrective action for Alert ID <b>{alert_id}</b>.</p><p><b>Industry Response:</b><br/>{payload.response_note}</p><p>Please log in to the portal to review and verify.</p>"
                background_tasks.add_task(send_html_email, ro_user["email"], subject, body)

                # --- SPLICED: Telegram Push Notification (RO) ---
                if "telegram_chat_id" in ro_user:
                    tg_msg = (
                        f"📝 *UPDATE: Corrective Action*\n\n"
                        f"An industry has submitted an action plan for Alert *{alert_id}*.\n\n"
                        f"*Industry Response:* {payload.response_note[:100]}..."
                    )
                    background_tasks.add_task(send_telegram_alert, ro_user["telegram_chat_id"], tg_msg)

            else:
                print(f"Warning: No RO user found for region_id {region}. No RO email sent on industry response.")
        else:
             print(f"Warning: Industry has no region_id. Cannot find RO.")

    return map_id(updated_alert)

@router.put("/{alert_id}/reject", response_model=AlertResponse)
async def reject_alert(
    alert_id: str,
    payload: AlertRejectRequest,
    background_tasks: BackgroundTasks,
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
    await manager.broadcast({"event": "REFRESH_ALERTS"})
    
    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    
    industry_id = updated_alert.get("industry_id")
    if industry_id:
        try:
            industry_object_id = ObjectId(industry_id) if ObjectId.is_valid(industry_id) else industry_id
        except:
            industry_object_id = industry_id
            
        industry_user = await db.users.find_one({"entity_id": str(industry_object_id)})
        if industry_user and "email" in industry_user:
            subject = "URGENT: Corrective Action Rejected by RO"
            body = f"<p>Your recent response to Alert tracking ID <b>{alert_id}</b> has been <strong>REJECTED</strong>.</p><p><b>Officer Feedback:</b><br/>{payload.rejection_reason}</p><p>Please log into the portal to review the feedback and take appropriate action immediately.</p>"
            background_tasks.add_task(send_html_email, industry_user["email"], subject, body)

            # --- SPLICED: Telegram Push Notification ---
            if "telegram_chat_id" in industry_user:
                tg_msg = (
                    f"❌ *ACTION REJECTED*\n\n"
                    f"Your response to Alert *{alert_id}* was REJECTED.\n\n"
                    f"*Feedback:* {payload.rejection_reason[:100]}..."
                )
                background_tasks.add_task(send_telegram_alert, industry_user["telegram_chat_id"], tg_msg)

        else:
            print(f"Warning: No valid industry user found for entity_id {industry_id}. No REJECTED email sent.")
            
    return map_id(updated_alert)

@router.put("/{alert_id}/dispatch", response_model=AlertResponse)
async def dispatch_alert(
    alert_id: str,
    payload: AlertDispatchRequest,
    background_tasks: BackgroundTasks,
    current_user: UserResponse = Depends(RoleChecker(["ro", "super_admin"]))
):
    """
    Changes alert status to 'INSPECTION_PENDING' and assigns to a Monitoring Team member.
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
                raise HTTPException(status_code=403, detail="Not authorized to dispatch alerts for this industry")

    # verify monitoring team member
    try:
        mt_object_id = ObjectId(payload.monitoring_team_id) if ObjectId.is_valid(payload.monitoring_team_id) else payload.monitoring_team_id
    except:
        mt_object_id = payload.monitoring_team_id
        
    mt_member = await db.users.find_one({"_id": mt_object_id, "role": {"$in": ["monitoring_team", "MONITORING_TEAM"]}})
    if not mt_member:
        # Also check by ID cast to string just in case
        mt_member = await db.users.find_one({"id": str(payload.monitoring_team_id), "role": {"$in": ["monitoring_team", "MONITORING_TEAM"]}})
        if not mt_member:
            raise HTTPException(status_code=404, detail="Monitoring Team member not found")

    # Update alert
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {
            "$set": {
                "status": "INSPECTION_PENDING",
                "monitoring_team_id": str(payload.monitoring_team_id)
            }
        }
    )
    await manager.broadcast({"event": "REFRESH_ALERTS"})
    
    updated_alert = await db.alerts.find_one({"_id": ObjectId(alert_id)})
    
    # Send email to Monitoring Team
    if mt_member and "email" in mt_member:
        subject = "NEW AUDIT DISPATCH: Physical Inspection Required"
        body = f"<p>You have been dispatched to perform a physical site audit for Alert ID <b>{alert_id}</b>.</p><p>Please log into your Inspector Dashboard for location details and to submit your findings.</p>"
        background_tasks.add_task(send_html_email, mt_member["email"], subject, body)

        # --- SPLICED: Telegram Push Notification ---
        if "telegram_chat_id" in mt_member:
            tg_msg = (
                f"📋 *NEW AUDIT DISPATCH*\n\n"
                f"You have been assigned to audit Alert *{alert_id}*.\n\n"
                f"Check your Inspector Dashboard for details."
            )
            background_tasks.add_task(send_telegram_alert, mt_member["telegram_chat_id"], tg_msg)

        
    return map_id(updated_alert)
