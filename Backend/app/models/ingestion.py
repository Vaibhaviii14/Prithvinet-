from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timezone

class PollutionLogBase(BaseModel):
    location_id: str
    industry_id: Optional[str] = None
    category: str  # "Air", "Water", or "Noise"
    parameters: Dict[str, float]  # e.g., {"PM2.5": 45.5, "SO2": 12.1}
    parameter_units: Optional[Dict[str, str]] = None # New: e.g., {"CustomX": "mg/m3"}
    source: str  # "Manual" or "IoT"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PollutionLogCreate(PollutionLogBase):
    pass

class PollutionLogResponse(PollutionLogBase):
    id: str
