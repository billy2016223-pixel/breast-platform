import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { Upload, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type AnalysisResult = {
  pectoralisScore: number;
  nippleScore: number;
  tissueCompletenessScore: number;
  tissueElasticityScore: number;
  radiationDoseScore: number;
  grade: "A" | "B" | "C" | "D";
  defects: string[];
  analysis: string;
  analysisTime: number;
};

const gradeColor = (grade: string) => {
  if (grade === "A") return "text-green-600 bg-green-50";
  if (grade === "B") return "text-blue-600 bg-blue-50";
  if (grade === "C") return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};

const gradeLabel = (grade: string) => {
  if (grade === "A") return "優等 (Excellent)";
  if (grade === "B") return "符合 (Good)";
  if (grade === "C") return "不予通過 (Fair)";
  return "不予通過 (Poor)";
};

const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{score}/100</span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${score}%` }} />
    </div>
  </div>
);

export default function ImageAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeMutation = trpc.imageAnalysis.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success("AI 分析完成！");
    },
    onError: (err) => {
      toast.error(err.message || "分析失敗，請稍後再試");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("檔案大小不能超過 10MB");
      return;
    }

    setSelectedFile(file);
    setResult(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile) {
      toast.error("請先選擇影像檔案");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const arrayBuffer = ev.target?.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      if (base64.length > 7 * 1024 * 1024) {
        toast.error("檔案過大，請使用 5MB 以下的影像");
        return;
      }

      analyzeMutation.mutate({
        fileBase64: base64,
        mimeType: selectedFile.type || "image/jpeg",
      });
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">AI 影像判讀分析</h1>
          <p className="text-lg text-slate-600">
            上傳乳房攝影影像，系統將自動進行 AI 品質評核
          </p>
        </div>

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-1 mb-6 max-w-xs">
            <TabsTrigger value="upload">上傳與分析</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 上傳區 */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle>上傳影像</CardTitle>
                  <CardDescription>支援 JPG、PNG 格式，最大 10MB</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <label
                      htmlFor="file-input"
                      className="block border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition cursor-pointer"
                    >
                      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-semibold mb-1">點擊選擇影像</p>
                      <p className="text-sm text-slate-400">JPG / PNG，最大 10MB</p>
                    </label>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileSelect}
                    />

                    {previewUrl && (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 mb-2">預覽</p>
                        <img src={previewUrl} alt="preview" className="w-full h-64 object-cover rounded-lg border border-slate-200" />
                        <p className="text-xs text-slate-500 mt-1">
                          {selectedFile?.name} — {((selectedFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleAnalyze}
                      disabled={!selectedFile || analyzeMutation.isPending}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          AI 分析中...
                        </>
                      ) : (
                        "開始 AI 分析"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 結果區 */}
              {result && (
                <Card className="border-slate-200">
                  <CardHeader className={gradeColor(result.grade)}>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      AI 判讀結果
                    </CardTitle>
                    <CardDescription>
                      分析耗時：{(result.analysisTime / 1000).toFixed(2)} 秒
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${gradeColor(result.grade)}`}>
                        {result.grade}
                      </div>
                      <p className="text-sm text-slate-600 mt-2">{gradeLabel(result.grade)}</p>
                    </div>

                    <div className="space-y-3">
                      <ScoreBar label="胸大肌顯影度" score={result.pectoralisScore} color="text-blue-600" />
                      <ScoreBar label="乳頭輪廓" score={result.nippleScore} color="text-emerald-600" />
                      <ScoreBar label="組織完整性" score={result.tissueCompletenessScore} color="text-purple-600" />
                      <ScoreBar label="組織延展性" score={result.tissueElasticityScore} color="text-orange-600" />
                      <ScoreBar label="輻射劑量" score={result.radiationDoseScore} color="text-pink-600" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-slate-900 mb-2">分析說明</p>
                      <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded">{result.analysis}</p>
                    </div>

                    {result.defects.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          發現的缺陷
                        </p>
                        <ul className="space-y-1">
                          {result.defects.map((d, i) => (
                            <li key={i} className="text-sm text-slate-700 flex items-start gap-2">
                              <span className="text-amber-600 mt-1">•</span>
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
