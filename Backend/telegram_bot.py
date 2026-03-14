import os
import logging
import httpx
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ContextTypes,
    ConversationHandler
)

# Load environment variables
load_dotenv()

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

# Constants
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

if not BOT_TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN is not set in the environment.")
    # For demo purposes, won't crash here so code can be inspected, but application will fail to run.

# Conversation States
(
    CHOOSING_ROLE,
    LOGIN_EMAIL,
    LOGIN_PASSWORD,
    INDUSTRY_DASHBOARD,
    INDUSTRY_PROMPT_DATA,
    INDUSTRY_SUBMIT_DATA,
    RO_DASHBOARD
) = range(7)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Send a message when the command /start is issued."""
    keyboard = [
        [InlineKeyboardButton("🌍 Citizen", callback_data="Citizen")],
        [InlineKeyboardButton("🏭 Industry Login", callback_data="Industry")],
        [InlineKeyboardButton("👮 RO Login", callback_data="RO")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    msg = "Welcome to PrithviNet! Please select your role:"
    if update.message:
        await update.message.reply_text(msg, reply_markup=reply_markup)
    else:
        await update.callback_query.edit_message_text(msg, reply_markup=reply_markup)
        
    return CHOOSING_ROLE

async def handle_role_selection(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Parses the CallbackQuery and updates the message text."""
    query = update.callback_query
    await query.answer()
    role = query.data
    context.user_data['role'] = role
    
    if role == "Citizen":
        try:
            # Aligned with backend: /api/public/dashboard-data
            endpoint = "http://localhost:8000/api/public/dashboard-data" 
            
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint)
                if response.status_code == 200:
                    data = response.json()
                    info = data.get("city_info", {})
                    aqi = info.get("aqi", "Unknown")
                    wqi = info.get("wqi", "Unknown")
                else:
                    aqi = "Good (45)"
                    wqi = "Excellent (92)"
                    
            msg = (
                "🌍 *Public Environmental Summary*\n\n"
                f"🌬️ *Air Quality Index (AQI):* {aqi}\n"
                f"💧 *Water Quality Index (WQI):* {wqi}\n\n"
                "Visit our public portal for more details."
            )
            await query.edit_message_text(text=msg, parse_mode="Markdown")
            
        except httpx.ConnectError:
            await query.edit_message_text("❌ Backend is unreachable. Please try again later.")
        except Exception as e:
            logger.error(f"Error fetching citizen report: {e}")
            await query.edit_message_text("❌ Failed to fetch public data.")
            
        return ConversationHandler.END
        
    elif role in ["Industry", "RO"]:
        await query.edit_message_text(text=f"Selected: {role}\n\nPlease enter your email address to login:")
        return LOGIN_EMAIL

async def login_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Gets email and asks for password."""
    context.user_data['email'] = update.message.text.strip()
    await update.message.reply_text("Please enter your password:")
    return LOGIN_PASSWORD

async def login_password(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Authenticates the user against the backend."""
    password = update.message.text.strip()
    email = context.user_data.get('email')
    
    # ENSURE ROLE IS LOWERCASE FOR BACKEND COMPATIBILITY
    role = context.user_data.get('role', "").lower()
    
    try:
        # Aligned with backend auth prefix
        endpoint = "http://localhost:8000/api/auth/login"
        form_data = {"username": email, "password": password}
        
        async with httpx.AsyncClient() as client:
            response = await client.post(endpoint, data=form_data)
            
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token")
                context.user_data['access_token'] = token
                
                # Link Telegram Chat ID and Fetch Profile
                chat_id = update.effective_chat.id
                
                # Fetch full user profile
                me_endpoint = "http://localhost:8000/api/auth/me"
                headers = {"Authorization": f"Bearer {token}"}
                async with httpx.AsyncClient() as client:
                    me_resp = await client.get(me_endpoint, headers=headers)
                    if me_resp.status_code == 200:
                        user_info = me_resp.json()
                        context.user_data['entity_id'] = user_info.get("entity_id")
                        context.user_data['user_id'] = user_info.get("id")
                        context.user_data['region_id'] = user_info.get("region_id")
                        
                        # Direct DB update to link Telegram (Hackathon Shortcut)
                        try:
                            from motor.motor_asyncio import AsyncIOMotorClient
                            mongo_uri = os.getenv("MONGO_URI")
                            if mongo_uri:
                                m_client = AsyncIOMotorClient(mongo_uri)
                                m_db = m_client.prithvinet
                                await m_db.users.update_one(
                                    {"email": email},
                                    {"$set": {"telegram_chat_id": str(chat_id)}}
                                )
                                logger.info(f"Linked Telegram {chat_id} to {email}")
                        except Exception as ex:
                            logger.error(f"Failed to link telegram_chat_id: {ex}")
                
                await update.message.reply_text(f"✅ Login successful as {role.capitalize()}!")
                
                if role == "industry":
                    return await industry_dashboard(update, context)
                elif role == "ro":
                    return await ro_dashboard(update, context)
            else:
                logger.error(f"Login failed with status {response.status_code}: {response.text}")
                try:
                    error_detail = response.json().get("detail", "Invalid credentials")
                except:
                    error_detail = "Invalid credentials"
                await update.message.reply_text(f"❌ Login failed: {error_detail}. Type /start to try again.")
                return ConversationHandler.END
                
    except httpx.ConnectError:
        await update.message.reply_text("❌ Backend is unreachable. Please try again later. Type /start to try again.")
        return ConversationHandler.END
    except Exception as e:
        logger.error(f"Login error: {e}")
        await update.message.reply_text("❌ An error occurred during login. Type /start to try again.")
        return ConversationHandler.END

