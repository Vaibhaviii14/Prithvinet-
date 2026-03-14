import math
from datetime import datetime, timezone, timedelta

async def detect_anomaly(db, location_id: str, parameters: dict) -> dict:
    if not parameters:
        return {"is_anomaly": False}
        
    # Safely get the pollutant name (e.g., "PM2.5") and its value
    pollutant = list(parameters.keys())[0]
    new_value = float(parameters[pollutant])
    
    time_24h_ago = datetime.now(timezone.utc) - timedelta(hours=24)
    
    # Query the correct pollution_logs collection
    match_query = {
        "location_id": str(location_id),
        "timestamp": {"$gte": time_24h_ago}
    }
    
    logs = await db.pollution_logs.find(match_query).to_list(length=100)
    
    # Extract the historical values from the dictionaries
    historical_values = []
    for log in logs:
        val = log.get("parameters", {}).get(pollutant)
        if val is not None:
            historical_values.append(float(val))
            
    # Guardrail: Insufficient data
    if len(historical_values) < 5:
        return {"is_anomaly": False, "reason": "insufficient_data"}
        
    # IQR (Interquartile Range) Filter to prevent Outlier Masking
    historical_values = sorted(historical_values)
    q1_idx = len(historical_values) // 4
    q3_idx = (len(historical_values) * 3) // 4
    
    q1 = historical_values[q1_idx]
    q3 = historical_values[q3_idx]
    
    iqr = q3 - q1
    lower_bound = q1 - (1.5 * iqr)
    upper_bound = q3 + (1.5 * iqr)
    
    clean_values = [v for v in historical_values if lower_bound <= v <= upper_bound]
    
    if len(clean_values) < 5:
        clean_values = historical_values
        
    # Math: Mean and Std Dev
    mean = sum(clean_values) / len(clean_values)
    variance = sum((x - mean) ** 2 for x in clean_values) / len(clean_values)
    std_dev = math.sqrt(variance)
    
    if std_dev == 0.0:
        std_dev = 0.01
        
    # Z-Score Calculation
    z_score = abs((new_value - mean) / std_dev)
    
    if z_score > 3.0:
        return {
            "is_anomaly": True,
            "z_score": round(z_score, 2),
            "mean": round(mean, 2),
            "pollutant": pollutant,
            "value": new_value
        }
        
    return {"is_anomaly": False}
