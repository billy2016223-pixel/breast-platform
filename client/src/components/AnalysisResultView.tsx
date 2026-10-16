import { AlertCircle } from "lucide-react";

export type AnalysisScores = {
  pectoralisScore: number | null;
  nippleScore: number | null;
  tissueCompletenessScore: number | null;
  tissueElasticityScore: number | null;
  radiationDoseScore: number | null;
  grade: "A" | "B" | "C" | "D" | null;
  defects: string[];
  analysis: string | null;
};

export const gradeColor = (grade: string | null) => {
  if (grade === "A") return "text-green-600 bg-green-50";
  if (grade === "B") return "text-blue-600 bg-blue-50";
  if (grade === "C") return "text-yellow-600 bg-yellow-50";
  if (grade === "D") return "text-red-600 bg-red-50";
  return "text-slate-500 bg-slate-100";
};

export const gradeLabel = (grade: string | null) => {
  if (grade === "A") return "優等 (Excellent)";
  if (grade === "B") return "符合 (Good)";
  if (grade === "C") return "不予通過 (Fair)";
  if (grade === "D") return "不予通過 (Poor)";
  return "無評等";
};

const ScoreBar = ({ label, score, color }: { label: string; score: number | null; color: string }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-sm font-semibold text-slate-900">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{score ?? "-"}/100</span>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${score ?? 0}%` }} />
    </div>
  </div>
);

export default function AnalysisResultView({ result }: { result: AnalysisScores }) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className={`inline-block px-6 py-2 rounded-lg text-6xl font-bold ${gradeColor(result.grade)}`}>
          {result.grade ?? "-"}
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

      {result.analysis && (
        <div>
          <p className="text-sm font-semibold text-slate-900 mb-2">分析說明</p>
          <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded whitespace-pre-wrap">{result.analysis}</p>
        </div>
      )}

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
    </div>
  );
}
