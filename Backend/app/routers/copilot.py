import os
import json
import random
import logging
from datetime import datetime, timedelta, timezone
from groq import AsyncGroq  # Changed to AsyncGroq for FastAPI compatibility
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Any
from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/copilot/ask", tags=["AI Copilot"])

class CopilotQuery(BaseModel):
    query: str
    scope_type: str
    scope_id: str

class CopilotResponse(BaseModel):
    impact: str
    insight: str
    chartData: List[dict]

# Initialize Groq Client
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    logger.warning("GROQ_API_KEY not found in environment variables.")

# Create the async client
client = AsyncGroq(api_key=api_key)

async def extract_intent(query: str) -> dict:
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in the environment.")

    prompt = f"""
Parse the following natural language query and extract the intent for a "What-If" environmental analysis. 
You MUST return ONLY a valid JSON object with EXACTLY the following structure.
{{
    "target_entity": "string (e.g., industry name or 'region')",
    "pollutant": "string (e.g., 'SO2', 'PM2.5')",
    "percentage_change": float (e.g., -0.30 for 30% reduction, 0.15 for 15% increase)
}}

If any of the fields cannot be determined from the query, set their value to null.

User Query: "{query}"
"""

    try:
        # Call Groq API
        response = await client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant", # Extremely fast Groq model
            response_format={"type": "json_object"} # Forces Groq to return clean JSON!
        )
        
        text_response = response.choices[0].message.content.strip()
        parsed_json = json.loads(text_response)
        
        # Ensure correct structure
        intent = {
            "target_entity": parsed_json.get("target_entity"),
            "pollutant": parsed_json.get("pollutant"),
            "percentage_change": parsed_json.get("percentage_change")
        }
        return intent

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON from LLM: {str(e)}\nResponse was: {text_response}")
        return {"error": "Failed to parse intent. The AI returned malformed data.", "raw_response": text_response}
    except Exception as e:
        logger.error(f"Error during intent extraction: {str(e)}")
        return {"error": str(e)}

@router.post("")
async def ask_copilot(request: CopilotQuery):
    query = request.query.lower()
    scope_type = request.scope_type
    scope_id = request.scope_id
    db = get_db()
    
    # Extract the intent using the LLM helper function
    try:
        intent = await extract_intent(query)
    except ValueError as ve:
        raise HTTPException(status_code=500, detail=str(ve))
    
    pollutant = intent.get("pollutant")
    percentage_change = intent.get("percentage_change")
    
    # If LLM didn't extract a pollutant, we can't do the math model
    if not pollutant:
        return CopilotResponse(
            impact="Unknown",
            insight="I couldn't identify the specific pollutant from your query to perform a what-if analysis. Please specify a parameter like PM2.5 or SO2.",
            chartData=[]
        )
        
    # Aggregate data over the last 7 days for the given region and pollutant
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    match_query: dict[str, Any] = {
        "timestamp": {"$gte": seven_days_ago}
    }

    if scope_type == "industry":
        match_query["industry_id"] = scope_id
    elif scope_type == "region":
        locations = await db.monitoring_locations.find({"region_id": scope_id}).to_list(length=None)
        location_ids = []
        for loc in locations:
            if "id" in loc:
                location_ids.append(loc["id"])
                location_ids.append(str(loc["id"]))
            location_ids.append(str(loc["_id"]))
        match_query["location_id"] = {"$in": list(set(location_ids))}
    
    logs = await db.pollution_logs.find(match_query).to_list(length=500)
    
    valid_values = []
    for log in logs:
        params = log.get("parameters", {})
        if pollutant in params:
            val = params[pollutant]
            if val is not None:
                valid_values.append(float(val))  # type: ignore
    
    if not valid_values:
        return CopilotResponse(
            impact="No Data",
            insight=f"I couldn't find any historical logs for {pollutant} in {scope_type} {scope_id} over the last 7 days.",
            chartData=[]
        )
        
    baseline = sum(valid_values) / len(valid_values)
    
    # Mathematical Surrogate Model
    pct_change = float(percentage_change) if percentage_change is not None else 0.0
    new_baseline = baseline * (1 + pct_change)
    
    # Generate a 24-item array representing a 72-hour forecast
    forecast = []
    for i in range(24):
        time_label = f"{i*3}h"
        variation = random.uniform(-0.02, 0.02)
        point = new_baseline * (1 + variation)
        
        forecast.append({
            "time": time_label,
            "point": round(point, 2),
            "upper": round(point * 1.15, 2),
            "lower": round(point * 0.90, 2) 
        })

    # Request LLM to generate professional insight based on hard data
    insight_prompt = (
        f"The baseline for {pollutant} was {baseline:.2f}. "
        f"With a {pct_change*100:+.0f}% shift, the new baseline is {new_baseline:.2f}. "
        f"Write a 2-sentence professional insight for an environmental officer explaining how this impacts regional compliance risk."
    )
    
    try:
        # Call Groq API for the insight generation
        insight_response = await client.chat.completions.create(
            messages=[{"role": "user", "content": insight_prompt}],
            model="llama-3.1-8b-instant"
        )
        insight_text = insight_response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error generating insight text: {e}")
        insight_text = "An error occurred while generating compliance insights."
        
    impact_str = f"{pct_change*100:+.0f}% {pollutant} Levels"
    
    return CopilotResponse(
        impact=impact_str,
        insight=insight_text,
        chartData=forecast
    )