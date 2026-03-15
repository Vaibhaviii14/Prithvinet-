# 🌍 PrithviNet: Real-Time Environmental Compliance & Monitoring Ecosystem

> **PrithviNet** is a centralized, real-time command center designed for state environmental regulators to track industrial emissions, detect statistical anomalies using AI, and manage compliance workflows with zero latency. 

Built as a high-performance hackathon solution, PrithviNet replaces static, refresh-heavy dashboards with a fully reactive, WebSocket-driven architecture. Whether an IoT sensor detects a PM2.5 spike or an inspector submits a report via Telegram, the entire ecosystem updates instantly across all connected screens.

---

## ✨ Key Features

* **⚡ Zero-Latency "Sidecar" WebSockets:** An event-driven architecture ensures that the moment a database change occurs, a lightweight broadcast triggers silent frontend re-renders. No manual page refreshes required.
* **🤖 AI-Powered Anomaly Detection:** Real-time analysis of incoming telemetry (BOD, SO2, PM2.5, etc.) to detect statistical deviations from 24-hour moving averages.
* **🗺️ Live Synchronized Telemetry Map:** A dynamic, interactive map that cross-references live alert queues to update factory pin colors instantly (🔴 Unresolved, 🟡 Action Taken, 🔵 Inspection Pending, 🟢 Compliant).
* **📱 Telegram Bot Integration:** Field monitoring teams and inspectors can seamlessly log data and receive interactive push notifications directly via Telegram.
* **🛡️ Multi-Tier RBAC Workflows:** Dedicated portals and specific routing for Super Admins (State HQ), Regional Officers (ROs), Industries, and Monitoring Teams.
* **✉️ Automated Escalation Engine:** Automated HTML email triggers and Telegram alerts for critical emission limit breaches.

---

## 🏗️ System Architecture & Tech Stack

PrithviNet is built on a decoupled, asynchronous microservices architecture to ensure high throughput and scalability.

### **Frontend (Client Layer)**
* **Framework:** React 18 (via Vite)
* **Styling:** Tailwind CSS + Lucide React Icons
* **Mapping:** React-Leaflet (Interactive GIS Data)
* **State Management:** React Hooks with custom "Trigger State" pattern for real-time WebSocket decoupling.

### **Backend (API & Event Layer)**
* **Framework:** FastAPI (Python)
* **Async Operations:** `asyncio` for non-blocking I/O and Background Tasks (Emails/Notifications).
* **Real-time Engine:** Custom FastAPI `ConnectionManager` for global WebSocket broadcasting.

### **Database & AI**
* **Database:** MongoDB Atlas (NoSQL for flexible telemetry logging).
* **Driver:** Motor (Asynchronous Python driver for MongoDB).
* **AI/ML:** Custom statistical models (and Groq API for AI Copilot/Forecasting).

### **Integrations**
* **Notifications:** Telegram Bot API (using `aiogram` or `requests`), SMTP Email Server.

---

## 🔄 Core Compliance Workflow

PrithviNet digitizes the entire lifecycle of an environmental alert:

1. **Ingestion:** An Industry submits a daily log (or an IoT sensor pushes live data).
2. **Detection:** FastAPI runs the data against prescribed regional limits and the AI anomaly engine.
3. **Alert Generation:** If a breach occurs, a 🔴 **UNRESOLVED** alert is created. WebSockets fire, updating the Super Admin and RO maps instantly.
4. **Industry Response:** The offending Industry is notified and submits a corrective action plan. The alert shifts to 🟡 **ACTION_TAKEN**.
5. **RO Escalation:** The Regional Officer reviews the response and dispatches an inspector. The alert shifts to 🔵 **INSPECTION_PENDING**.
6. **Resolution:** The Monitoring Team visits the site, logs a compliant reading via the Telegram Bot or Portal, and the system auto-resolves the alert, turning the map pin 🟢 **COMPLIANT**.

---

## 🚀 Local Setup & Installation

Follow these steps to run the PrithviNet ecosystem on your local machine.

### Prerequisites
* Node.js (v18+)
* Python (3.9+)
* MongoDB Atlas Account (or local MongoDB server)
* Telegram Bot Token (via BotFather)

### 1. Clone the Repository
```bash
git clone [https://github.com/your-username/prithvinet.git](https://github.com/your-username/prithvinet.git)
cd prithvinet
2. Backend Setup
Bash
cd Backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```
Create a .env file in the Backend directory:
Code snippet
```
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/
SECRET_KEY=your_jwt_secret_key
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
# Add your SMTP/Email credentials here
```
Start the FastAPI Server:
Bash
```

uvicorn app.main:app --reload --port 8000
3. Frontend Setup
Open a new terminal window:
```
Bash
```

cd Frontend
npm install
Create a .env file in the Frontend directory:
```
Code snippet
```

VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/api/ws/alerts
Start the Vite Development Server:
```
Bash
```
npm run dev
4. Telegram Bot (Optional)
Open a third terminal window:
```
Bash
```
cd Backend
python telegram_bot.py
```
🌐 Deployment Details
PrithviNet is optimized for deployment on Render.com.

Backend: Deployed as a Python Web Service.

Frontend: Deployed as a Static Site (Vite Build) with React Router rewrite rules.

Telegram Bot: Deployed as an isolated Python Background Worker to ensure 24/7 uptime without sleep states.

🏆 Hackathon Team
Built with ❤️ and ☕ for Hack-e-thon [IIIT Naya Raipur].


S Vaibhavi - UI/UX & Frontend Integration

Shourya Sinha - Full Stack Architecture & WebSockets

Ashutosh Behera - AI/ML Engine & Data Models

Rahul Sahu - Backend Routing & API Integrations
