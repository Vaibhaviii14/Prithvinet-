from fastapi import APIRouter, Query, HTTPException, BackgroundTasks
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.database import db
from app.models.incident_report import IncidentReportCreate, IncidentReportResponse
from app.utils.email_sender import send_html_email
import math
import random
import string
import numpy as np
from sklearn.neighbors import KNeighborsRegressor

router = APIRouter(prefix="/api/public", tags=["Public Portal"])

def calculate_aqi(pm25: float = 0, pm10: float = 0, so2: float = 0, no2: float = 0, co: float = 0) -> int:
    return min(500, int(max(pm25 * 3, pm10 * 1.5, so2 * 0.8, no2 * 1.2, co * 10)))

def get_health_status(aqi: int) -> str:
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 200:
        return "Poor"
    else:
        return "Severe"

async def get_all_active_sensors_data():
    cursor = db.monitoring_locations.find({})
    locations = await cursor.to_list(length=None)
    
    if not locations:
        return []
        
    loc_ids = [str(loc["_id"]) for loc in locations]
    
    # Fetch the latest reading for all locations
    pipeline = [
        {"$match": {"location_id": {"$in": loc_ids}}},
        {"$sort": {"timestamp": -1}},
        {"$group": {
            "_id": "$location_id",
            "latest_reading": {"$first": "$parameters"}
        }}
    ]
    latest_readings = await db.pollution_logs.aggregate(pipeline).to_list(length=None)
    readings_map = {item["_id"]: item["latest_reading"] for item in latest_readings}
    
    result = []
    for loc in locations:
        loc_id = str(loc["_id"])
        if loc_id not in readings_map:
            continue
            
        params = readings_map[loc_id]
        pm25 = params.get("PM2.5", 0)
        pm10 = params.get("PM10", 0)
        so2 = params.get("SO2", 0)
        no2 = params.get("NO2", 0)
        co = params.get("CO", 0)
        
        aqi = calculate_aqi(pm25, pm10, so2, no2, co)
        if aqi == 0 and params:
            values = [v for v in params.values() if isinstance(v, (int, float))]
            if values:
                aqi = int(max(values))
                
        health_status = get_health_status(aqi)
        
        # Anonymization logic
        zone_name = loc.get("name", "Public Zone")
        industry_id = loc.get("industry_id")
        if industry_id:
            city = loc.get("city", "")
            if city:
                zone_name = f"Industrial Zone - {city}"
            else:
                zone_name = "Anonymized Zone"
            
        result.append({
            "id": loc_id,
            "zone_name": zone_name,
            "lat": loc.get("latitude", 0.0),
            "lng": loc.get("longitude", 0.0),
            "aqi": aqi,
            "health_status": health_status
        })
        
    return result

@router.get("/status")
async def get_public_status(
    lat: Optional[float] = Query(None, description="Latitude"),
    lng: Optional[float] = Query(None, description="Longitude"),
    city: Optional[str] = Query(None, description="City name")
):
    """
    Find the nearest Public Monitoring Station and fetch its latest reading.
    Calculates a simplified AQI score (0-500).
    """
    # Fetch public stations (no industry_id attached or specifically marked as Public)
    query = {"$or": [{"industry_id": {"$exists": False}}, {"industry_id": None}, {"type": "Public"}]}
    
    if city:
        query["name"] = {"$regex": city, "$options": "i"}
        
    cursor = db.monitoring_locations.find(query)
    locations = await cursor.to_list(length=None)
    
    if not locations:
        return {
            "location": city or "Unknown Location",
            "aqi": 0,
            "dominant_pollutant": "None",
            "last_updated": datetime.utcnow()
        }
        
    nearest_loc = None
    if lat is not None and lng is not None:
        def calc_dist(loc):
            return math.hypot(loc.get("latitude", 0) - lat, loc.get("longitude", 0) - lng)
        nearest_loc = min(locations, key=calc_dist)
    else:
        nearest_loc = locations[0]
        
    loc_id = str(nearest_loc["_id"])
    
    # Fetch the latest reading for this specific location
    latest_log = await db.pollution_logs.find_one(
        {"location_id": loc_id},
        sort=[("timestamp", -1)]
    )
    
    if not latest_log:
        return {
            "location": nearest_loc.get("name", "Public Zone"),
            "aqi": 0,
            "dominant_pollutant": "None",
            "last_updated": datetime.utcnow()
        }
        
    params = latest_log.get("parameters", {})
    
    pm25 = params.get("PM2.5", 0)
    pm10 = params.get("PM10", 0)
    so2 = params.get("SO2", 0)
    no2 = params.get("NO2", 0)
    co = params.get("CO", 0)
    
    # Calculate dominant pollutant
    max_pollutant = "None"
    max_val = -1
    for p, v in params.items():
        if isinstance(v, (int, float)) and v > max_val:
            max_val = v
            max_pollutant = p
            
    aqi_val = calculate_aqi(pm25, pm10, so2, no2, co)
    if aqi_val == 0 and params:
        # Fallback if specific pollutants are missing
        aqi_val = int(max([v for v in params.values() if isinstance(v, (int, float))] or [0]))

    return {
        "location": nearest_loc.get("name", "Public Zone"),
        "aqi": aqi_val,
        "dominant_pollutant": max_pollutant,
        "last_updated": latest_log.get("timestamp", datetime.utcnow())
    }

