// 把雲端（Render）上的分析紀錄與原圖拉回本機 data/ 保存。
// 用法：npm run sync          同步一次
//       npm run sync -- --watch  持續執行：雲端一完成分析就立刻同步，另每 5 分鐘補抓一次
// 需要在 .env 設定 REMOTE_URL 與 REMOTE_ADMIN_PASSWORD
import { hasAnalysis, importAnalysis, DATA_DIR, type AnalysisRecord } from "../server/db.js";

const REMOTE_URL = process.env.REMOTE_URL?.replace(/\/+$/, "");
const PASSWORD = process.env.REMOTE_ADMIN_PASSWORD;
const PAGE_SIZE = 200;
const WATCH_INTERVAL_MS = 5 * 60 * 1000;

if (!REMOTE_URL || !PASSWORD) {
  console.error("請在 .env 設定 REMOTE_URL 與 REMOTE_ADMIN_PASSWORD");
  process.exit(1);
}

async function fetchPage(offset: number): Promise<{ items: AnalysisRecord[]; total: number }> {
  const input = encodeURIComponent(JSON.stringify({ json: { limit: PAGE_SIZE, offset } }));
  const res = await fetch(`${REMOTE_URL}/api/trpc/admin.list?input=${input}`, {
    headers: { "x-admin-token": PASSWORD! },
  });
  if (res.status === 401) throw new Error("遠端後台密碼錯誤");
  if (!res.ok) throw new Error(`讀取紀錄失敗：HTTP ${res.status}`);
  const body = await res.json();
  return body.result.data.json;
}

async function syncOnce() {
  let offset = 0;
  let added = 0;
  let total = 0;
  // 遠端依建立時間新到舊排序，翻頁直到全部看過
  while (true) {
    const page = await fetchPage(offset);
    total = page.total;
    for (const rec of page.items) {
      if (hasAnalysis(rec.id)) continue;
      const img = await fetch(`${REMOTE_URL}/api/images/${rec.id}?token=${encodeURIComponent(PASSWORD!)}`);
      if (!img.ok) {
        console.warn(`  略過 ${rec.fileName}：原圖下載失敗 HTTP ${img.status}`);
        continue;
      }
      importAnalysis(rec, Buffer.from(await img.arrayBuffer()));
      added++;
    }
    offset += page.items.length;
    if (page.items.length === 0 || offset >= total) break;
  }
  console.log(`[${new Date().toLocaleString("zh-TW")}] 遠端共 ${total} 筆，新存入本機 ${added} 筆`);
}

// 同一時間只跑一次同步；跑的期間又有通知進來，結束後再補跑一次
let syncing = false;
let pending = false;
async function requestSync() {
  if (syncing) {
    pending = true;
    return;
  }
  syncing = true;
  try {
    do {
      pending = false;
      await syncOnce();
    } while (pending);
  } catch (err) {
    console.error("同步失敗：", (err as Error).message);
  } finally {
    syncing = false;
  }
}

// 訂閱雲端的即時通知；斷線後自動重連
async function subscribe() {
  let retryMs = 5_000;
  while (true) {
    try {
      const res = await fetch(`${REMOTE_URL}/api/events`, {
        headers: { "x-admin-token": PASSWORD!, Accept: "text/event-stream" },
      });
      if (res.status === 401) throw new Error("遠端後台密碼錯誤");
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      console.log("已連上雲端即時通知");
      retryMs = 5_000;
      // 重連時可能漏掉通知，先補抓一次
      requestSync();
      const decoder = new TextDecoder();
      let buffer = "";
      const reader = res.body.getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const message = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (message.includes("event: saved")) requestSync();
        }
      }
      console.warn("即時通知連線中斷，重新連線中");
    } catch (err) {
      console.warn(`即時通知連線失敗（${(err as Error).message}），${retryMs / 1000} 秒後重試`);
      await new Promise((r) => setTimeout(r, retryMs));
      retryMs = Math.min(retryMs * 2, 60_000);
    }
  }
}

console.log(`從 ${REMOTE_URL} 同步到 ${DATA_DIR}`);
if (process.argv.includes("--watch")) {
  subscribe();
  setInterval(requestSync, WATCH_INTERVAL_MS);
} else {
  syncOnce().catch((err) => {
    console.error("同步失敗：", err.message);
    process.exit(1);
  });
}
