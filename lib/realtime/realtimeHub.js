let ioInstance = null;

export function setRealtimeIO(io) {
  ioInstance = io;
}

export function getRealtimeIO() {
  return ioInstance;
}

export function roomSocketKey(roomId) {
  return `suno-room:${String(roomId)}`;
}

export function emitRoomEvent(roomId, event, payload) {
  ioInstance?.to(roomSocketKey(roomId)).emit(event, payload);
}

export function emitRoomClosed(roomId, payload = {}) {
  const io = ioInstance;
  if (!io) return;

  io.to(roomSocketKey(roomId)).emit("room:closed", {
    roomId: String(roomId),
    ...payload,
  });

  const sockets = io.sockets.sockets;
  for (const socket of sockets.values()) {
    if (socket.data?.roomId === String(roomId)) {
      socket.leave(roomSocketKey(roomId));
      socket.disconnect(true);
    }
  }
}

export function emitMemberRemoved(roomId, userId) {
  const io = ioInstance;
  if (!io) return;

  io.to(roomSocketKey(roomId)).emit("room:member-left", {
    roomId: String(roomId),
    userId: String(userId),
  });

  for (const socket of io.sockets.sockets.values()) {
    if (
      socket.data?.roomId === String(roomId) &&
      String(socket.data?.userId) === String(userId)
    ) {
      socket.emit("room:access-revoked", {
        roomId: String(roomId),
      });
      socket.leave(roomSocketKey(roomId));
      socket.disconnect(true);
    }
  }
}

export function emitMemberJoined(roomId, userId) {
  ioInstance?.to(roomSocketKey(roomId)).emit("room:member-joined", {
    roomId: String(roomId),
    userId: String(userId),
  });
}