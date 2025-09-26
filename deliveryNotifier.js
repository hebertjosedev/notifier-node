const express = require("express");
const WebSocket = require("ws");
const cors = require("cors");

const app = express();

// 🛡️ CORS abierto para tu frontend en Vercel
app.use(cors({
  origin: "https://servipro-frontend-9drm.vercel.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// 🎙️ Servidor HTTP + WebSocket unificado
const server = app.listen(process.env.PORT || 3002, () => {
  console.log("🚀 Notificador de entrega activo");
});

const wss = new WebSocket.Server({ server });

// 🧠 Mapa de sockets por token (permite múltiples conexiones)
const tokenSockets = new Map(); // Map<string, Set<WebSocket>>

wss.on("connection", (ws, req) => {
  const params = new URLSearchParams(req.url.split("?")[1]);
  const token = params.get("token");
  const requestId = params.get("requestId");

  if (token && requestId) {
    ws.token = token;
    ws.requestId = requestId;

    if (!tokenSockets.has(token)) {
      tokenSockets.set(token, new Set());
    }
    tokenSockets.get(token).add(ws);

    console.log("🔌 WebSocket conectado:", { token, requestId });
  } else {
    console.warn("⚠️ WebSocket sin token o requestId");
  }

  ws.on("close", () => {
    const socketSet = tokenSockets.get(ws.token);
    if (socketSet) {
      socketSet.delete(ws);
      if (socketSet.size === 0) {
        tokenSockets.delete(ws.token);
      }
    }
    console.log("🔌 WebSocket cerrado para token:", ws.token);
  });
});

// ✅ Emitir evento "entregado"
app.post("/api/deliver", (req, res) => {
  const { token, messageId } = req.body;
  const socketSet = tokenSockets.get(token);
  if (socketSet) {
    socketSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "entregado", messageId }));
      }
    });
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Usuario no conectado" });
});

// 🟢 Emitir evento de presencia
app.post("/api/presence", (req, res) => {
  const { token, status, requestId } = req.body;

  if (!requestId || !status) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  let count = 0;
  tokenSockets.forEach((socketSet) => {
    socketSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.requestId === requestId) {
        ws.send(JSON.stringify({ type: "presence", status }));
        count++;
      }
    });
  });

  console.log(`📡 Presencia emitida a ${count} sockets para requestId: ${requestId}`);
  res.json({ success: true });
});
