import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { GRADE_STANDARDS } from "@shared/evaluationStandards";
import { trpc } from "@/lib/trpc";
import { AlertCircle, TrendingUp } from "lucide-react";

export default function TechniqueFeeCalculator() {
  const [positioningAccuracy, setPositioningAccuracy] = useState(90);
  const [repeatRate, setRepeatRate] = useState(2);

  const { data: result } = trpc.calculator.calculate.useQuery({
    positioningAccuracy,
    repeatRate,
  });

  const gradeInfo = GRADE_STANDARDS.find((g) => g.grade === result?.grade);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">技術費加給試算工具</h1>
          <p className="text-lg text-slate-600">
            根據影像定位正確率與重拍率，自動計算建議技術費加給比例
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-slate-200">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <CardTitle>評核指標輸入</CardTitle>
              <CardDescription>調整滑桿以模擬不同的績效指標</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="font-semibold text-slate-900">影像定位正確率</label>
                  <span className="text-2xl font-bold text-blue-600">{positioningAccuracy}%</span>
                </div>
                <Slider
                  value={[positioningAccuracy]}
                  onValueChange={(v) => setPositioningAccuracy(v[0])}
                  min={0} max={100} step={1}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0%</span><span>100%</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="font-semibold text-slate-900">重拍率</label>
                  <span className="text-2xl font-bold text-orange-600">{repeatRate.toFixed(1)}%</span>
                </div>
                <Slider
                  value={[repeatRate]}
                  onValueChange={(v) => setRepeatRate(v[0])}
                  min={0} max={10} step={0.1}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>0%</span><span>10%</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  評等參考標準
                </h4>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><span className="font-semibold">A 級（優等）：</span> 定位 &gt; 95% 且重拍 &lt; 2%</p>
                  <p><span className="font-semibold">B 級（符合）：</span> 定位 85-95% 且重拍 2-3%</p>
                  <p><span className="font-semibold">C 級（不予通過）：</span> 定位 80-85% 且重拍 3-5%</p>
                  <p><span className="font-semibold">D 級（不予通過）：</span> 定位 &lt; 80% 或重拍 &gt; 5%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {result && gradeInfo && (
              <>
                <Card className={`border-2`}>
                  <CardHeader className={gradeInfo.color}>
                    <CardTitle className="text-2xl">{gradeInfo.label}</CardTitle>
                    <CardDescription className={gradeInfo.color}>{gradeInfo.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
                      <span className="font-semibold text-slate-900">評等等級</span>
                      <span className="text-3xl font-bold">{result.grade}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-slate-200">
                  <CardHeader className="bg-emerald-50 border-b border-emerald-200">
                    <CardTitle className="flex items-center gap-2 text-emerald-900">
                      <TrendingUp className="w-5 h-5" />
                      技術費加給試算
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="text-sm text-slate-600 mb-1">基礎給付額</div>
                        <div className="text-2xl font-bold text-slate-900">1,245 點</div>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="text-sm text-emerald-700 font-semibold mb-1">加給比例</div>
                        <div className="text-3xl font-bold text-emerald-600">{result.techniqueFeePercentage}%</div>
                      </div>
                    </div>
                    <div className="border-t border-slate-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-slate-900">技術費加給額</span>
                        <span className="text-3xl font-bold text-emerald-600">{result.techniqueFeeAmount} 點</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-2">
                        總給付額：{result.baseAmount + result.techniqueFeeAmount} 點
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
