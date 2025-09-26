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

// 🧠 Mapa de sockets por token
const tokenSockets = new Map();

wss.on("connection", (ws, req) => {
  const token = new URLSearchParams(req.url.split("?")[1]).get("token");

  if (token) {
    tokenSockets.set(token, ws);
    console.log("🔌 WebSocket conectado con token:", token); // ✅ LOG CRÍTICO
  } else {
    console.warn("⚠️ WebSocket sin token recibido");
  }

  ws.on("close", () => {
    tokenSockets.delete(token);
    console.log("🔌 WebSocket cerrado para token:", token);
  });
});

// ✅ Emitir evento "entregado"
app.post("/api/deliver", (req, res) => {
  const { token, messageId } = req.body;
  const socket = tokenSockets.get(token);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: "entregado", messageId }));
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Usuario no conectado" });
});

// 🟢 Emitir evento de presencia
app.post("/api/presence", (req, res) => {
  const { token, status } = req.body;
  tokenSockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "presence", status }));
    }
  });
  res.json({ success: true });
});
