import httpx
import logging
import os
from dotenv import load_dotenv
from fastapi import BackgroundTasks

load_dotenv()

logger = logging.getLogger(__name__)

async def send_telegram_alert(chat_id: str, text: str, reply_markup: dict = None) -> bool:
    """
    Sends an asynchronous Markdown-formatted push notification to a Telegram Chat ID,
    forces a high-priority sound notification, and pins the message to the top.
    
    Args:
        chat_id: The Telegram chat ID (can be user, group, or channel)
        text: The Markdown formatted message text
        reply_markup: Optional dictionary for inline keyboards
        
    Returns:
        bool: True if initial message sent successfully, False otherwise.
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not token:
        logger.error("Error: TELEGRAM_BOT_TOKEN not found in environment")
        return False
        
    base_url = f"https://api.telegram.org/bot{token}"
    send_url = f"{base_url}/sendMessage"
    
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown",
        "disable_notification": False  # FORCE mobile push with sound/vibration
    }
    
    if reply_markup:
        payload["reply_markup"] = reply_markup
    
    try:
        async with httpx.AsyncClient() as client:
            # 1. Send the Message
            response = await client.post(send_url, json=payload, timeout=5.0)
            
            if response.status_code == 200:
                result = response.json()
                message_id = result.get("result", {}).get("message_id")
                
                # 2. Pin the Message (Triggers a secondary persistent high-priority banner)
                if message_id:
                    pin_url = f"{base_url}/pinChatMessage"
                    pin_payload = {
                        "chat_id": chat_id,
                        "message_id": message_id,
                        "disable_notification": False # Force notification for the pin action too
                    }
                    await client.post(pin_url, json=pin_payload, timeout=5.0)
                
                logger.info(f"Successfully pushed and pinned Telegram alert to {chat_id}")
                return True
            else:
                logger.error(f"Telegram API Error ({response.status_code}): {response.text}")
                return False
                
    except httpx.ConnectError:
        logger.error("Failed to connect to Telegram API. Backend might be offline or network is down.")
        return False
    except httpx.TimeoutException:
        logger.error("Telegram API request timed out.")
        return False
    except Exception as e:
        logger.error(f"Unexpected error pushing Telegram alert: {e}")
        return False


"""
--- HOW TO USE THIS IN A FASTAPI ROUTE ---

From within your route handler, use FastAPI's BackgroundTasks so 
the request doesn't hang waiting for Telegram network latency.

from fastapi import APIRouter, BackgroundTasks
from app.utils.telegram_push import send_telegram_alert

router = APIRouter()

@router.post("/trigger-alert")
async def trigger_high_alert(background_tasks: BackgroundTasks):
    
    # Example Database lookup for RO's chat id
    ro_chat_id = "123456789"  
    
    message = (
        "🚨 *CRITICAL ALERT DETECTED*\n\n"
        "Location: Bhopal Industry Zone\n"
        "Value: PM2.5 at 150 (Limit > 60)\n\n"
        "Please open your dashboard immediately."
    )
    
    # 💥 Queue the alert to run completely in the background 💥
    background_tasks.add_task(send_telegram_alert, ro_chat_id, message)
    
    return {"status": "Alert triggered in background!"}
"""
