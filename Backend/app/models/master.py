from pydantic import BaseModel
from typing import List, Optional

# ==========================================
# Regional Office Models
# ==========================================
class RegionalOfficeBase(BaseModel):
    name: str
    jurisdiction_districts: List[str]
    contact_email: str

class RegionalOfficeCreate(RegionalOfficeBase):
    pass

class RegionalOfficeUpdate(BaseModel):
    name: Optional[str] = None
    jurisdiction_districts: Optional[List[str]] = None
    contact_email: Optional[str] = None

class RegionalOfficeResponse(RegionalOfficeBase):
    id: str

# ==========================================
# Industry Models
# ==========================================
class IndustryBase(BaseModel):
    name: str
    industry_type: str
    region_id: str
    status: str = "Active"

class IndustryCreate(IndustryBase):
    pass

class IndustryUpdate(BaseModel):
    name: Optional[str] = None
    industry_type: Optional[str] = None
    region_id: Optional[str] = None
    status: Optional[str] = None

class IndustryResponse(IndustryBase):
    id: str

# ==========================================
# Monitoring Location Models
# ==========================================
class MonitoringLocationBase(BaseModel):
    name: str
    type: str  # Air, Water, Noise
    region_id: str
    industry_id: Optional[str] = None
    latitude: float
    longitude: float

class MonitoringLocationCreate(MonitoringLocationBase):
    pass

class MonitoringLocationUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    region_id: Optional[str] = None
    industry_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class MonitoringLocationResponse(MonitoringLocationBase):
    id: str

# ==========================================
# Prescribed Limit Models
# ==========================================
class PrescribedLimitBase(BaseModel):
    parameter: str  # e.g., "SO2"
    category: str   # e.g., "Air"
    max_allowed_value: float
    unit: str

class PrescribedLimitCreate(PrescribedLimitBase):
    pass

class PrescribedLimitUpdate(BaseModel):
    parameter: Optional[str] = None
    category: Optional[str] = None
    max_allowed_value: Optional[float] = None
    unit: Optional[str] = None

class PrescribedLimitResponse(PrescribedLimitBase):
    id: str
