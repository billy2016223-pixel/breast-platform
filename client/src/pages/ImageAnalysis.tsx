import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AnalysisResultView, { gradeColor, type AnalysisScores } from "@/components/AnalysisResultView";
import { trpc } from "@/lib/trpc";
import { Upload, Loader2, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import { toast } from "sonner";

// 同時送出的分析請求數，避免一次打太多觸發 API 速率限制
const CONCURRENCY = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ItemStatus = "pending" | "running" | "done" | "error";

type QueueItem = {
  key: string;
  file: File;
  previewUrl: string;
  status: ItemStatus;
  error?: string;
  result?: AnalysisScores & { analysisTime: number; parseFailed?: boolean };
};

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const StatusIcon = ({ status }: { status: ItemStatus }) => {
  if (status === "running") return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
  if (status === "done") return <CheckCircle2 className="w-4 h-4 text-green-600" />;
  if (status === "error") return <AlertCircle className="w-4 h-4 text-red-600" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
};

export default function ImageAnalysis() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const analyzeMutation = trpc.imageAnalysis.analyze.useMutation();

  const update = (key: string, patch: Partial<QueueItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const accepted: QueueItem[] = [];
    let skipped = 0;
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/") || file.size > MAX_FILE_BYTES) {
        skipped++;
        continue;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "pending",
      });
    }
    if (skipped > 0) toast.error(`有 ${skipped} 個檔案不是影像或超過 5MB，已略過`);
    setItems((prev) => [...prev, ...accepted]);
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((it) => it.key !== key);
    });
    if (selectedKey === key) setSelectedKey(null);
  };

  const clearAll = () => {
    items.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setSelectedKey(null);
  };

  const handleAnalyzeAll = async () => {
    const queue = items.filter((it) => it.status === "pending" || it.status === "error");
    if (queue.length === 0) {
      toast.error("沒有待分析的影像");
      return;
    }
    setRunning(true);
    const batchId = `${new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "")}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    let cursor = 0;
    let okCount = 0;
    const worker = async () => {
      while (cursor < queue.length) {
        const item = queue[cursor++];
        update(item.key, { status: "running", error: undefined });
        try {
          const fileBase64 = await readAsBase64(item.file);
          const result = await analyzeMutation.mutateAsync({
            fileBase64,
            mimeType: item.file.type || "image/jpeg",
            fileName: item.file.name,
            batchId,
          });
          update(item.key, { status: "done", result });
          okCount++;
        } catch (err) {
          update(item.key, {
            status: "error",
            error: err instanceof Error ? err.message : "分析失敗",
          });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    setRunning(false);
    toast.success(`批次分析完成，成功 ${okCount} / ${queue.length} 張`);
  };

  const doneCount = items.filter((it) => it.status === "done").length;
  const errorCount = items.filter((it) => it.status === "error").length;
  const selected = items.find((it) => it.key === selectedKey) ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI 影像判讀分析</h1>
          <p className="text-lg text-slate-600">
            可一次選取多張乳房攝影影像，系統逐張進行 AI 品質評核並保存結果
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>上傳影像</CardTitle>
              <CardDescription>支援 JPG、PNG，可多選或拖曳整批檔案，每張最大 5MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="file-input"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                className={`block border-2 border-dashed rounded-lg p-8 text-center transition cursor-pointer ${
                  dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 hover:border-blue-400"
                }`}
              >
                <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold mb-1">點擊選擇或拖曳多張影像</p>
                <p className="text-sm text-slate-400">JPG / PNG，每張最大 5MB</p>
              </label>
              <input
                ref={inputRef}
                id="file-input"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              />

              {items.length > 0 && (
                <>
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>
                      共 {items.length} 張，完成 {doneCount}，失敗 {errorCount}
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearAll} disabled={running}>
                      清空列表
                    </Button>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${((doneCount + errorCount) / items.length) * 100}%` }}
                    />
                  </div>
                  <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-lg">
                    {items.map((it) => (
                      <li
                        key={it.key}
                        onClick={() => setSelectedKey(it.key)}
                        className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-slate-50 ${
                          selectedKey === it.key ? "bg-blue-50" : ""
                        }`}
                      >
                        <img src={it.previewUrl} alt="" className="w-12 h-12 object-cover rounded border border-slate-200" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 truncate">{it.file.name}</p>
                          <p className="text-xs text-slate-500 truncate">
                            {it.status === "error" ? it.error : `${(it.file.size / 1024 / 1024).toFixed(2)} MB`}
                          </p>
                        </div>
                        {it.result?.grade && (
                          <span className={`px-2 py-0.5 rounded text-sm font-bold ${gradeColor(it.result.grade)}`}>
                            {it.result.grade}
                          </span>
                        )}
                        <StatusIcon status={it.status} />
                        {!running && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeItem(it.key);
                            }}
                            className="text-slate-400 hover:text-slate-700"
                            aria-label="移除"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <Button
                onClick={handleAnalyzeAll}
                disabled={running || items.every((it) => it.status === "done")}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 分析中（{doneCount + errorCount} / {items.length}）
                  </>
                ) : errorCount > 0 ? (
                  "分析未完成與失敗的影像"
                ) : (
                  "開始 AI 分析"
                )}
              </Button>
            </CardContent>
          </Card>

          {selected && (
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="truncate">{selected.file.name}</CardTitle>
                <CardDescription>
                  {selected.result
                    ? `分析耗時：${(selected.result.analysisTime / 1000).toFixed(2)} 秒`
                    : selected.status === "error"
                      ? selected.error
                      : "尚未分析"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <img
                  src={selected.previewUrl}
                  alt={selected.file.name}
                  className="w-full max-h-80 object-contain rounded-lg border border-slate-200 bg-black"
                />
                {selected.result?.parseFailed && (
                  <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                    AI 回應格式異常，以下分數為預設值，不代表實際評估結果。
                  </p>
                )}
                {selected.result && <AnalysisResultView result={selected.result} />}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