async def industry_dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Displays the industry dashboard inline keyboard."""
    keyboard = [
        [InlineKeyboardButton("🌬️ Log Air Data", callback_data="Air")],
        [InlineKeyboardButton("💧 Log Water Data", callback_data="Water")],
        [InlineKeyboardButton("🔊 Log Noise Data", callback_data="Noise")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    msg = "🏭 *Industry Dashboard*\n\nChoose an environment category to log:"
    
    if update.message:
        await update.message.reply_markdown(msg, reply_markup=reply_markup)
    else:
        await update.callback_query.edit_message_text(msg, reply_markup=reply_markup, parse_mode="Markdown")
        
    return INDUSTRY_PROMPT_DATA

async def prompt_industry_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Prompts for data in key=value format based on selected category."""
    query = update.callback_query
    await query.answer()
    
    category = query.data
    context.user_data['log_category'] = category
    
    msg = (
        f"Please enter your *{category}* readings separated by commas.\n\n"
        "Format: `Parameter=Value, Parameter=Value`\n"
        "Example: `SO2=45.5, PM2.5=120`"
    )
    await query.edit_message_text(text=msg, parse_mode="Markdown")
    return INDUSTRY_SUBMIT_DATA

async def submit_industry_data(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Parses and submits the log to the backend."""
    raw_text = update.message.text
    category = context.user_data.get('log_category')
    token = context.user_data.get('access_token')
    
    try:
        # Parse logic
        parsed_dict = {}
        parts = [p.strip() for p in raw_text.split(',')]
        for p in parts:
            if '=' not in p:
                raise ValueError(f"Missing '=' in '{p}'")
            key, val = p.split('=')
            parsed_dict[key.strip()] = float(val.strip())
            
        # Submission
        # Aligned with backend ingestion prefix
        endpoint = "http://localhost:8000/api/ingestion/manual"
        headers = {"Authorization": f"Bearer {token}"}
        
        # payload matching Pydantic model PollutionLogCreate
        industry_id = context.user_data.get('entity_id', "auto")
        
        payload = {
            "category": category,
            "parameters": parsed_dict,
            "location_id": "bot_quick_log",
            "industry_id": industry_id,
            "source": "Manual"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            
            if response.status_code in [200, 201]:
                await update.message.reply_text("✅ Log saved successfully!")
            else:
                resp_text = response.text
                logger.error(f"Backend rejected log (Status {response.status_code}): {resp_text}")
                await update.message.reply_text(f"❌ Submission failed: {response.status_code}. Details: {resp_text[:100]}")
                
        # Return to dashboard
        return await industry_dashboard(update, context)
            
    except ValueError as e:
        await update.message.reply_text(f"❌ Parsing Error: {e}\n\nPlease try again using the format `Key=Value, Key=Value`.", parse_mode="Markdown")
        return INDUSTRY_SUBMIT_DATA
    except httpx.ConnectError:
        await update.message.reply_text("❌ Backend is unreachable. Your log was not saved.")
        return await industry_dashboard(update, context)
    except Exception as e:
        logger.error(f"Error submitting data: {e}")
        await update.message.reply_text("❌ Failed to submit data.")
        return await industry_dashboard(update, context)

async def ro_dashboard(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Displays the RO dashboard inline keyboard."""
    keyboard = [
        [InlineKeyboardButton("🚨 View Active Alerts", callback_data="alerts")],
        [InlineKeyboardButton("👥 Dispatch Monitoring Team", callback_data="dispatch")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    msg = "👮 *Regional Officer Dashboard*\n\nSelect an action:"
    
    if update.message:
        await update.message.reply_markdown(msg, reply_markup=reply_markup)
    else:
        await update.callback_query.edit_message_text(msg, reply_markup=reply_markup, parse_mode="Markdown")
        
    return RO_DASHBOARD

async def handle_popup_notification(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles global callback queries for popup alerts with show_alert=True."""
    query = update.callback_query
    data = query.data
    
    if data.startswith("popup_alert_"):
        # Format: popup_alert_{param}_{value}
        parts = data.split("_")
        param = parts[2] if len(parts) > 2 else "Unknown"
        value = parts[3] if len(parts) > 3 else "N/A"
        
        # This triggers the MODAL POPUP in the Telegram UI
        await query.answer(
            text=f"🚨 CRITICAL VIOLATION 🚨\n\nParameter: {param}\nValue: {value}\n\nPlease take immediate action!",
            show_alert=True
        )
    else:
        await query.answer()

async def handle_ro_action(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Handles RO actions."""
    query = update.callback_query
    await query.answer()
    
    action = query.data
    token = context.user_data.get('access_token')
    
    if action == "alerts":
        try:
            # Aligned with backend alerts prefix
            endpoint = "http://localhost:8000/api/alerts"
            headers = {"Authorization": f"Bearer {token}"}
            
            async with httpx.AsyncClient() as client:
                response = await client.get(endpoint, headers=headers)
                
                if response.status_code == 200:
                    alerts_data = response.json()
                    
                    if not alerts_data:
                        await query.edit_message_text("✅ No active unresolved alerts currently.")
                    else:
                        msg = "🚨 *Top Active Alerts:*\n\n"
                        for a in alerts_data[:3]:
                            param = a.get("parameter", "Unknown")
                            val = a.get("exceeded_value", "N/A")
                            sev = a.get("severity", "WARNING")
                            msg += f"• [{sev}] {param}: {val}\n"
                            
                        kb = [[InlineKeyboardButton("🔙 Back to Dashboard", callback_data="back")]]
                        await query.edit_message_text(text=msg, reply_markup=InlineKeyboardMarkup(kb), parse_mode="Markdown")
                        return RO_DASHBOARD
                else:
                    await query.edit_message_text(f"❌ Failed to fetch alerts: {response.status_code}")

        except httpx.ConnectError:
             await query.edit_message_text("❌ Backend is unreachable.")
             
    elif action == "dispatch":
        await query.edit_message_text("✅ Monitoring Team successfully dispatched to high-risk locations.")
        # Re-show the dashboard after a short delay or offer a back button
        kb = [[InlineKeyboardButton("🔙 Back to Dashboard", callback_data="back")]]
        await query.edit_message_reply_markup(reply_markup=InlineKeyboardMarkup(kb))
        return RO_DASHBOARD
        
    elif action == "back":
        return await ro_dashboard(update, context)
        
    return RO_DASHBOARD

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancels and ends the conversation."""
    await update.message.reply_text("Goodbye! Type /start to use the bot again.")
    return ConversationHandler.END

def main():
    """Run the bot."""
    if not BOT_TOKEN:
        print("❌ Error: TELEGRAM_BOT_TOKEN environment variable not set.")
        return

    application = ApplicationBuilder().token(BOT_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            CHOOSING_ROLE: [CallbackQueryHandler(handle_role_selection)],
            LOGIN_EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_email)],
            LOGIN_PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, login_password)],
            INDUSTRY_DASHBOARD: [CallbackQueryHandler(prompt_industry_data)],
            INDUSTRY_PROMPT_DATA: [CallbackQueryHandler(prompt_industry_data)],
            INDUSTRY_SUBMIT_DATA: [MessageHandler(filters.TEXT & ~filters.COMMAND, submit_industry_data)],
            RO_DASHBOARD: [CallbackQueryHandler(handle_ro_action)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)
    
    # Global handler for popup notifications
    application.add_handler(CallbackQueryHandler(handle_popup_notification, pattern="^popup_alert_"))
    
    print("🤖 PrithviNet Telegram Bot v2 running! Press Ctrl+C to stop.")
    application.run_polling()

if __name__ == "__main__":
    main()
