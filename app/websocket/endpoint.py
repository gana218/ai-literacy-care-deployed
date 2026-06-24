import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager

router = APIRouter()

@router.websocket("/ws/reading/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(session_id, websocket)
    try:
        while True:
            # Wait for text messages from the client
            data = await websocket.receive_text()
            try:
                event_data = json.loads(data)
                event_type = event_data.get("event", "unknown")
                
                # M0 Verification: Print log to the server console
                print(f"[WS Log] Session: {session_id} | Event: {event_type} | Data: {event_data}")
                
                # Send back a receipt confirmation (ack)
                await websocket.send_json({
                    "status": "ack",
                    "event": event_type,
                    "timestamp": event_data.get("timestamp")
                })
            except json.JSONDecodeError:
                print(f"[WS Error] Invalid JSON received in session {session_id}: {data}")
                await websocket.send_json({"error": "Invalid JSON payload"})
                
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        print(f"[WS Disconnect] Connection closed for session {session_id}")
