export const GRADE_STANDARDS = [
  {
    grade: "A",
    label: "優等 (Excellent)",
    description: "影像品質優良，可獲得技術費加給",
    positioningAccuracy: "> 95%",
    repeatRate: "< 2%",
    techniqueFeePercentage: 15,
    color: "text-green-700 bg-green-50",
  },
  {
    grade: "B",
    label: "符合 (Good)",
    description: "影像品質良好，可獲得技術費加給",
    positioningAccuracy: "85% - 95%",
    repeatRate: "2% - 3%",
    techniqueFeePercentage: 10,
    color: "text-blue-700 bg-blue-50",
  },
  {
    grade: "C",
    label: "不予通過 (Fair)",
    description: "影像品質尚可，無技術費加給",
    positioningAccuracy: "80% - 85%",
    repeatRate: "3% - 5%",
    techniqueFeePercentage: 0,
    color: "text-yellow-700 bg-yellow-50",
  },
  {
    grade: "D",
    label: "不予通過 (Poor)",
    description: "影像品質不足，需立即改善",
    positioningAccuracy: "< 80%",
    repeatRate: "> 5%",
    techniqueFeePercentage: 0,
    color: "text-red-700 bg-red-50",
  },
];

export const EVALUATION_CRITERIA = {
  pectoralisMajor: {
    name: "胸大肌顯影度",
    description: "評估胸大肌在乳房攝影影像中的呈現程度",
    clinicalIndicators: {
      mloView: [
        "MLO 位：胸大肌應達乳頭水平線或以下",
        "胸大肌邊緣清晰，肌肉纖維紋理可見",
        "胸大肌寬度至少 1 公分（在乳頭水平線位置量測）",
      ],
      ccView: [
        "CC 位：胸大肌出現在影像後緣（約 30% 的 CC 位影像可見）",
        "若可見，邊緣需清晰呈現",
      ],
    },
    qualityStandard:
      "MLO 位胸大肌達乳頭水平線以下，邊緣清晰，肌肉紋理可辨，CC 位可見胸大肌後緣。",
  },
  nippleProfile: {
    name: "乳頭輪廓",
    description: "評估乳頭在影像中的位置與輪廓清晰度",
    clinicalIndicators: [
      "乳頭呈切線位（In Profile），可清晰識別輪廓",
      "乳頭位於影像中央或略偏下方",
      "CC 位與 MLO 位的乳頭至胸壁距離（PNL）差異應在 1 公分以內",
    ],
    qualityStandard:
      "乳頭呈切線位，位置正確，CC 位與 MLO 位的乳頭距胸壁長度差異小於 1 公分。",
  },
  tissueIntegrity: {
    name: "組織完整性",
    description: "評估乳房組織的完整性與邊界清晰度",
    clinicalIndicators: [
      "所有乳房組織完整包含在影像範圍內",
      "無組織折疊（Skin Folds）或重疊偽影",
      "乳房邊界清晰，無切除現象",
      "乳腺後脂肪空間（RPFS）清晰可見",
    ],
    qualityStandard:
      "所有乳房組織完整呈現，無組織折疊，乳腺後脂肪空間清晰可見，無切除現象。",
  },
  tissueElasticity: {
    name: "組織延展性",
    description: "評估乳房組織的延展性與壓迫均勻度",
    clinicalIndicators: [
      "壓迫力均勻，組織延展充分",
      "無局部過度壓迫或壓迫不足",
      "整體組織分佈均勻",
      "壓迫厚度適當（通常 4-8 公分）",
    ],
    qualityStandard:
      "乳房組織均勻延展，壓迫充分且均勻，組織分佈良好，整體壓迫厚度適當。",
  },
  exposureAndDose: {
    name: "曝露參數與輻射劑量",
    description: "評估曝露技術參數設定的適當性",
    clinicalIndicators: [
      "平均乳腺劑量（AGD）符合標準（< 2.0 mGy）",
      "影像對比度適當，腺體組織與脂肪組織可清晰區分",
      "無過曝或曝露不足的情況",
      "雜訊水平在可接受範圍內",
    ],
    qualityStandard:
      "AGD < 2.0 mGy，影像對比度優良，腺體與脂肪組織界面清晰，無過曝或欠曝。",
  },
};

