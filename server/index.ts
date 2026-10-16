import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appRouter } from "./routers.js";
import { createContext, isAdminToken } from "./trpc.js";
import { getImageFile, DATA_DIR } from "./db.js";
import { analysisEvents } from "./events.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "20mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// 本機同步程式訂閱這條 SSE 連線，有新分析完成就立刻收到通知
app.get("/api/events", (req, res) => {
  const token = req.headers["x-admin-token"];
  if (!isAdminToken(typeof token === "string" ? token : undefined)) {
    res.status(401).end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write(": connected\n\n");
  const onSaved = (id: string) => res.write(`event: saved\ndata: ${id}\n\n`);
  // 定期送心跳，避免中間的代理伺服器把閒置連線切斷
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);
  analysisEvents.on("saved", onSaved);
  req.on("close", () => {
    clearInterval(heartbeat);
    analysisEvents.off("saved", onSaved);
  });
});

// 後台看原圖用；<img> 無法帶 header，所以密碼放在 query string
app.get("/api/images/:id", (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : undefined;
  if (!isAdminToken(token)) {
    res.status(401).end();
    return;
  }
  const file = getImageFile(req.params.id);
  if (!file) {
    res.status(404).end();
    return;
  }
  res.type(file.mimeType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(file.path);
});

// 有 build 好的前端就直接提供（Render 上與本機 npm run local 都適用）
const publicDir = path.join(__dirname, "public");
if (process.env.NODE_ENV === "production" || fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`資料存放於 ${DATA_DIR}`);
});
