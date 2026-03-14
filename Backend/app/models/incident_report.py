from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class IncidentReportCreate(BaseModel):
    category: str                        # air | water | noise | dumping | other
    location: str
    severity: int                        # 1-5
    description: str
    anonymous: bool = False
    contact_info: Optional[str] = None   # only if not anonymous


class IncidentReportResponse(BaseModel):
    tracking_id: str
    status: str = "received"
    submitted_at: datetime
