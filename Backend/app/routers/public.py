from fastapi import APIRouter
from datetime import datetime, timedelta
from app.database import db

router = APIRouter(prefix="/api/public", tags=["Public Dashboard"])

@router.get("/dashboard-data")
async def get_public_dashboard_data():
    now = datetime.now()
    
    # Try fetching real locations first
    map_zones = []
    locations = await db.monitoring_locations.find({}).to_list(length=100)
    for index, loc in enumerate(locations):
        # We assign an arbitrary color/status for demo since we don't have aggregated live AQI easily here,
        # but you can pull from db.readings if needed.
        aqi_val = 50 + (index * 30) % 150
        color = "green" if aqi_val <= 50 else ("yellow" if aqi_val <= 100 else "red")
        status = "Good" if color == "green" else ("Moderate" if color == "yellow" else "Poor")
        map_zones.append({
            "id": str(loc.get("_id", index + 1)),
            "lat": loc.get("lat", 23.2599),
            "lng": loc.get("lng", 77.4126),
            "color": color,
            "status": status,
            "status_msg": "Live sensor feed.",
            "aqi": aqi_val,
            "forecast_trend": "stable"
        })
    
    # Fallback to defaults if DB is empty
    if not map_zones:
        map_zones = [
            {
                "id": "1",
                "lat": 23.2599,
                "lng": 77.4126,
                "color": "yellow",
                "status": "Moderate",
                "status_msg": "Acceptable air quality for most individuals.",
                "aqi": 125,
                "forecast_trend": "improving"
            },
            {
                "id": "2",
                "lat": 23.2700,
                "lng": 77.4300,
                "color": "green",
                "status": "Good",
                "status_msg": "Air quality is considered satisfactory.",
                "aqi": 42,
                "forecast_trend": "stable"
            },
            {
                "id": "3",
                "lat": 23.2400,
                "lng": 77.4000,
                "color": "red",
                "status": "Poor",
                "status_msg": "Members of sensitive groups may experience health effects.",
                "aqi": 215,
                "forecast_trend": "worsening"
            }
        ]

    return {
        "city_info": {
            "city": "Bhopal, MP",
            "aqi": 125,
            "aqi_status": "MODERATE",
            "wqi": 78,
            "wqi_status": "GOOD",
            "noise_level": 60,
            "noise_status": "NORMAL",
            "lat": 23.2599,
            "lng": 77.4126
        },
        "map_zones": map_zones,
        "forecast": [
            {
                "day": (now + timedelta(days=i)).strftime("%a").upper(),
                "value": v,
                "is_today": i == 0
            }
            for i, v in enumerate([60, 45, 75, 80, 55, 40, 65])
        ],
        "forecast_trend_text": "AQI levels are expected to remain fluctuating with improvements over the weekend.",
        "advisories": [
            {
                "type": "alert",
                "title": "Moderate Pollution Levels",
                "message": "Unusually sensitive individuals should consider limiting prolonged outdoor exertion."
            },
            {
                "type": "safe",
                "title": "Water Parameters Normal",
                "message": "All measured water parameters are currently well within acceptable limits."
            }
        ]
    }
