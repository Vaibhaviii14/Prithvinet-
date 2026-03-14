from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone

class AlertBase(BaseModel):
    industry_id: Optional[str] = None
    location_id: str
    category: str
    parameter: str
    exceeded_value: float
    allowed_value: float
    status: str = "UNRESOLVED"
    monitoring_team_id: Optional[str] = None
    alert_type: str = "COMPLIANCE" # COMPLIANCE, LIMIT_MISSING, or STATISTICAL_ANOMALY
    unit: Optional[str] = None
    log_id: Optional[str] = None
    industry_response: Optional[str] = None
    ro_feedback: Optional[str] = None
    responded_at: Optional[datetime] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # --- AI Copilot / Anomaly Engine Fields ---
    type: Optional[str] = None
    severity: Optional[str] = None
    message: Optional[str] = None

class AlertCreate(AlertBase):
    pass

class AlertResponse(AlertBase):
    id: str