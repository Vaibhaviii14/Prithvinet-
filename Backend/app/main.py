# Backend/app/main.py - PrithviNet API (MongoDB Atlas)
import os
from dotenv import load_dotenv
from fastapi import FastAPI, Form
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
from app.routers import ingestion

# Load .env
load_dotenv()

app = FastAPI(title="PrithviNet API 🚀")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"], # Add frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from app.database import db
from app.routes import auth
try:
    from app.routers import master, ingestion, alerts, reports, forecast, copilot
except ImportError:
    from app.routes import master, ingestion, alerts, reports, forecast, copilot

app.include_router(auth.router)
app.include_router(master.router)
app.include_router(ingestion.router)
app.include_router(alerts.router)
app.include_router(reports.router)
app.include_router(forecast.router)
app.include_router(copilot.router)
# Collections
readings = db.readings
alerts = db.alerts
limits = db.prescribed_limits
parameters = db.parameters
locations = db.monitoring_locations

@app.get("/")
async def root():
    return {"message": "PrithviNet API ✅", "docs": "/docs", "db": "prithvinet"}

@app.post("/seed")
async def seed_data():
    # Clear old data
    await readings.delete_many({})
    await alerts.delete_many({})
    
    # Seed limits
    await limits.delete_many({})
    await limits.insert_many([
        {"parameter_id": 1, "max_value": 80, "name": "SO2"},
        {"parameter_id": 2, "max_value": 60, "name": "PM2.5"},
        {"parameter_id": 3, "max_value": 75, "name": "Noise"}
    ])
    
    # Seed locations
    await locations.insert_many([
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
    result = await readings.insert_one(reading_doc)
    
    # Check limits & create alert
    limit = await limits.find_one({"parameter_id": parameter_id})
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
        await alerts.insert_one(alert_doc)
        alert_triggered = True
    
    return {
        "id": str(result.inserted_id),
        "value": value,
        "alert_triggered": alert_triggered,
        "limit": limit["max_value"] if limit else None
    }

@app.get("/readings/{location_id}")
async def get_readings(location_id: int):
    cursor = readings.find({"location_id": location_id}).sort("timestamp", -1).limit(50)
    data = await cursor.to_list(length=50)
    for doc in data:
        doc["_id"] = str(doc["_id"])
    return data

@app.get("/alerts")
async def get_alerts():
    cursor = alerts.find({}).sort("timestamp", -1).limit(20)
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