export const DEFECT_REASONS = {
  positioning: {
    category: "定位缺失 (Positioning Defects)",
    items: [
      {
        code: "P01",
        label: "胸大肌顯影不足",
        suggestion:
          "確認患者背部貼緊機器，肩膀放鬆，調整 MLO 角度使胸大肌充分進入影像範圍。",
      },
      {
        code: "P02",
        label: "乳頭未呈切線位",
        suggestion:
          "重新擺位使乳頭正確呈現切線位，必要時使用標記物協助定位。",
      },
      {
        code: "P03",
        label: "乳房下摺襞未展開",
        suggestion:
          "協助患者抬起乳房，確認乳房下摺完全展開後再進行壓迫。",
      },
      {
        code: "P04",
        label: "CC 與 MLO 的 PNL 差異過大",
        suggestion:
          "確認兩個投影的乳頭距胸壁長度差異在 1 公分以內，若差異過大需重新擺位。",
      },
      {
        code: "P05",
        label: "乳房組織未完全包含",
        suggestion:
          "調整患者位置，確認所有乳房組織均在影像範圍內，特別注意外側與後側組織。",
      },
      {
        code: "P06",
        label: "患者旋轉或傾斜",
        suggestion:
          "確認患者站姿正確，腳與身體對齊，使用腳踏板協助固定位置。",
      },
    ],
  },
  anatomy: {
    category: "解剖缺失 (Anatomical Defects)",
    items: [
      {
        code: "A01",
        label: "皮膚折疊偽影",
        suggestion:
          "壓迫前仔細拉平皮膚，特別注意乳房下方與側面，使用手指平滑皮膚表面。",
      },
      {
        code: "A02",
        label: "乳腺後脂肪空間不可見",
        suggestion:
          "確認患者充分向前傾，乳房完全放置在平板上，調整位置使後側乳腺組織展開。",
      },
      {
        code: "A03",
        label: "腋窩組織未包含",
        suggestion:
          "MLO 位時確認腋窩組織進入影像範圍，必要時加照腋窩加壓位（AXILLA）。",
      },
      {
        code: "A04",
        label: "組織重疊",
        suggestion:
          "增加壓迫力度使組織分離，必要時使用局部加壓或點壓技術。",
      },
      {
        code: "A05",
        label: "乳頭切除",
        suggestion:
          "確認乳頭在影像範圍內，若標準位無法包含可加照乳頭切線位補充影像。",
      },
    ],
  },
  technique: {
    category: "技術缺失 (Technical Defects)",
    items: [
      {
        code: "T01",
        label: "影像模糊（患者移動）",
        suggestion:
          "加強患者溝通，確認患者在曝露期間完全靜止，必要時重新曝露。",
      },
      {
        code: "T02",
        label: "過度曝露（影像過白）",
        suggestion:
          "檢查 AEC 設定，確認曝露參數在標準範圍內，必要時手動調整 mAs。",
      },
      {
        code: "T03",
        label: "曝露不足（影像過暗）",
        suggestion:
          "檢查 AEC 感應器位置，確認正確覆蓋腺體組織，調整 kVp 或 mAs。",
      },
      {
        code: "T04",
        label: "壓迫力不足",
        suggestion:
          "增加壓迫力度至患者可耐受的最大程度（通常 10-20 公斤），均勻壓迫全體組織。",
      },
      {
        code: "T05",
        label: "機器偽影",
        suggestion:
          "定期清潔平板與壓迫板，檢查平板是否有損傷，執行定期 QC 測試。",
      },
      {
        code: "T06",
        label: "輻射劑量過高",
        suggestion:
          "檢查 AGD 是否符合標準（< 2.0 mGy），最佳化曝露參數，考慮使用較低 kVp 配合較高 mAs。",
      },
    ],
  },
};

