import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EVALUATION_CRITERIA, GRADE_STANDARDS } from "@shared/evaluationStandards";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function EvaluationStandards() {
  const criteria = Object.entries(EVALUATION_CRITERIA);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">乳房攝影品質評核標準</h1>
          <p className="text-lg text-slate-600">詳細的臨床觀察指標與優質標準</p>
        </div>

        <Card className="mb-8 border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-200">
            <CardTitle className="text-xl">評等標準對照表</CardTitle>
            <CardDescription>根據影像定位正確率、重拍率與技術費加給比例</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">等級</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">評定定義</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">定位正確率</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-900">重拍率</th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-900">技術費加給</th>
                  </tr>
                </thead>
                <tbody>
                  {GRADE_STANDARDS.map((s) => (
                    <tr key={s.grade} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className={`py-4 px-4 font-bold ${s.color}`}>{s.grade}</td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900">{s.label}</div>
                        <div className="text-xs text-slate-600 mt-1">{s.description}</div>
                      </td>
                      <td className="py-4 px-4 text-slate-700">{s.positioningAccuracy}</td>
                      <td className="py-4 px-4 text-slate-700">{s.repeatRate}</td>
                      <td className="py-4 px-4 text-center font-bold text-lg text-emerald-600">{s.techniqueFeePercentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-2xl font-bold text-slate-900 mb-6">五大評核項目詳細說明</h2>
        <Tabs defaultValue={criteria[0][0]} className="w-full">
          <TabsList className="grid w-full mb-6" style={{ gridTemplateColumns: `repeat(${criteria.length}, 1fr)` }}>
            {criteria.map(([key, c]) => (
              <TabsTrigger key={key} value={key}>{c.name}</TabsTrigger>
            ))}
          </TabsList>

          {criteria.map(([key, c]) => (
            <TabsContent key={key} value={key}>
              <Card className="border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-200">
                  <CardTitle>{c.name}</CardTitle>
                  <CardDescription>{c.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      臨床觀察指標
                    </h4>
                    {Array.isArray(c.clinicalIndicators) ? (
                      <ul className="space-y-2">
                        {c.clinicalIndicators.map((item, i) => (
                          <li key={i} className="flex gap-3 text-slate-700">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(c.clinicalIndicators).map(([subKey, items]) => (
                          <div key={subKey}>
                            <h5 className="font-semibold text-slate-800 mb-2">
                              {subKey === "mloView" ? "MLO View" : subKey === "ccView" ? "CC View" : subKey}
                            </h5>
                            <ul className="space-y-2 ml-4">
                              {(items as string[]).map((item, i) => (
                                <li key={i} className="flex gap-3 text-slate-700">
                                  <span className="text-blue-600 font-bold">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      優質標準
                    </h4>
                    <p className="text-emerald-800">{c.qualityStandard}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
