import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GOOGLE_GEMINI_API_KEY environment variable is not set");
}

const genAI = new GoogleGenerativeAI(apiKey);

export interface AnalysisResult {
  pectoralisScore: number;
  nippleScore: number;
  tissueCompletenessScore: number;
  tissueElasticityScore: number;
  radiationDoseScore: number;
  grade: "A" | "B" | "C" | "D";
  defects: string[];
  analysis: string;
  analysisTime: number;
}

const PROMPT = `您是一位資深的乳房攝影影像分析專家。請分析這張乳房攝影影像，並評估以下五個指標，每個指標評分 0-100 分：

1. 胸大肌顯影度 (Pectoralis Muscle): 評估胸大肌在影像中的顯示程度和清晰度
2. 乳頭輪廓 (Nipple Contour): 評估乳頭位置和輪廓清晰度
3. 組織完整性 (Tissue Completeness): 評估乳房組織完整性和邊界清晰度
4. 組織延展性 (Tissue Extension): 評估乳房組織延展性和均勻分佈
5. 輻射劑量 (Radiation Dose): 評估曝露參數的適當性（高分表示劑量適當）

評等標準：
- A (優等): 所有指標平均 >= 90
- B (符合): 所有指標平均 >= 80
- C (不予通過): 所有指標平均 >= 70
- D (不予通過): 所有指標平均 < 70

請以 JSON 格式回應：
{"pectoralisScore": <0-100>, "nippleScore": <0-100>, "tissueCompletenessScore": <0-100>, "tissueElasticityScore": <0-100>, "radiationDoseScore": <0-100>, "grade": "<A/B/C/D>", "defects": [<缺陷列表，空陣列若無缺陷>], "analysis": "<詳細中文分析說明>"}`;

function validateGrade(g: unknown): "A" | "B" | "C" | "D" {
  if (g === "A" || g === "B" || g === "C" || g === "D") return g;
  return "C";
}

function validateScore(s: unknown): number {
  if (typeof s === "number" && s >= 0 && s <= 100) return Math.round(s);
  return 50;
}

export async function analyzeBreastImage(imageData: {
  data: Buffer;
  mimeType: string;
}): Promise<AnalysisResult> {
  const start = Date.now();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const base64 = imageData.data.toString("base64");

  const response = await model.generateContent([
    { text: PROMPT },
    { inlineData: { mimeType: imageData.mimeType, data: base64 } },
  ]);

  const text = response.response.text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Gemini 回應格式錯誤");

  const d = JSON.parse(match[0]);

  return {
    pectoralisScore: validateScore(d.pectoralisScore),
    nippleScore: validateScore(d.nippleScore),
    tissueCompletenessScore: validateScore(d.tissueCompletenessScore),
    tissueElasticityScore: validateScore(d.tissueElasticityScore),
    radiationDoseScore: validateScore(d.radiationDoseScore),
    grade: validateGrade(d.grade),
    defects: Array.isArray(d.defects) ? d.defects : [],
    analysis: typeof d.analysis === "string" ? d.analysis : "",
    analysisTime: Date.now() - start,
  };
}
