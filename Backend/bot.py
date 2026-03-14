import os
import logging
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.hash import bcrypt
from telegram import Update, Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
    ConversationHandler,
    CallbackQueryHandler,
)
from datetime import datetime

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO
)
logger = logging.getLogger(__name__)

# MongoDB Setup
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    # Fallback to local if not provided, or default atlas string
    MONGO_URI = "mongodb+srv://prithvinet_user_01:prithvinet_01@cluster0.snlud.mongodb.net/prithvinet?retryWrites=true&w=majority"
    
client = AsyncIOMotorClient(MONGO_URI)
db = client.prithvinet

# Conversation states
ROLE, EMAIL, PASSWORD = range(3)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Starts the conversation and asks the user for their role."""
    keyboard = [
        [
            InlineKeyboardButton("Citizen", callback_data="Citizen"),
            InlineKeyboardButton("Industry", callback_data="Industry"),
        ],
        [
            InlineKeyboardButton("RO", callback_data="RO"),
            InlineKeyboardButton("Monitoring Team", callback_data="Monitoring Team"),
        ],
        [
            InlineKeyboardButton("Super Admin", callback_data="Super Admin"),
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    text = "Welcome to PrithviNet! Please select your role to login:"
    if update.message:
        await update.message.reply_text(text, reply_markup=reply_markup)
    else:
        await update.callback_query.edit_message_text(text, reply_markup=reply_markup)

    return ROLE

async def role_selection(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the selected role and asks for email."""
    query = update.callback_query
    await query.answer()
    
    context.user_data['role'] = query.data
    await query.edit_message_text(f"Selected Role: {query.data}\n\nPlease enter your email address:")
    return EMAIL

async def get_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Stores the email and asks for password."""
    context.user_data['email'] = update.message.text
    await update.message.reply_text("Please enter your password:")
    return PASSWORD

async def get_password(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Verifies credentials against MongoDB and finishes login."""
    password = update.message.text
    email = context.user_data['email']
    role = context.user_data['role']
    
    # Query user from DB
    user = await db.users.find_one({"email": email, "role": role})
    
    is_valid = False
    if user:
        try:
            if "hashed_password" in user and bcrypt.verify(password, user["hashed_password"]):
                is_valid = True
        except ValueError:
            pass
            
        # Fallback to plain text dummy comparison
        if not is_valid and (user.get("hashed_password") == password or user.get("password") == password):
             is_valid = True
             
    if is_valid:
        # Update chat ID in MongoDB
        chat_id = update.effective_chat.id
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"telegram_chat_id": chat_id}}
        )
        
        context.user_data['logged_in'] = True
        context.user_data['user_id'] = str(user["_id"])
        context.user_data['region_id'] = user.get("region_id", "region_1")
        context.user_data['entity_id'] = user.get("entity_id", "entity_1")
        context.user_data['entity_name'] = user.get("entity_name", "Unknown Entity")
        
        msg = "✅ Login successful! Welcome to PrithviNet.\n\n"
        if role == "Industry":
            msg += "You can submit data using:\n`/report Air, SO2: 45, PM2.5: 80`"
        elif role == "RO":
            msg += "You can fetch alerts using:\n`/alerts`"
        
        await update.message.reply_markdown(msg)
        return ConversationHandler.END
            
    await update.message.reply_text("❌ Invalid email or password. Type /start to try again.")
    return ConversationHandler.END

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Cancels and ends the conversation."""
    await update.message.reply_text("Login cancelled. Type /start to try again.")
    return ConversationHandler.END

async def report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles Industry data submission."""
    if not context.user_data.get('logged_in') or context.user_data.get('role') != "Industry":
        await update.message.reply_text("❌ Unauthorized. Please login as Industry.")
        return
        
    text = update.message.text.replace('/report', '').strip()
    if not text:
        await update.message.reply_text("Usage: `/report Air, SO2: 45, PM2.5: 80`", parse_mode='Markdown')
        return
        
    # Example parsing: "Air, SO2: 45, PM2.5: 80"
    try:
        parts = [p.strip() for p in text.split(',')]
        domain = parts[0]
        readings = {}
        for p in parts[1:]:
            key, val = p.split(':')
            readings[key.strip()] = float(val.strip())
            
        doc = {
            "entity_id": context.user_data.get("entity_id"),
            "domain": domain,
            "readings": readings,
            "raw_text": text,
            "source": "telegram_bot",
            "timestamp": datetime.utcnow()
        }
        await db.readings.insert_one(doc)
        await update.message.reply_text("✅ Log saved successfully.")
    except Exception as e:
        logger.error(f"Error parsing report: {e}")
        await update.message.reply_text("❌ Failed to parse data. Ensure format is: `domain, param: val, param: val`")