export const EPA_LEVELS = [
  {
    level: "Lv1",
    title: "觀察員 (Observer)",
    description: "需要全程直接監督，不可獨立執行任何操作",
    capabilities: [
      "了解乳房攝影基本原理與設備操作",
      "觀察資深放射師進行擺位與影像評估",
      "熟悉輻射防護基本原則",
      "了解乳房解剖構造基礎知識",
    ],
  },
  {
    level: "Lv2",
    title: "見習操作員 (Apprentice)",
    description: "需要資深人員現場監督與即時指導",
    capabilities: [
      "能在監督下進行標準 CC 與 MLO 擺位",
      "能識別基本影像品質問題",
      "能與患者進行基本溝通與說明",
      "了解 AEC 系統操作原理",
    ],
  },
  {
    level: "Lv3",
    title: "半獨立執業員 (Semi-independent)",
    description: "能獨立操作，影像需事後審查",
    capabilities: [
      "能獨立完成標準乳房攝影（CC + MLO）",
      "能識別大多數影像品質問題並重新操作",
      "能處理一般複雜個案（義乳、術後患者）",
      "能進行基本影像品質評估與記錄",
    ],
  },
  {
    level: "Lv4",
    title: "獨立執業員 (Independent)",
    description: "具備完全獨立執業能力",
    capabilities: [
      "能處理所有類型的乳房攝影個案",
      "能獨立識別並排除影像偽影",
      "能進行追加影像（點壓、放大、特殊位）",
      "能評估並優化影像品質參數",
      "能指導初級放射師基本操作",
    ],
  },
  {
    level: "Lv5",
    title: "專家 (Expert)",
    description: "具備教學與品質管理能力",
    capabilities: [
      "能監督並評核其他放射師的臨床表現",
      "能設計並執行品質精進計畫",
      "能處理最複雜的臨床個案與技術挑戰",
      "能參與設備驗收與品質保證計畫",
      "具備教學設計與師資培訓能力",
    ],
  },
];

export const MILESTONE_LEVELS = [
  {
    level: "Lv1",
    title: "初學者 (Novice)",
    description: "剛開始接觸乳房攝影的放射師",
    knowledge: [
      "了解乳房攝影基本原理（X 光成像、壓迫原理）",
      "熟悉乳房解剖名詞（腺體、脂肪、乳頭、胸大肌）",
      "了解輻射防護基本法規",
      "能操作基本設備（調整高度、角度）",
    ],
  },
  {
    level: "Lv2",
    title: "進階初學者 (Advanced Beginner)",
    description: "具備基礎操作能力，需要經常性指導",
    knowledge: [
      "能進行標準擺位（CC + MLO）並了解常見失誤",
      "能識別明顯的影像品質問題",
      "了解 AGD 與輻射劑量最佳化原則",
      "能與不同類型患者溝通並解釋檢查流程",
    ],
  },
  {
    level: "Lv3",
    title: "能力者 (Competent)",
    description: "具備穩定的操作能力，偶爾需要諮詢",
    knowledge: [
      "能系統性評估影像品質（五大項目）",
      "能辨別定位缺失、解剖缺失與技術缺失",
      "了解各種特殊攝影技術（義乳位、點壓位）",
      "能主動優化曝露參數提升影像品質",
    ],
  },
  {
    level: "Lv4",
    title: "熟練者 (Proficient)",
    description: "具備高度熟練的操作技巧",
    knowledge: [
      "能快速判斷影像問題並即時修正",
      "能處理複雜臨床個案（術後、義乳、高密度腺體）",
      "能分析個人績效數據找出改善方向",
      "了解乳房攝影品質保證計畫的全貌",
      "能有效指導初級放射師",
    ],
  },
  {
    level: "Lv5",
    title: "專家 (Expert)",
    description: "具備卓越的專業知識與領導能力",
    knowledge: [
      "能設計品質評核標準與培訓課程",
      "能分析統計數據制定品質改善策略",
      "具備跨機構品質比較與標準制定能力",
      "能進行設備選購評估與技術文件審查",
      "具備研究與創新能力，推動乳房攝影技術發展",
    ],
  },
];
