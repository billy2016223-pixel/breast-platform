import Anthropic from "@anthropic-ai/sdk";

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

const SYSTEM_PROMPT = `你是乳房攝影影像品質評估系統。你只能回傳 JSON 物件，不能有任何其他文字、說明或 markdown 格式。`;

const PROMPT = `請分析這張乳房攝影影像，評估以下五個指標（各 0-100 分）：

1. 胸大肌顯影度 (Pectoralis Muscle)
2. 乳頭輪廓 (Nipple Contour)
3. 組織完整性 (Tissue Completeness)
4. 組織延展性 (Tissue Extension)
5. 輻射劑量 (Radiation Dose)

評等：A >= 90，B >= 80，C >= 70，D < 70（以五項平均計算）

只回傳以下 JSON，不要有任何其他文字：
{"pectoralisScore":數字,"nippleScore":數字,"tissueCompletenessScore":數字,"tissueElasticityScore":數字,"radiationDoseScore":數字,"grade":"A或B或C或D","defects":["缺陷1","缺陷2"],"analysis":"詳細中文分析"}`;

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
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY 未設定，請在 Render 環境變數中加入此 Key");
  }
  const start = Date.now();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const base64 = imageData.data.toString("base64");

  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: imageData.mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude 無文字回應");
  }

  const text = textBlock.text;
  console.log("Claude raw response:", text.slice(0, 500));

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      pectoralisScore: 50, nippleScore: 50, tissueCompletenessScore: 50,
      tissueElasticityScore: 50, radiationDoseScore: 50, grade: "C" as const,
      defects: ["AI 無法解析此影像，請確認影像格式是否為標準乳房攝影"],
      analysis: "AI 回應格式異常，無法完成分析。請重新上傳或嘗試其他影像。",
      analysisTime: Date.now() - start,
    };
  }

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
