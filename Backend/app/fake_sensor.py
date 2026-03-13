import asyncio
import websockets
import json
import random
import time
import os
from dotenv import load_dotenv

# Load variables from the .env file
load_dotenv()

async def simulate_iot_device(location_id: str, industry_id: str):
    uri = f"ws://localhost:8000/api/ingestion/live/{location_id}"
    
    print(f"📡 Connecting to PrithviNet WebSocket at {uri}...")
    
    async with websockets.connect(uri) as websocket:
        print("✅ Connected! Starting data stream...\n")
        
        while True:
            # Simulate slight fluctuations in pollution data
            pm25_level = round(random.uniform(35.0, 80.0), 2)
            so2_level = round(random.uniform(10.0, 25.0), 2)
            
            payload = {
                "industry_id": industry_id,
                "category": "Air",
                "parameters": {
                    "PM2.5": pm25_level,
                    "SO2": so2_level
                }
            }
            
            await websocket.send(json.dumps(payload))
            
            # Wait for the backend acknowledgment
            response = await websocket.recv()
            print(f"📤 Sent: {payload['parameters']} | 📥 Reply: {json.loads(response)['status']}")
            
            # Send data every 3 seconds
            await asyncio.sleep(3)

if __name__ == "__main__":
    # Replace these with actual IDs from your MongoDB Master Data
    TEST_LOCATION_ID = os.getenv("TEST_LOCATION_ID")
    TEST_INDUSTRY_ID = os.getenv("TEST_INDUSTRY_ID")
    
    asyncio.run(simulate_iot_device(TEST_LOCATION_ID, TEST_INDUSTRY_ID))