async def alerts(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handles RO alert retrieval."""
    if not context.user_data.get('logged_in') or context.user_data.get('role') != "RO":
        await update.message.reply_text("❌ Unauthorized. Please login as Regional Officer.")
        return
        
    region_id = context.user_data.get('region_id')
    query = {"status": "UNRESOLVED"}
    
    # We query all unresolved alerts, or filter by region if region_id exists
    # If testing without region_ids in alerts, you can remove it or keep it lenient
    cursor = db.alerts.find(query).sort("timestamp", -1).limit(5)
    alerts_list = await cursor.to_list(length=5)
    
    if not alerts_list:
        await update.message.reply_text("✅ No active unresolved alerts currently.")
        return
        
    msg = "🚨 *Active Alerts:*\n\n"
    for a in alerts_list:
        # Default styling
        location_id = a.get("location_id", "Unknown Location")
        param = a.get("parameter_id", "Unknown Parameter")
        val = a.get("value", "N/A")
        msg += f"• *Location ID {location_id}* - Parameter {param} at {val}\n"
        
    await update.message.reply_markdown(msg)

# ---------------------------------------------------------
# Integration Function for FastAPI
# ---------------------------------------------------------
async def push_alert_to_ro(region_id: str, message: str):
    """
    Utility function to push an alert to all ROs in a region.
    Call this from your FastAPI backend!
    
    Example:
    from bot import push_alert_to_ro
    await asyncio.create_task(push_alert_to_ro("region_1", "🚨 CRITICAL ALERT: Violation detected."))
    """
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.error("TELEGRAM_BOT_TOKEN not set!")
        return
        
    bot = Bot(token=token)
    
    # Find all ROs
    query = {"role": "RO", "telegram_chat_id": {"$exists": True}}
    # Uncomment to restrict by region
    # if region_id:
    #     query["region_id"] = region_id
        
    ros = await db.users.find(query).to_list(length=None)
    
    for ro in ros:
        try:
            # 1. Send the message with high-priority push enabled
            sent_msg = await bot.send_message(
                chat_id=ro["telegram_chat_id"], 
                text=message, 
                parse_mode="Markdown",
                disable_notification=False
            )
            
            # 2. Pin the message to the top of the chat (Persistent Banner)
            await bot.pin_chat_message(
                chat_id=ro["telegram_chat_id"], 
                message_id=sent_msg.message_id,
                disable_notification=False
            )
            
            logger.info(f"Alert sent and pinned for RO {ro.get('email', 'unknown')}")
        except Exception as e:
            logger.error(f"Failed to send/pin alert for RO: {e}")

# ---------------------------------------------------------
# Main Bot Entrypoint
# ---------------------------------------------------------
def main() -> None:
    """Run the bot."""
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        print("❌ Error: TELEGRAM_BOT_TOKEN environment variable not set.")
        print("Please add it to your .env file or export it: export TELEGRAM_BOT_TOKEN='your_token'")
        return

    application = Application.builder().token(token).build()

    # Login Conversation Handler
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            ROLE: [CallbackQueryHandler(role_selection)],
            EMAIL: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_email)],
            PASSWORD: [MessageHandler(filters.TEXT & ~filters.COMMAND, get_password)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)
    application.add_handler(CommandHandler("report", report))
    application.add_handler(CommandHandler("alerts", alerts))

    print("🤖 Telegram Bot is running! Press Ctrl+C to stop.")
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
