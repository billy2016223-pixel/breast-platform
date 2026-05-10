import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFECT_REASONS } from "@shared/evaluationStandards";
import { AlertTriangle, Lightbulb } from "lucide-react";

export default function DefectDatabase() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">常見扣分原因與改善建議</h1>
          <p className="text-lg text-slate-600">詳細的缺陷分類與具體改善建議</p>
        </div>

        <Tabs defaultValue="positioning" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="positioning">定位缺失</TabsTrigger>
            <TabsTrigger value="anatomy">解剖缺失</TabsTrigger>
            <TabsTrigger value="technique">技術缺失</TabsTrigger>
          </TabsList>

          {Object.entries(DEFECT_REASONS).map(([key, category]) => (
            <TabsContent key={key} value={key}>
              <Card className="border-slate-200">
                <CardHeader className="bg-slate-50 border-b border-slate-200">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    {category.category}
                  </CardTitle>
                  <CardDescription>
                    {key === "positioning" && "與擺位相關的常見缺失"}
                    {key === "anatomy" && "與解剖構造呈現相關的缺失"}
                    {key === "technique" && "與操作技術相關的缺失"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {category.items.map((item) => (
                      <div key={item.code} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-2">{item.label}</h4>
                            <div className="flex items-start gap-2 text-slate-700">
                              <Lightbulb className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-slate-600 mb-1">改善建議：</p>
                                <p className="text-sm">{item.suggestion}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded h-fit">
                            {item.code}
                          </div>
                        </div>
                      </div>
                    ))}
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