@router.get("/map-data")
async def get_public_map_data():
    """
    Query all locations that have an active reading.
    """
    return await get_all_active_sensors_data()

@router.get("/predict-aqi")
async def predict_aqi(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude")
):
    """
    Predict AQI using Spatial Interpolation (KNeighborsRegressor).
    """
    sensors_data = await get_all_active_sensors_data()
    
    if not sensors_data:
        raise HTTPException(status_code=404, detail="No active sensor data available")
        
    X = [[d["lat"], d["lng"]] for d in sensors_data]
    y = [d["aqi"] for d in sensors_data]
    
    if len(X) < 3:
        # Single closest sensor
        def calc_dist(loc):
            return math.hypot(loc[0] - lat, loc[1] - lng)
            
        distances = [calc_dist(x) for x in X]
        min_idx = distances.index(min(distances))
        predicted_aqi = y[min_idx]
        
        return {
            "location_type": "Your Exact Location",
            "aqi": int(predicted_aqi),
            "ml_used": False,
            "confidence_note": "Calculated from nearest sensor due to insufficient data for interpolation"
        }
        
    model = KNeighborsRegressor(n_neighbors=3, weights='distance')
    model.fit(X, y)
    
    # KNN predict expects 2D array
    predicted_aqi = model.predict([[lat, lng]])[0]
    
    return {
        "location_type": "Your Exact Location",
        "aqi": int(predicted_aqi),
        "ml_used": True,
        "confidence_note": "Calculated via AI Spatial Interpolation"
    }


def _generate_tracking_id() -> str:
    year = datetime.now(timezone.utc).year
    suffix = ''.join(random.choices(string.digits, k=4))
    return f"ENV-{year}-{suffix}"


@router.post("/report-incident", response_model=IncidentReportResponse)
async def submit_incident_report(report: IncidentReportCreate, background_tasks: BackgroundTasks):
    """
    Save a citizen pollution incident report to the database and notify super admin.
    Returns a tracking ID the citizen can use to follow up.
    """
    tracking_id = _generate_tracking_id()
    now = datetime.now(timezone.utc)

    doc = {
        "tracking_id": tracking_id,
        "category": report.category,
        "location": report.location,
        "severity": report.severity,
        "description": report.description,
        "anonymous": report.anonymous,
        "contact_info": None if report.anonymous else report.contact_info,
        "status": "received",
        "submitted_at": now,
    }

    await db.incident_reports.insert_one(doc)

    # Notify all super admins by email
    admin_cursor = db.users.find({"role": "super_admin"})
    admins = await admin_cursor.to_list(length=None)

    severity_labels = {1: "Minor", 2: "Low", 3: "Moderate", 4: "High", 5: "Critical Hazard"}
    severity_label = severity_labels.get(report.severity, str(report.severity))

    for admin in admins:
        if admin.get("email"):
            subject = f"NEW CITIZEN REPORT [{tracking_id}]: {report.category.upper()} — {severity_label} Severity"
            body = f"""
            <p>A new pollution incident report has been submitted by a citizen.</p>
            <table style="width:100%; border-collapse:collapse; margin-top:12px;">
              <tr><td style="padding:6px; font-weight:bold; color:#555;">Tracking ID</td><td style="padding:6px;">{tracking_id}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:6px; font-weight:bold; color:#555;">Category</td><td style="padding:6px;">{report.category.title()}</td></tr>
              <tr><td style="padding:6px; font-weight:bold; color:#555;">Location</td><td style="padding:6px;">{report.location}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:6px; font-weight:bold; color:#555;">Severity</td><td style="padding:6px;">{severity_label} ({report.severity}/5)</td></tr>
              <tr><td style="padding:6px; font-weight:bold; color:#555;">Description</td><td style="padding:6px;">{report.description}</td></tr>
              <tr style="background:#f9f9f9;"><td style="padding:6px; font-weight:bold; color:#555;">Anonymous</td><td style="padding:6px;">{"Yes" if report.anonymous else "No"}</td></tr>
              <tr><td style="padding:6px; font-weight:bold; color:#555;">Submitted At</td><td style="padding:6px;">{now.strftime("%Y-%m-%d %H:%M UTC")}</td></tr>
            </table>
            <p style="margin-top:16px;">Please log into the <strong>PrithviNet Admin Dashboard</strong> to review and take action.</p>
            """
            background_tasks.add_task(send_html_email, admin["email"], subject, body)

    return IncidentReportResponse(tracking_id=tracking_id, status="received", submitted_at=now)



@router.get("/incident-reports")
async def get_incident_reports():
    """
    Returns all citizen incident reports for the admin dashboard.
    No auth required for now — wire RoleChecker when needed.
    """
    from app.dependencies import get_current_active_user, RoleChecker
    cursor = db.incident_reports.find({}).sort("submitted_at", -1)
    reports = await cursor.to_list(length=200)
    for r in reports:
        r["id"] = str(r.pop("_id"))
    return reports
