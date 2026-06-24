from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Maps session_id (str) to a list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
        print(f"WebSocket client connected for session {session_id}. Active connections: {len(self.active_connections[session_id])}")

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            try:
                self.active_connections[session_id].remove(websocket)
                print(f"WebSocket client disconnected from session {session_id}.")
            except ValueError:
                pass
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_json_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error broadcasting to connection in session {session_id}: {e}")

manager = ConnectionManager()
