import os
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

async def send_html_email(to_email: str, subject: str, html_content: str):
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    
    if not smtp_username or not smtp_password:
        logger.warning(f"SMTP variables not set, skipped sending email to {to_email}")
        return

    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }}
            .header {{ background-color: #1a1a1a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .header h1 {{ color: #ffffff; margin: 0; font-size: 24px; }}
            .content {{ padding: 20px; line-height: 1.6; font-size: 16px; }}
            .footer {{ margin-top: 20px; text-align: center; font-size: 12px; color: #777; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">PrithviNet</h1>
            </div>
            <div class="content">
                {html_content}
            </div>
            <div class="footer">
                &copy; 2026 PrithviNet Environmental Compliance Platform. All rights reserved.
            </div>
        </div>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_username
    msg["To"] = to_email

    msg.attach(MIMEText(full_html, "html"))

    server = None
    try:
        # Use Gmail's SMTP server by default, but it can be parameterized if needed
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(smtp_username, smtp_password)
        server.sendmail(smtp_username, to_email, msg.as_string())
        logger.info(f"Email successfully sent to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}. Error: {type(e).__name__}: {str(e)}", exc_info=True)
    finally:
        if server is not None:
            try:
                server.quit()
            except Exception as e:
                logger.error(f"Failed to quit SMTP server connection gracefully: {str(e)}")
