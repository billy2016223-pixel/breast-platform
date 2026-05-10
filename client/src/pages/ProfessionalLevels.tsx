import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EPA_LEVELS, MILESTONE_LEVELS } from "@shared/evaluationStandards";
import { Award, Target } from "lucide-react";

export default function ProfessionalLevels() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">EPA 信賴等級與里程碑專業分級</h1>
          <p className="text-lg text-slate-600">了解放射師的職能發展路徑與能力要求</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Award className="w-5 h-5" /> EPA 信賴等級
              </CardTitle>
            </CardHeader>
            <CardContent className="text-blue-800">
              評定放射師在臨床現場執行乳房攝影任務的<span className="font-semibold">獨立性與監督程度</span>。
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <Target className="w-5 h-5" /> 里程碑專業分級
              </CardTitle>
            </CardHeader>
            <CardContent className="text-emerald-800">
              評定放射師的<span className="font-semibold">專業知識、技術成熟度與臨床應變能力</span>。
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="epa" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="epa">EPA 信賴等級 (Lv1-5)</TabsTrigger>
            <TabsTrigger value="milestone">里程碑專業分級 (Lv1-5)</TabsTrigger>
          </TabsList>

          <TabsContent value="epa">
            <div className="space-y-4">
              {EPA_LEVELS.map((level) => (
                <Card key={level.level} className="border-slate-200">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-blue-900">{level.level} - {level.title}</CardTitle>
                        <CardDescription className="text-blue-700">{level.description}</CardDescription>
                      </div>
                      <div className="text-3xl font-bold text-blue-600 opacity-20">{level.level}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">核心能力：</h4>
                    <ul className="space-y-2">
                      {level.capabilities.map((c, i) => (
                        <li key={i} className="flex gap-3 text-slate-700">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="milestone">
            <div className="space-y-4">
              {MILESTONE_LEVELS.map((level) => (
                <Card key={level.level} className="border-slate-200">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-emerald-900">{level.level} - {level.title}</CardTitle>
                        <CardDescription className="text-emerald-700">{level.description}</CardDescription>
                      </div>
                      <div className="text-3xl font-bold text-emerald-600 opacity-20">{level.level}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <h4 className="font-semibold text-slate-900 mb-3">知識與技能：</h4>
                    <ul className="space-y-2">
                      {level.knowledge.map((k, i) => (
                        <li key={i} className="flex gap-3 text-slate-700">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
