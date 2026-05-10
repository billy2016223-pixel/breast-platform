import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appRouter } from "./routers.js";

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
    createContext: () => ({}),
  })
);

if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(__dirname, "public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
