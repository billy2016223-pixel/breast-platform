import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AnalysisResultView, { gradeColor } from "@/components/AnalysisResultView";
import { trpc, getAdminToken, setAdminToken } from "@/lib/trpc";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 50;
// 與伺服器 db.ts 的 NO_FOLDER 一致，代表沒有資料夾資訊的紀錄
const NO_FOLDER = "__none__";
const folderLabel = (name: string | null) => name ?? "未分類";
const GRADES = ["A", "B", "C", "D"] as const;

const STATUS_LABEL: Record<string, string> = {
  ok: "完成",
  parse_failed: "回應異常",
  error: "失敗",
};

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const login = trpc.admin.login.useMutation({
    onSuccess: (res) => {
      if (res.ok) onLogin(password);
      else toast.error("密碼錯誤");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-sm border-slate-200">
        <CardHeader>
          <CardTitle>後台登入</CardTitle>
          <CardDescription>請輸入管理者密碼</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate({ password });
            }}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={login.isPending || !password}>
              登入
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(getAdminToken());
  const [batchId, setBatchId] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [hospital, setHospital] = useState<string>("");
  const [patient, setPatient] = useState<string>("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = trpc.admin.list.useQuery(
    {
      batchId: batchId || undefined,
      grade: (grade || undefined) as (typeof GRADES)[number] | undefined,
      hospital: hospital || undefined,
      patient: patient || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { enabled: !!token, retry: false }
  );
  const batchesQuery = trpc.admin.batches.useQuery(undefined, { enabled: !!token, retry: false });
  const foldersQuery = trpc.admin.folders.useQuery(undefined, { enabled: !!token, retry: false });

  const logout = () => {
    setAdminToken(null);
    setToken(null);
  };

  if (!token || listQuery.error?.data?.code === "UNAUTHORIZED") {
    return (
      <LoginForm
        onLogin={(t) => {
          setAdminToken(t);
          setToken(t);
          listQuery.refetch();
          batchesQuery.refetch();
          foldersQuery.refetch();
        }}
      />
    );
  }

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = items.find((it) => it.id === selectedId) ?? null;
  // 依醫院整理左側目錄
  const tree = new Map<string, { hospital: string | null; count: number; patients: typeof folders }>();
  const folders = foldersQuery.data ?? [];
  for (const f of folders) {
    const key = f.hospital ?? NO_FOLDER;
    const node = tree.get(key) ?? { hospital: f.hospital, count: 0, patients: [] };
    node.count += f.count;
    node.patients.push(f);
    tree.set(key, node);
  }
  const selectFolder = (h: string, p: string) => {
    setHospital(h);
    setPatient(p);
    setPage(0);
    setSelectedId(null);
  };

  const imageUrl = (id: string) => `/api/images/${id}?token=${encodeURIComponent(token)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">分析紀錄後台</h1>
            <p className="text-slate-600">每張上傳影像的 AI 評等與回饋，共 {total} 筆</p>
          </div>
          <Button variant="outline" onClick={logout}>
            登出
          </Button>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <select
            value={batchId}
            onChange={(e) => {
              setBatchId(e.target.value);
              setPage(0);
            }}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">全部批次</option>
            {batchesQuery.data?.map((b) => (
              <option key={b.batchId} value={b.batchId}>
                {new Date(b.startedAt).toLocaleString("zh-TW")}（{b.okCount}/{b.count} 張）
              </option>
            ))}
          </select>
          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value);
              setPage(0);
            }}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">全部評等</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {g} 級
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card className="border-slate-200 lg:col-span-3 p-3 h-fit">
            <p className="text-sm font-semibold text-slate-900 mb-2 px-2">醫院 / 病人</p>
            <button
              type="button"
              onClick={() => selectFolder("", "")}
              className={`w-full text-left text-sm px-2 py-1 rounded ${
                !hospital && !patient ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50"
              }`}
            >
              全部（{folders.reduce((n, f) => n + f.count, 0)}）
            </button>
            {Array.from(tree.entries()).map(([key, node]) => (
              <div key={key} className="mt-1">
                <button
                  type="button"
                  onClick={() => selectFolder(key, "")}
                  className={`w-full text-left text-sm font-semibold px-2 py-1 rounded truncate ${
                    hospital === key && !patient ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  {folderLabel(node.hospital)}（{node.count}）
                </button>
                {node.patients.map((p) => {
                  const pKey = p.patient ?? NO_FOLDER;
                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => selectFolder(key, pKey)}
                      className={`w-full text-left text-sm pl-6 pr-2 py-1 rounded truncate ${
                        hospital === key && patient === pKey
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {folderLabel(p.patient)}（{p.count}）
                    </button>
                  );
                })}
              </div>
            ))}
          </Card>

          <Card className="border-slate-200 lg:col-span-5 overflow-hidden">
            {listQuery.isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-slate-500">目前沒有紀錄</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-2 text-left font-semibold">影像</th>
                      <th className="p-2 text-left font-semibold">醫院 / 病人 / 檔名</th>
                      <th className="p-2 text-center font-semibold">評等</th>
                      <th className="p-2 text-center font-semibold">狀態</th>
                      <th className="p-2 text-left font-semibold">時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((it) => (
                      <tr
                        key={it.id}
                        onClick={() => setSelectedId(it.id)}
                        className={`cursor-pointer hover:bg-slate-50 ${selectedId === it.id ? "bg-blue-50" : ""}`}
                      >
                        <td className="p-2">
                          <img
                            src={imageUrl(it.id)}
                            alt=""
                            loading="lazy"
                            className="w-12 h-12 object-cover rounded border border-slate-200"
                          />
                        </td>
                        <td className="p-2 max-w-48">
                          <p className="text-xs text-slate-500 truncate">
                            {folderLabel(it.hospital)} / {folderLabel(it.patient)}
                          </p>
                          <p className="truncate text-slate-900">{it.fileName}</p>
                        </td>
                        <td className="p-2 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold ${gradeColor(it.grade)}`}>
                            {it.grade ?? "-"}
                          </span>
                        </td>
                        <td className="p-2 text-center text-slate-600">{STATUS_LABEL[it.status]}</td>
                        <td className="p-2 text-slate-500 whitespace-nowrap">
                          {new Date(it.createdAt).toLocaleString("zh-TW")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between p-3 border-t border-slate-100 text-sm text-slate-600">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                上一頁
              </Button>
              <span>
                第 {page + 1} / {pageCount} 頁
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage(page + 1)}
              >
                下一頁
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-4">
            {selected ? (
              <Card className="border-slate-200 lg:sticky lg:top-6">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{selected.fileName}</CardTitle>
                    <button
                      type="button"
                      onClick={() => setSelectedId(null)}
                      className="text-slate-400 hover:text-slate-700"
                      aria-label="關閉"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <CardDescription>
                    {folderLabel(selected.hospital)} / {folderLabel(selected.patient)}，
                    {new Date(selected.createdAt).toLocaleString("zh-TW")}
                    {selected.analysisTime != null && `，耗時 ${(selected.analysisTime / 1000).toFixed(2)} 秒`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <a href={imageUrl(selected.id)} target="_blank" rel="noreferrer">
                    <img
                      src={imageUrl(selected.id)}
                      alt={selected.fileName}
                      className="w-full max-h-80 object-contain rounded-lg border border-slate-200 bg-black"
                    />
                  </a>
                  {selected.status === "error" ? (
                    <p className="text-sm text-red-700 bg-red-50 p-3 rounded">分析失敗：{selected.error}</p>
                  ) : (
                    <>
                      {selected.status === "parse_failed" && (
                        <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded">
                          AI 回應格式異常，分數為預設值，不代表實際評估結果。
                        </p>
                      )}
                      <AnalysisResultView result={selected} />
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-slate-500 p-4">點選左側任一筆紀錄以查看完整回饋</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
