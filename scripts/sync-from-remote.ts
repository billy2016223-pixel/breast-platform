// 把雲端（Render）上的分析紀錄與原圖拉回本機 data/ 保存。
// 用法：npm run sync          同步一次
//       npm run sync -- --watch  每 5 分鐘同步一次，持續執行
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

console.log(`從 ${REMOTE_URL} 同步到 ${DATA_DIR}`);
if (process.argv.includes("--watch")) {
  const run = () => syncOnce().catch((err) => console.error("同步失敗：", err.message));
  run();
  setInterval(run, WATCH_INTERVAL_MS);
} else {
  syncOnce().catch((err) => {
    console.error("同步失敗：", err.message);
    process.exit(1);
  });
}
