from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.utils.websocket_manager import manager

router = APIRouter(prefix="/api/ws", tags=["WebSockets"])

@router.websocket("/alerts")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # The manager keeps track of connected clients
    except WebSocketDisconnect:
        manager.disconnect(websocket)
