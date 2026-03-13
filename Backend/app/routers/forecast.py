from fastapi import APIRouter, Depends
from typing import List
from app.dependencies import RoleChecker

router = APIRouter(prefix="/api/data/forecasts", tags=["Forecasting"])

@router.get("")
async def get_forecasts(current_user: dict = Depends(RoleChecker(["ro", "super_admin"]))):
    return [
        {
            "location": "Okhla Industrial Area", 
            "parameter": "SO2", 
            "predicted_value": 110, 
            "timeframe": "Next 24h", 
            "confidence": 85
        },
        {
            "location": "Noida Sector 62", 
            "parameter": "PM2.5", 
            "predicted_value": 90, 
            "timeframe": "Next 48h", 
            "confidence": 78
        },
        {
            "location": "Bhilai Steel Plant", 
            "parameter": "Noise", 
            "predicted_value": 85, 
            "timeframe": "Next 12h", 
            "confidence": 92
        }
    ]
