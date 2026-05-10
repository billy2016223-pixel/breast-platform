import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Calculator, AlertTriangle, Award, ImageIcon } from "lucide-react";

const features = [
  {
    icon: BookOpen,
    title: "評核標準查詢",
    description: "詳細的臨床觀察指標與優質標準",
    path: "/standards",
    color: "bg-blue-100 text-blue-600",
  },
  {
    icon: Calculator,
    title: "技術費試算工具",
    description: "根據指標自動計算加給比例",
    path: "/calculator",
    color: "bg-orange-100 text-orange-600",
  },
  {
    icon: AlertTriangle,
    title: "扣分原因資料庫",
    description: "常見缺失與改善建議",
    path: "/defects",
    color: "bg-amber-100 text-amber-600",
  },
  {
    icon: Award,
    title: "EPA 與里程碑等級",
    description: "職能發展路徑與能力要求",
    path: "/levels",
    color: "bg-purple-100 text-purple-600",
  },
  {
    icon: ImageIcon,
    title: "AI 影像判讀分析",
    description: "上傳影像進行 AI 自動品質評核",
    path: "/image-analysis",
    color: "bg-indigo-100 text-indigo-600",
  },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <nav className="bg-slate-950 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-emerald-400 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-sm">乳</span>
            </div>
            <h1 className="text-xl font-bold text-white">乳房攝影品質管理平台</h1>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-white mb-4">
            乳房攝影品質精進與績效管理平台
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            幫助醫事放射師了解影像品質標準、追蹤個人績效、獲得專業指導，持續精進乳房攝影技術
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.path}
                className="border-slate-700 bg-slate-800 hover:bg-slate-750 transition cursor-pointer"
                onClick={() => navigate(feature.path)}
              >
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${feature.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-white">{feature.title}</CardTitle>
                  <CardDescription className="text-slate-400">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-slate-300 text-sm">
                    <span>進入</span>
                    <span>→</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-slate-800 rounded-lg border border-slate-700 p-12 mb-16">
          <h3 className="text-2xl font-bold text-white mb-8 text-center">平台核心功能</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">5</div>
              <p className="text-slate-300">大評核項目</p>
              <p className="text-xs text-slate-500 mt-1">胸大肌、乳頭、組織等</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-emerald-400 mb-2">4</div>
              <p className="text-slate-300">等級評分</p>
              <p className="text-xs text-slate-500 mt-1">A/B/C/D 優等到不予通過</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-400 mb-2">100+</div>
              <p className="text-slate-300">缺失原因</p>
              <p className="text-xs text-slate-500 mt-1">定位、解剖、技術缺失</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-2">5</div>
              <p className="text-slate-300">職能等級</p>
              <p className="text-xs text-slate-500 mt-1">Lv1-5 從觀察到專家</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-700 bg-slate-950 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-slate-500 text-sm">
          <p>乳房攝影品質精進與績效管理平台 © 2026</p>
          <p className="mt-2">致力於提升乳房攝影影像品質與放射師專業發展</p>
        </div>
      </footer>
    </div>
  );
}
