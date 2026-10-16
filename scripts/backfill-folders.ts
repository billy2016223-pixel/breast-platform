// 替已上傳但沒有資料夾分類的紀錄補上「醫院 / 病人」。
// 用法：npm run backfill -- "D:\乳房攝影資料"
// 會掃描指定資料夾，依檔名比對；同一檔名出現在多個資料夾時不補，避免分錯。
import fs from "node:fs";
import path from "node:path";
import { listUnfiled, setFolder } from "../server/db.js";

const root = process.argv[2];
if (!root || !fs.existsSync(root)) {
  console.error('請指定影像所在的最外層資料夾，例如：npm run backfill -- "D:\乳房攝影資料"');
  process.exit(1);
}

// 檔名 -> 所有出現的相對路徑（以資料夾名稱開頭，與網頁上傳時的路徑格式一致）
const found = new Map<string, string[]>();
const walk = (dir: string) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const rel = path.join(path.basename(root), path.relative(root, full)).split(path.sep).join("/");
      found.set(entry.name, [...(found.get(entry.name) ?? []), rel]);
    }
  }
};
walk(path.resolve(root));

let filled = 0;
const missing: string[] = [];
const ambiguous: string[] = [];
for (const rec of listUnfiled()) {
  const paths = found.get(rec.fileName);
  if (!paths) missing.push(rec.fileName);
  else if (paths.length > 1) ambiguous.push(rec.fileName);
  else {
    setFolder(rec.id, paths[0]);
    filled++;
  }
}
console.log(`已補上分類 ${filled} 筆`);
if (missing.length) console.log(`資料夾裡找不到 ${missing.length} 筆：${missing.slice(0, 10).join("、")}`);
if (ambiguous.length) console.log(`檔名重複無法判斷 ${ambiguous.length} 筆：${ambiguous.slice(0, 10).join("、")}`);
