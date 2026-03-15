# Backend/app/main.py - PrithviNet API (MongoDB Atlas)
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime

# Load .env
load_dotenv()

app = FastAPI(title="PrithviNet API 🚀")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # The "*" means "Allow requests from ANY website"
    allow_credentials=True,
    allow_methods=["*"],  # Allow POST, GET, PUT, DELETE
    allow_headers=["*"],
)

from app.database import db
from app.routes import auth
from app.ml.anomaly import detect_anomaly

# Note: Removed the try/except block. It is best practice to have a strict 
# folder structure. Assuming they are all in routers as discussed previously.
from app.routers import master, ingestion, alerts, reports, forecast, copilot, public, ws

app.include_router(auth.router)
app.include_router(master.router)
app.include_router(ingestion.router)
app.include_router(alerts.router)
app.include_router(reports.router)
app.include_router(forecast.router)
app.include_router(copilot.router)
app.include_router(public.router)
app.include_router(ws.router)

# FIX: Renamed collection variables to avoid namespace collision with routers
readings_collection = db.readings
alerts_collection = db.alerts
limits_collection = db.prescribed_limits
parameters_collection = db.parameters
locations_collection = db.monitoring_locations

@app.get("/")
async def root():
    return {"message": "PrithviNet API ✅", "docs": "/docs", "db": "prithvinet"}

@app.post("/seed")
async def seed_data():
    # Clear old data using the renamed variables
    await readings_collection.delete_many({})
    await alerts_collection.delete_many({})
    
    # Seed limits
    await limits_collection.delete_many({})
    await limits_collection.insert_many([
        {"parameter_id": 1, "max_value": 80, "name": "SO2"},
        {"parameter_id": 2, "max_value": 60, "name": "PM2.5"},
        {"parameter_id": 3, "max_value": 75, "name": "Noise"}
    ])
    
    # Seed locations
    await locations_collection.insert_many([
        {"id": 1, "name": "SteelPlant-01", "lat": 23.2599, "lon": 77.4126},
        {"id": 2, "name": "CementFactory-02", "lat": 23.2599, "lon": 77.4126}
    ])
    
    return {"status": "✅ Seeded prithvinet database!"}

@app.post("/readings")
async def create_reading(
    location_id: int = Form(...), 
    parameter_id: int = Form(...), 
    value: float = Form(...),
    source: str = Form("industry")
):
    # Insert reading
    reading_doc = {
        "location_id": location_id,
        "parameter_id": parameter_id,
        "value": value,
        "source": source,
        "timestamp": datetime.utcnow()
    }
    result = await readings_collection.insert_one(reading_doc)
    
    # Check limits & create alert
    limit = await limits_collection.find_one({"parameter_id": parameter_id})
    alert_triggered = False
    
    if limit and value > limit["max_value"]:
        alert_doc = {
            "reading_id": str(result.inserted_id),
            "location_id": location_id,
            "parameter_id": parameter_id,
            "value": value,
            "limit": limit["max_value"],
            "type": "threshold_breach",
            "severity": "HIGH",
            "status": "open",
            "timestamp": datetime.utcnow()
        }
        await alerts_collection.insert_one(alert_doc)
        alert_triggered = True
    
    anomaly_detected = False
    
    # Anomaly Detection Logic
    pollutant_name = limit["name"] if limit and "name" in limit else str(parameter_id)
    parameters_dict = {pollutant_name: value}
    anomaly_result = await detect_anomaly(db, str(location_id), parameters_dict)
    
    if anomaly_result.get("is_anomaly") == True and not alert_triggered:
        alert_doc = {
            "reading_id": str(result.inserted_id),
            "location_id": location_id,
            "parameter_id": parameter_id,
            "value": value,
            "type": "statistical_anomaly",
            "severity": "WARNING",
            "message": f"Sudden fluctuation detected. Value {value} deviates significantly from the 24h baseline of {anomaly_result['mean']}.",
            "status": "open",
            "timestamp": datetime.utcnow()
        }
        await alerts_collection.insert_one(alert_doc)
        anomaly_detected = True
    
    return {
        "id": str(result.inserted_id),
        "value": value,
        "alert_triggered": alert_triggered,
        "anomaly_detected": anomaly_detected,
        "limit": limit["max_value"] if limit else None
    }

@app.get("/readings/{location_id}")
async def get_readings(location_id: int):
    cursor = readings_collection.find({"location_id": location_id}).sort("timestamp", -1).limit(50)
    data = await cursor.to_list(length=50)
    for doc in data:
        doc["_id"] = str(doc["_id"])
    return data

@app.get("/alerts")
async def get_alerts():
    cursor = alerts_collection.find({}).sort("timestamp", -1).limit(20)
    data = await cursor.to_list(length=20)
    for doc in data:
        doc["_id"] = str(doc["_id"])
    return data

@app.get("/forecast/{location_id}")
async def get_forecast(location_id: int):
    # Mock ML forecast (replace later)
    return {
        "location_id": location_id,
        "so2_24h": {"point": 92, "lower": 84, "upper": 100},
        "pm25_24h": {"point": 78, "lower": 65, "upper": 91},
        "status": "predicted"
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting PrithviNet API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)