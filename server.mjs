import nextEnv from "@next/env";
import http from "node:http";
import next from "next";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const { default: createRealtimeServer } = await import("./server/realtime.mjs");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
await app.prepare();

const httpServer = http.createServer((request, response) => {
  const isProduction = process.env.NODE_ENV === "production";
  const isApi = String(request.url || "").startsWith("/api/");

  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.setHeader("X-Permitted-Cross-Domain-Policies", "none");

  if (isApi) response.setHeader("Cache-Control", "no-store, max-age=0");
  if (isProduction) response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  handle(request, response);
});

httpServer.keepAliveTimeout = 65_000;
httpServer.headersTimeout = 66_000;
httpServer.requestTimeout = 120_000;
httpServer.maxRequestsPerSocket = 100;

const io = createRealtimeServer(httpServer);

function shutdown(signal) {
  console.log(`[Suno] ${signal} received. Shutting down gracefully…`);
  io.close(() => {
    httpServer.close(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));

httpServer.listen(port, hostname, () => {
  console.log(`[Suno] ${dev ? "Development" : "Production"} server running on http://${hostname}:${port}`);
  console.log("[Suno] Socket.IO realtime endpoint: /socket.io");
});