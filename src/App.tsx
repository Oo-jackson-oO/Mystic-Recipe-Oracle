import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import { Sparkles, Image as ImageIcon, Camera, Upload, BookOpen, ChevronDown, ChevronUp, Save, Star, ArrowLeft, Loader2, Search, History, Trash2, Compass } from "lucide-react";
import { RecipeRecommendation, SavedRecipe } from "./types";
import { motion, AnimatePresence } from "motion/react";
import { apiJson, resolveApiUrl } from "./api";

const MYSTIC_QUOTES = [
  "天机小贴士：万物皆有灵，每一次食材的交融都是星轨的重合。",
  "道法自然：用心感受食材的原本气息，是最纯粹的修行。",
  "九宫飞星：今日你的运势，或许就藏在一味不起眼的佐料中。",
  "五行相生：酸甜苦辣咸调和，正如金木水火土轮回，天人合一。",
  "紫微斗数：本元法数与星相的碰撞，将在灵膳中显化。",
  "阴阳交替：耐心等待，大音希声，大道无形，美味亦如是。",
  "易经六十四卦：变则通，通则久，正在为您捕捉变数中的大吉。",
  "寻龙点穴：风水阵法正在汇聚八方灵气，注入您的灵膳之中。",
  "四柱八字：命理中的微小缺憾，将由五行属性的灵膳来弥补。",
  "先天八卦：太极生两仪，两仪生四象，为您勾勒今日专属佳肴。",
  "天地真理：烈火真金，玄空飞星正在淬炼您的专属灵膳。",
  "奇门遁甲：休生伤杜景死惊开，为您推演最佳的入口时机。",
  "星盘解析：特定行星相位正佳，你的幸运滋味即将成型。",
  "道家真言：食气者神明而寿，食谷者智慧而安。",
  "气运流转：每一次静心等待，都是气运沉淀的过程。"
];

const CULTIVATION_RANKS = [
  { name: "凡躯", bg: "bg-[#f4f3f9]", text: "text-[#3b236d]", accent: "bg-[#3b236d]", border: "border-purple-200" },
  { name: "辟谷", bg: "bg-blue-50", text: "text-blue-900", accent: "bg-blue-600", border: "border-blue-200" },
  { name: "筑基", bg: "bg-emerald-50", text: "text-teal-900", accent: "bg-teal-600", border: "border-teal-200" },
  { name: "辟邪", bg: "bg-rose-50", text: "text-red-900", accent: "bg-red-600", border: "border-red-200" },
  { name: "金丹", bg: "bg-amber-50", text: "text-amber-900", accent: "bg-amber-600", border: "border-amber-300" },
  { name: "元婴", bg: "bg-fuchsia-100", text: "text-purple-900", accent: "bg-fuchsia-700", border: "border-fuchsia-300" },
  { name: "化神", bg: "bg-slate-900", text: "text-amber-100", accent: "bg-gradient-to-r from-red-600 to-amber-600", border: "border-red-800" },
  { name: "羽化登仙", bg: "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-indigo-950 to-black", text: "text-amber-200", accent: "bg-gradient-to-r from-amber-300 to-yellow-500", border: "border-amber-700" },
];

async function reportDebugEvent(hypothesisId: string, location: string, msg: string, data: Record<string, unknown>) {
  // #region debug-point A:network-report
  await fetch("http://198.18.0.1:7777/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "android-json-parse",
      runId: "pre-fix",
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}

function useCultivation() {
  const [rank, setRank] = useState(0);
  const [stars, setStars] = useState(0);
  const [lastCheckIn, setLastCheckIn] = useState("");
  const [isPromoting, setIsPromoting] = useState(false);
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('cultivationState') || '{}');
    if (data.rank !== undefined) setRank(data.rank);
    if (data.stars !== undefined) setStars(data.stars);
    if (data.lastCheckIn) setLastCheckIn(data.lastCheckIn);
  }, []);

  const save = (r: number, s: number, d: string) => {
    setRank(r); setStars(s); setLastCheckIn(d);
    localStorage.setItem('cultivationState', JSON.stringify({ rank: r, stars: s, lastCheckIn: d }));
  };

  const checkIn = () => {
    const today = devMode ? new Date().toISOString() : new Date().toISOString().split('T')[0];
    if (!devMode && lastCheckIn === today) return false;

    let newStars = stars + 1;
    let newRank = rank;
    if (newStars >= 7) {
      newStars = 7;
      if (newRank < 7) {
        setIsPromoting(true);
        save(newRank, newStars, today);
        setTimeout(() => {
          setRank(newRank + 1);
          setStars(0);
          localStorage.setItem('cultivationState', JSON.stringify({ rank: newRank + 1, stars: 0, lastCheckIn: today }));
          setIsPromoting(false);
        }, 3000); 
        return true;
      }
    }
    save(newRank, newStars, today);
    return true;
  };

  return { rank, stars, lastCheckIn, checkIn, isPromoting, devMode, setDevMode };
}

export default function App() {
  const { rank, stars, lastCheckIn, checkIn, isPromoting, devMode, setDevMode } = useCultivation();
  const currentTheme = CULTIVATION_RANKS[rank];

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'cultivation'>('home');
  const [homeView, setHomeView] = useState<'input' | 'loading' | 'drawing' | 'result'>('input');
  const [isShaking, setIsShaking] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [historyView, setHistoryView] = useState<'list' | 'detail'>('list');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [showDetailDeleteConfirm, setShowDetailDeleteConfirm] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [taste, setTaste] = useState("");
  const [mood, setMood] = useState("");
  const [zodiac, setZodiac] = useState("");
  const [constellation, setConstellation] = useState("");
  const [luckyNumber, setLuckyNumber] = useState("");
  const [fortuneText, setFortuneText] = useState("掷出灵签");
  
  const [recommendation, setRecommendation] = useState<RecipeRecommendation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showImageSourceSheet, setShowImageSourceSheet] = useState(false);

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Predefined Options
  const zodiacOptions = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"];
  const constellationOptions = ["白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座", "水瓶座", "双鱼座"];
  const moodOptions = ["开心", "疲惫", "平静", "烦躁", "期待", "emo", "随性", "焦虑", "充满活力"];
  const tasteOptions = ["无辣不欢", "清淡养生", "嗜甜如命", "酸爽开胃", "咸香下饭", "浓油赤酱", "百无禁忌"];
  const fortuneOptions = ["大吉", "吉", "中吉", "小吉", "末吉"];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix
        resolve(base64String.split(",")[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  useEffect(() => {
    let progressInterval: number;
    let quoteInterval: number;
    
    if (homeView === 'loading') {
      setLoadingProgress(0);
      setQuoteIndex(Math.floor(Math.random() * MYSTIC_QUOTES.length));
      
      // Update progress every 1.5s, add 1-2%, aiming for ~120s to 99%
      progressInterval = window.setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 99) return 99;
          // Random increment between 1 and 2
          const inc = Math.floor(Math.random() * 2) + 1;
          return Math.min(prev + inc, 99);
        });
      }, 1500);

      // Change quote every 8 seconds
      quoteInterval = window.setInterval(() => {
        setQuoteIndex(Math.floor(Math.random() * MYSTIC_QUOTES.length));
      }, 8000);
      
    } else if (homeView === 'input') {
      setLoadingProgress(0);
    }
    
    return () => {
      window.clearInterval(progressInterval);
      window.clearInterval(quoteInterval);
    };
  }, [homeView]);

  const onSubmit = async () => {
    if (!imageFile || !taste || !mood || !zodiac || !constellation || !luckyNumber) {
      alert("请补充完整影像、属相、星座、心情、口味信息及本元法数，以便大天师准确推算。");
      return;
    }
    
    setHomeView('loading');
    
    try {
      const base64 = await getBase64(imageFile);
      const requestUrl = resolveApiUrl("/api/recommend");
      // #region debug-point B:recommend-request
      void reportDebugEvent("B", "src/App.tsx:onSubmit:beforeFetch", "recommend request start", {
        href: window.location.href,
        origin: window.location.origin,
        userAgent: navigator.userAgent,
        requestUrl,
      });
      // #endregion
      
      const { data: result, response } = await apiJson<RecipeRecommendation>("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          taste,
          mood,
          zodiac,
          constellation,
          luckyNumber
        })
      });
      // #region debug-point C:recommend-response
      void reportDebugEvent("C", "src/App.tsx:onSubmit:afterFetch", "recommend response received", {
        requestUrl,
        status: response.status,
        ok: response.ok,
        redirected: response.redirected,
        responseUrl: response.url,
        contentType: response.headers.get("content-type"),
      });
      // #endregion
      // #region debug-point D:recommend-json
      void reportDebugEvent("D", "src/App.tsx:onSubmit:afterJson", "recommend json parsed", {
        requestUrl,
        resultKeys: result && typeof result === "object" ? Object.keys(result) : [],
      });
      // #endregion
      setRecommendation(result);
      setShowDetails(false);
      
      setLoadingProgress(100);
      setTimeout(() => {
        setHomeView('drawing');
      }, 800);
      
    } catch (e: any) {
      // #region debug-point E:recommend-error
      void reportDebugEvent("E", "src/App.tsx:onSubmit:catch", "recommend request failed", {
        message: e?.message,
        stack: e?.stack,
        href: window.location.href,
        origin: window.location.origin,
      });
      // #endregion
      alert("推演失败：" + e.message);
      setHomeView('input');
      setLoadingProgress(0);
    }
  };

  const saveToGrimoire = async () => {
    if (!recommendation) return;
    setIsSaving(true);
    try {
      const { response: res } = await apiJson<{ id: number }>("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recommendation)
      });
      if (res.ok) {
        setShowSavedFeedback(true);
        setTimeout(() => setShowSavedFeedback(false), 3000);
      }
    } catch (e) {
      alert("收藏失败，缘分未到...");
    }
    setIsSaving(false);
  };

  const exportImage = async () => {
    let wasDetailsHidden = !showDetails;
    if (wasDetailsHidden) {
      flushSync(() => {
        setShowDetails(true);
      });
      // Wait for layout animation
      await new Promise(resolve => setTimeout(resolve, 350));
    }
    flushSync(() => {
      setIsExporting(true);
    });
    
    try {
      const element = document.getElementById("export-capture-area");
      if (element) {
        const { toJpeg, toBlob } = await import("html-to-image");
        
        try {
          const blob = await toBlob(element, { 
            backgroundColor: '#faf5ff',
            pixelRatio: 2,
            cacheBust: true,
          });

          if (blob) {
            const fileName = `灵膳推演_${new Date().getTime()}.jpg`;
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            let downloaded = false;
            
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
              try {
                await navigator.share({ files: [file], title: '灵膳推演结果' });
                downloaded = true;
              } catch (err) {
                console.log("Web Share failed:", err);
              }
            }
            
            if (!downloaded) {
              const dataUrl = await toJpeg(element, { backgroundColor: '#faf5ff', pixelRatio: 2, cacheBust: true });
              const link = document.createElement("a");
              link.download = fileName;
              link.href = dataUrl;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          }
        } catch (error) {
          console.error("html-to-image failed", error);
          throw error;
        }
      }
    } catch (e) {
      console.error("Export failed", e);
      alert("拓印失败，请重试");
    } finally {
      if (wasDetailsHidden) {
        setShowDetails(false);
      }
      setIsExporting(false);
    }
  };

  return (
    <motion.div 
      animate={isShaking ? { x: [-10, 10, -10, 10, -5, 5, -2, 2, 0] } : {}}
      transition={{ duration: 0.5, ease: "linear" }}
      className={`min-h-[100dvh] pb-20 font-sans transition-colors duration-1000 ${currentTheme.bg} ${currentTheme.text}`}
    >
      <AnimatePresence>
        {showFlash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] bg-amber-100 mix-blend-screen pointer-events-none"
          />
        )}
      </AnimatePresence>
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-50 bg-white/30 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.2rem] bg-gradient-to-br from-purple-500 to-[#3b236d] flex items-center justify-center shadow-[0_8px_16px_rgba(59,35,109,0.2)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-xl font-bold text-[#3b236d] tracking-widest">食运通</h1>
            <p className="text-xs text-[#4a3877]/60 font-medium">Mystic Recipe Oracle</p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            if (homeView !== 'loading') {
              setActiveTab('history');
            }
          }}
          disabled={homeView === 'loading'}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${homeView === 'loading' ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-100 text-[#4a3877]'}`}
        >
           <History className="w-6 h-6" />
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-4 relative w-full mb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && homeView === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Modern Image Upload */}
                <div className="bg-white rounded-[2rem] p-2 md:p-3 shadow-xl border border-purple-100/80 md:col-span-2 group relative overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1">
                  <button 
                    onClick={() => setShowImageSourceSheet(true)}
                    className="absolute inset-0 w-full h-full cursor-pointer z-20 appearance-none bg-transparent border-none outline-none"
                    aria-label="Upload Image"
                  />
                  {imagePreview ? (
                    <div className="relative h-64 md:h-80 w-full rounded-[1.5rem] overflow-hidden bg-[#f8f7fb]">
                       <img src={imagePreview} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-500"></div>
                       <div className="absolute bottom-4 left-4 right-auto bg-white/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 shadow-lg transform group-hover:translate-y-1 transition-transform">
                         <Camera className="w-4 h-4 text-[#3b236d]" />
                         <span className="text-sm font-bold text-[#3b236d]">重新汲取影像</span>
                       </div>
                    </div>
                  ) : (
                    <div className="relative h-64 md:h-80 w-full rounded-[1.5rem] bg-gradient-to-br from-indigo-50/80 via-purple-50/50 to-pink-50/80 flex flex-col items-center justify-center overflow-hidden border border-dashed border-purple-200">
                       {/* Decorative background elements */}
                       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                         <div className="absolute -top-10 -left-10 w-40 h-40 bg-purple-300/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
                         <div className="absolute bottom-0 right-10 w-40 h-40 bg-pink-300/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                       </div>
                       
                       <div className="relative z-10 flex flex-col items-center text-center px-4">
                         <div className="w-20 h-20 bg-white shadow-md rounded-[1.5rem] flex items-center justify-center mb-6 transform group-hover:-translate-y-2 transition-transform duration-500 rotate-3 group-hover:rotate-6">
                            <Upload className="w-10 h-10 text-purple-500" />
                         </div>
                         <h3 className="text-[#3b236d] font-extrabold text-xl md:text-2xl mb-3 tracking-wide">注入能量影像</h3>
                         <p className="text-[#4a3877]/80 text-sm font-medium bg-white/60 backdrop-blur-sm px-5 py-2 rounded-full shadow-sm mb-2">
                           点击或拖拽上传，捕捉当前磁场
                         </p>
                         <p className="text-purple-400 text-xs font-medium">
                           可为任意您喜爱的照片（美景、佳肴等）
                         </p>
                       </div>
                    </div>
                  )}
                </div>

                {/* Zodiac Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-100/50">
                  <label className="text-[#3b236d] font-extrabold text-lg tracking-wide mb-4 block border-l-4 border-amber-400 pl-3">本命属相</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-4 gap-2">
                    {zodiacOptions.map(z => (
                      <button
                        key={z}
                        onClick={() => setZodiac(z)}
                        className={`py-2 px-1 rounded-xl text-sm font-bold transition-all ${
                          zodiac === z 
                            ? 'bg-[#3b236d] text-white shadow-md scale-105' 
                            : 'bg-purple-50 text-[#4a3877] hover:bg-purple-100'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Constellation Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-100/50">
                  <label className="text-[#3b236d] font-extrabold text-lg tracking-wide mb-4 block border-l-4 border-purple-400 pl-3">星穹命座</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {constellationOptions.map(c => (
                      <button
                        key={c}
                        onClick={() => setConstellation(c)}
                        className={`py-2 px-1 rounded-xl text-sm font-bold transition-all ${
                          constellation === c 
                            ? 'bg-[#3b236d] text-white shadow-md scale-105' 
                            : 'bg-purple-50 text-[#4a3877] hover:bg-purple-100'
                        }`}
                      >
                        {c.replace("座", "")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mood Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-100/50">
                  <label className="text-[#3b236d] font-extrabold text-lg tracking-wide mb-4 block border-l-4 border-pink-400 pl-3">今日心境</label>
                  <div className="flex flex-wrap gap-2">
                    {moodOptions.map(m => (
                      <button
                        key={m}
                        onClick={() => setMood(m)}
                        className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                          mood === m 
                            ? 'bg-[#3b236d] text-white shadow-md scale-105' 
                            : 'bg-purple-50 text-[#4a3877] hover:bg-purple-100'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Taste Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-100/50">
                  <label className="text-[#3b236d] font-extrabold text-lg tracking-wide mb-4 block border-l-4 border-orange-400 pl-3">五味偏好</label>
                  <div className="flex flex-wrap gap-2">
                    {tasteOptions.map(t => (
                      <button
                        key={t}
                        onClick={() => setTaste(t)}
                        className={`py-2 px-4 rounded-xl text-sm font-bold transition-all ${
                          taste === t 
                            ? 'bg-[#3b236d] text-white shadow-md scale-105' 
                            : 'bg-purple-50 text-[#4a3877] hover:bg-purple-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lucky Number Card */}
                <div className="bg-white rounded-3xl p-6 shadow-xl border border-purple-100/50">
                  <label className="text-[#3b236d] font-extrabold text-lg tracking-wide mb-4 block border-l-4 border-indigo-400 pl-3">本元法数</label>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-1 w-full">
                      <input 
                        type="text" 
                        maxLength={4}
                        value={luckyNumber}
                        onChange={(e) => setLuckyNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="输入0-4位幸运数字"
                        className="w-full bg-purple-50 text-[#3b236d] font-bold px-4 py-3 rounded-xl border border-purple-100 outline-none focus:ring-2 focus:ring-[#3b236d]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        setLuckyNumber(Math.floor(Math.random() * 10000).toString());
                        setFortuneText(fortuneOptions[Math.floor(Math.random() * fortuneOptions.length)]);
                      }}
                      className="w-full sm:w-auto bg-[#3b236d] text-white px-6 py-3 rounded-xl font-bold tracking-widest shadow-md hover:bg-[#2d1b54] transition-all whitespace-nowrap active:scale-95"
                    >
                      {fortuneText}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button 
                onClick={onSubmit}
                className="w-full mt-4 bg-gradient-to-r from-[#4a3877] to-[#3b236d] hover:from-[#3b236d] hover:to-[#2d1b54] text-white font-bold text-lg tracking-widest py-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all flex justify-center items-center gap-3 transform hover:-translate-y-1"
              >
                <Sparkles className="w-6 h-6 text-amber-300" />
                祈请天师推演
              </button>
            </motion.div>
          )}

          {activeTab === 'home' && homeView === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <div className="relative w-56 h-56 flex items-center justify-center">
                {/* Background circle */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="112" cy="112" r="104" fill="none" stroke="rgba(59,35,109,0.1)" strokeWidth="8" />
                  <motion.circle 
                    cx="112" 
                    cy="112" 
                    r="104" 
                    fill="none" 
                    stroke="url(#progress-gradient)" 
                    strokeWidth="8" 
                    strokeDasharray={2 * Math.PI * 104}
                    strokeDashoffset={2 * Math.PI * 104 * (1 - loadingProgress / 100)}
                    transition={{ type: "tween", duration: 1 }}
                    className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                  />
                  <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Magical runes / spinners */}
                <div className="absolute inset-4 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-purple-400 border-l-transparent animate-spin-slow"></div>
                <div className="absolute inset-8 rounded-full border-2 border-r-[#3b236d] border-t-transparent border-l-purple-300 border-b-transparent animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                <div className="absolute inset-12 rounded-full border border-dashed border-[#3b236d]/30 animate-spin-slow"></div>
                
                <div className="flex flex-col items-center justify-center z-10 text-[#3b236d]">
                  <Sparkles className="w-8 h-8 animate-glow mb-1 opacity-80" />
                  <span className="text-3xl font-extrabold font-mystic">{loadingProgress}%</span>
                </div>
              </div>
              <h2 className="mt-10 text-2xl font-bold tracking-widest text-[#3b236d] animate-pulse font-mystic">大天师正在测算，为您推演运势...</h2>
              <p className="mt-3 text-[#4a3877]/80 text-sm font-medium">玄学大模型正在解析您的命理与食材契合度，天地熔炉淬炼中</p>

              {/* Quote Section */}
              <motion.div 
                key={quoteIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="mt-8 max-w-sm px-6 py-4 bg-white/60 backdrop-blur-md rounded-2xl border border-purple-100 shadow-sm text-center"
              >
                <p className="text-[#3b236d]/90 font-medium leading-relaxed font-mystic tracking-wide text-sm">{MYSTIC_QUOTES[quoteIndex]}</p>
              </motion.div>
            </motion.div>
          )}

          {activeTab === 'home' && homeView === 'drawing' && (
            <motion.div 
               key="drawing"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
            >
              <DrawingTalisman onComplete={() => {
                setIsShaking(true);
                setTimeout(() => {
                  setShowFlash(true);
                  setIsShaking(false);
                  setTimeout(() => {
                    setHomeView('result');
                    setTimeout(() => setShowFlash(false), 200);
                  }, 800);
                }, 800);
              }} />
            </motion.div>
          )}

          {((activeTab === 'home' && homeView === 'result') || (activeTab === 'history' && historyView === 'detail')) && recommendation && (
            <motion.div 
               key="result"
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="space-y-8"
            >
              <div id="export-capture-area" className="space-y-8 bg-purple-50/50 p-2 sm:p-4 rounded-[3rem]">
                {/* Dish Presentation */}
                <div className="relative">
                {/* Visual Transition Representation */}
                <div className="relative mb-16 mt-8">
                  <div className="flex flex-col items-center justify-center relative h-[400px] w-full max-w-md mx-auto">
                    {/* 天地熔炉特效背景 */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-64 h-64 bg-amber-500/20 rounded-full blur-[50px] animate-pulse"></div>
                      <div className="w-48 h-48 border-[12px] border-dashed border-orange-400/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                      <div className="absolute w-32 h-32 border-4 border-t-amber-300 border-r-transparent border-b-amber-500 border-l-transparent rounded-full animate-[spin_4s_linear_infinite_reverse]"></div>
                    </div>

                    {/* 投入熔炉的原图 (Top) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: -50 }}
                      animate={{ opacity: 0.6, scale: 1, y: -80 }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="absolute z-10 w-24 md:w-32 aspect-[3/4] rounded-full border-2 border-orange-200/50 overflow-hidden shadow-[0_0_20px_rgba(251,191,36,0.3)] saturate-50"
                    >
                      {recommendation.originalImageUrl || imagePreview ? (
                        <img src={recommendation.originalImageUrl || imagePreview!} alt="Original" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-orange-950 flex items-center justify-center"><ImageIcon className="text-orange-500/50" /></div>
                      )}
                    </motion.div>

                    {/* 能量流 */}
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 80, opacity: 1 }}
                      transition={{ delay: 1, duration: 1 }}
                      className="absolute -top-4 z-15 w-1 bg-gradient-to-b from-orange-200/50 to-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                    />

                    {/* 熔炉的核心出图 (Main) */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5, filter: "brightness(2) blur(10px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "brightness(1) blur(0px)" }}
                      transition={{ delay: 1.5, duration: 2, ease: "easeOut" }}
                      className="relative z-20 w-64 md:w-80 aspect-[4/3] rounded-3xl border-4 border-amber-300/80 overflow-hidden shadow-[0_0_60px_rgba(251,191,36,0.6)] group bg-black mt-16"
                    >
                      {recommendation.imageUrl ? (
                        <img src={recommendation.imageUrl} alt={recommendation.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                      ) : (
                        <div className="w-full h-full bg-slate-900 flex items-center justify-center flex-col gap-2 text-amber-300/50"><Sparkles className="w-8 h-8 animate-pulse" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90"></div>
                      <div className="absolute bottom-4 left-0 w-full text-center text-amber-200 text-sm font-bold tracking-[0.3em] font-mystic flex justify-center items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" /> 灵膳出炉
                      </div>
                    </motion.div>
                  </div>
                </div>

                <div className="relative z-10 p-6 md:p-8 text-center bg-white/90 backdrop-blur-xl border border-white/50 rounded-[2.5rem] shadow-xl">
                  <h2 className="text-3xl md:text-5xl font-extrabold text-[#3b236d] mb-8 drop-shadow-sm tracking-widest font-mystic">
                    {recommendation.name}
                  </h2>
                  <div className="text-left text-[#4a3877] leading-relaxed space-y-4 font-medium text-lg font-mystic">
                    {recommendation.reason.split('\n').filter(p => p.trim()).map((p, idx) => (
                      <div key={idx} className="bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100/50 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-300 to-purple-400"></div>
                        <p className="pl-2">{p.trim()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expandable Details */}
              <div className="bg-purple-50 rounded-2xl border border-purple-200 overflow-hidden shadow-sm">
                <button 
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full p-5 flex items-center justify-between text-[#3b236d] hover:bg-purple-100/50 transition-colors font-bold tracking-widest font-mystic text-lg"
                >
                  <span>灵膳秘籍 (做法与忌讳)</span>
                  {showDetails ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </button>
                
                <AnimatePresence>
                  {showDetails && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 md:p-6 space-y-8 text-[#4a3877] bg-white border-t border-purple-100">
                        {/* Ingredients */}
                        <div>
                          <h4 className="text-[#3b236d] font-bold mb-4 flex items-center gap-2 font-mystic text-xl tracking-widest">
                            <Sparkles className="w-5 h-5 text-amber-400" /> 所需灵材
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            {recommendation.ingredients.map((ing, i) => {
                              const match = ing.match(/^([\p{Emoji}]+)\s*(.*)/u);
                              const emoji = match ? match[1] : '✨';
                              const name = match ? match[2] : ing;
                              return (
                                <div key={i} className="bg-gradient-to-b from-purple-50 to-purple-100/30 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 border border-purple-200">
                                   <span className="text-2xl drop-shadow-sm">{emoji}</span>
                                   <span className="text-sm font-bold text-[#3b236d] font-mystic tracking-widest">{name}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        
                        {/* Instructions */}
                        <div>
                          <h4 className="text-[#3b236d] font-bold mb-4 flex items-center gap-2 font-mystic text-xl tracking-widest">
                            <Star className="w-5 h-5 text-indigo-400" /> 炼制之法
                          </h4>
                          <div className="space-y-3">
                            {recommendation.instructions.map((inst, i) => (
                              <div key={i} className="bg-white border text-sm border-indigo-100 rounded-xl p-4 shadow-sm flex gap-4 items-start">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">{i + 1}</span>
                                <span className="font-mystic font-medium leading-relaxed text-base">{inst}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Precautions */}
                        <div>
                          <h4 className="text-orange-600 font-bold mb-4 flex items-center gap-2 font-mystic text-xl tracking-widest">
                            <BookOpen className="w-5 h-5 text-orange-500" /> 天机禁忌
                          </h4>
                          <div className="space-y-3">
                            {recommendation.precautions.map((prec, i) => (
                              <div key={i} className="bg-orange-50/80 border border-orange-200 rounded-xl p-4 shadow-sm text-orange-800 text-sm flex gap-3 items-start">
                                <span className="text-orange-500 text-lg leading-none">⚠️</span>
                                <span className="font-mystic font-bold leading-relaxed text-base">{prec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              </div> {/* Close export-capture-area */}

              <div className="flex flex-col gap-4 pt-4 pb-12">
              <div className="flex gap-4">
                {activeTab === 'history' && historyView === 'detail' ? (
                  <>
                    <button 
                      onClick={() => setHistoryView('list')}
                      className="flex-1 py-4 rounded-xl border-2 border-purple-200 text-[#3b236d] font-bold tracking-widest hover:bg-purple-50 transition-all text-center font-mystic"
                    >
                      返回
                    </button>
                    <button 
                      onClick={() => {
                        if (showDetailDeleteConfirm) {
                          if (recommendation && 'id' in recommendation) {
                            apiJson<{ success: boolean }>(`/api/recipes/${(recommendation as any).id}`, { method: 'DELETE' }).then(() => {
                              setHistoryView('list');
                              setShowDetailDeleteConfirm(false);
                            });
                          }
                        } else {
                          setShowDetailDeleteConfirm(true);
                          setTimeout(() => setShowDetailDeleteConfirm(false), 3000);
                        }
                      }}
                      className="flex-1 py-4 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 font-mystic overflow-hidden relative"
                    >
                      {showDetailDeleteConfirm ? "确认删除?" : "删除"}
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                         setHomeView('input');
                         setImageFile(null);
                         setImagePreview(null);
                      }}
                      className="flex-1 py-4 rounded-xl border-2 border-purple-200 text-[#3b236d] font-bold tracking-widest hover:bg-purple-50 transition-all text-center font-mystic"
                    >
                      返回主页
                    </button>
                    <button 
                      onClick={saveToGrimoire}
                      disabled={isSaving || showSavedFeedback}
                      className="flex-1 py-4 rounded-xl bg-gradient-to-r from-[#4a3877] to-[#3b236d] text-white font-bold tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 font-mystic overflow-hidden relative"
                    >
                      <AnimatePresence mode="wait">
                        {showSavedFeedback ? (
                          <motion.span 
                            key="saved"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            className="flex items-center gap-2 text-green-300 pointer-events-none"
                          >
                            <Sparkles className="w-5 h-5" /> 保存成功！
                          </motion.span>
                        ) : isSaving ? (
                           <motion.span key="loading" className="flex items-center gap-2 pointer-events-none">
                             <Loader2 className="w-5 h-5 animate-spin" /> 收录中...
                           </motion.span>
                        ) : (
                           <motion.span key="normal" className="flex items-center gap-2 pointer-events-none">
                             <Save className="w-5 h-5" /> 收入灵膳录
                           </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  </>
                )}
              </div>
              
              <button 
                onClick={exportImage}
                disabled={isExporting}
                className="w-full mt-2 py-4 rounded-xl bg-purple-50 text-[#4a3877] font-bold tracking-widest border border-purple-200 hover:bg-purple-100 transition-all flex items-center justify-center gap-2 font-mystic"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> 生成天经中...
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5" /> 拓印原图
                  </>
                )}
              </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && historyView === 'list' && (
            <HistoryView onSelectRecipe={(r) => { setRecommendation(r); setHistoryView('detail'); setShowDetails(false); }} />
          )}

          {activeTab === 'cultivation' && (
            <CultivationView rank={rank} stars={stars} lastCheckIn={lastCheckIn} checkIn={checkIn} isPromoting={isPromoting} theme={currentTheme} devMode={devMode} setDevMode={setDevMode} />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-purple-100/60 pb-6 pt-2 z-50 rounded-t-[2.5rem] shadow-[0_-10px_30px_rgba(59,35,109,0.05)]">
        <div className="max-w-md mx-auto flex justify-around items-center px-6 py-4">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTab === 'home' ? 'text-[#3b236d] scale-110' : 'text-[#4a3877]/60 hover:text-[#4a3877]'
            }`}
          >
            <Star className={`w-6 h-6 ${activeTab === 'home' ? 'fill-amber-300 text-amber-500' : ''}`} />
            <span className="text-xs font-bold tracking-widest">主页推演</span>
          </button>

          <button 
            onClick={() => {
              if (homeView !== 'loading') {
                setActiveTab('cultivation');
              }
            }}
            disabled={homeView === 'loading'}
            className={`flex flex-col items-center gap-1 transition-all relative ${
              homeView === 'loading' ? 'opacity-40 cursor-not-allowed' : ''
            } ${activeTab === 'cultivation' ? 'text-[#3b236d] scale-110' : 'text-[#4a3877]/60 hover:text-[#4a3877]'}`}
          >
            {lastCheckIn !== new Date().toISOString().split('T')[0] && <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400 border border-white"></div>}
            <Compass className={`w-6 h-6 ${activeTab === 'cultivation' ? 'text-purple-600' : ''}`} />
            <span className="text-xs font-bold tracking-widest">每日签到</span>
          </button>

          <button 
            onClick={() => {
              if (homeView !== 'loading') {
                setActiveTab('history');
              }
            }}
            disabled={homeView === 'loading'}
            className={`flex flex-col items-center gap-1 transition-all ${
              homeView === 'loading' ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              activeTab === 'history' ? 'text-[#3b236d] scale-110' : 'text-[#4a3877]/60 hover:text-[#4a3877]'
            }`}
          >
            <BookOpen className={`w-6 h-6 ${activeTab === 'history' ? 'fill-purple-300 text-purple-500' : ''}`} />
            <span className="text-xs font-bold tracking-widest">灵膳录</span>
          </button>
        </div>
      </nav>

      {/* Image Source Action Sheet */}
      <AnimatePresence>
        {showImageSourceSheet && (
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             onClick={() => setShowImageSourceSheet(false)}
             className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center pb-safe"
          >
            <motion.div 
               initial={{ y: "100%" }}
               animate={{ y: 0 }}
               exit={{ y: "100%" }}
               transition={{ type: "spring", bounce: 0, duration: 0.4 }}
               onClick={(e) => e.stopPropagation()}
               className="bg-white w-full rounded-t-[2.5rem] overflow-hidden shadow-2xl relative max-w-lg mx-auto pb-8 border-t border-purple-200"
            >
               <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto my-5 shrink-0"></div>
               <div className="px-6 py-2 flex flex-col gap-4">
                  <h3 className="text-[#3b236d] font-bold font-mystic text-xl mb-2 text-center tracking-widest">请选择灵材来源</h3>
                  <label className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4a3877] font-bold tracking-widest transition-colors cursor-pointer border border-purple-200 font-mystic text-lg active:scale-95">
                    <Camera className="w-6 h-6 text-purple-600" />
                    <span>即时通灵 (拍照)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => { handleImageChange(e); setShowImageSourceSheet(false); }}
                      className="hidden" 
                    />
                  </label>
                  <label className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-bold tracking-widest transition-colors cursor-pointer border border-orange-200 font-mystic text-lg active:scale-95">
                    <ImageIcon className="w-6 h-6 text-orange-600" />
                    <span>拾取回忆 (相册)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => { handleImageChange(e); setShowImageSourceSheet(false); }}
                      className="hidden" 
                    />
                  </label>
                  <button 
                    onClick={() => setShowImageSourceSheet(false)}
                    className="w-full py-4 mt-2 rounded-xl text-gray-400 font-bold tracking-widest hover:bg-gray-50 transition-colors font-mystic"
                  >
                    取消
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CultivationView({ rank, stars, lastCheckIn, checkIn, isPromoting, theme, devMode, setDevMode }: any) {
  const TODAY = new Date().toISOString().split('T')[0];
  const canCheckIn = devMode ? rank < 7 : lastCheckIn !== TODAY;

  const radius = 110;
  const nodes = Array.from({ length: 7 }).map((_, i) => {
    const angle = (i * 2 * Math.PI) / 7 - Math.PI / 2;
    return {
      x: 150 + radius * Math.cos(angle),
      y: 150 + radius * Math.sin(angle),
      lit: i < stars
    };
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-6 relative font-mystic">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>
      
      <div className="absolute top-0 right-0 flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full z-20">
        <label className="text-xs font-bold opacity-70 cursor-pointer">开发者连点破境</label>
        <button 
          onClick={() => setDevMode(!devMode)} 
          className={`w-10 h-5 rounded-full relative transition-colors ${devMode ? 'bg-amber-500' : 'bg-gray-300'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${devMode ? 'left-5' : 'left-0.5'}`}></div>
        </button>
      </div>

      <div className="mb-10 text-center relative z-10 w-full mt-8">
         <h2 className="text-4xl md:text-5xl font-extrabold tracking-[0.3em] mb-3 drop-shadow-md">{theme.name}</h2>
         <p className="opacity-70 text-sm font-bold tracking-[0.5em] uppercase">当前灵力境界</p>
      </div>

      <div className="relative w-[300px] h-[300px] mb-12 flex items-center justify-center">
         <svg className="absolute inset-0 w-full h-full" overflow="visible">
            <motion.path 
               d={`M ${nodes[0].x} ${nodes[0].y} L ${nodes[2].x} ${nodes[2].y} L ${nodes[4].x} ${nodes[4].y} L ${nodes[6].x} ${nodes[6].y} L ${nodes[1].x} ${nodes[1].y} L ${nodes[3].x} ${nodes[3].y} L ${nodes[5].x} ${nodes[5].y} Z`}
               fill="none"
               stroke="currentColor" 
               strokeWidth="1"
               strokeDasharray="4 4"
               className={`opacity-20`}
            />
         </svg>
         
         {nodes.map((node, i) => (
           <div key={i} className={`absolute w-6 h-6 -ml-3 -mt-3 rounded-full flex items-center justify-center ${node.lit ? theme.accent + ' shadow-[0_0_20px_currentColor] text-white scale-110' : 'bg-gray-300 shadow-inner text-transparent scale-90'} transition-all duration-700 z-10`} style={{ left: node.x, top: node.y }}>
              <Star className="w-3 h-3" />
           </div>
         ))}
         
         <button onClick={() => canCheckIn && checkIn()} disabled={!canCheckIn || isPromoting} className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${canCheckIn ? theme.accent + ' text-white cursor-pointer shadow-[0_0_40px_currentColor] hover:scale-105' : 'bg-white/40 border-gray-400 text-gray-700 cursor-not-allowed opacity-90'} backdrop-blur-md transition-all duration-500 z-20`}>
            {isPromoting ? (
               <Loader2 className="w-10 h-10 animate-spin" />
            ) : (
               <>
                 <Compass className={`w-10 h-10 mb-1 ${canCheckIn ? 'animate-pulse text-amber-200' : 'opacity-50'}`} />
                 <span className="text-sm font-bold tracking-widest">{canCheckIn ? '注入灵力' : '已修练'}</span>
               </>
            )}
         </button>
      </div>

      <div className="text-center z-10 bg-white/40 backdrop-blur-xl p-8 rounded-3xl border border-white/50 shadow-xl w-full max-w-sm">
         <h3 className="font-bold text-xl mb-3 tracking-widest">星轨结阵 · 七芒星阵</h3>
         <p className="text-sm opacity-80 leading-relaxed font-sans font-medium">
           每日打卡可点亮一颗星辰。连续七日星阵圆满，即可触发「阵法大成」，提升灵力境界，解锁高阶浩瀚界面主题。
         </p>
         <div className="mt-6 flex bg-black/10 rounded-full h-3 overflow-hidden shadow-inner relative">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(stars / 7) * 100}%` }} className={`h-full ${theme.accent}`} />
            <div className="absolute inset-0 flex justify-around items-center">
               {[1,2,3,4,5,6].map(i => <div key={i} className="w-[1px] h-full bg-white/30"></div>)}
            </div>
         </div>
         <p className="mt-3 text-sm font-bold tracking-widest">已点亮星辰：{stars} / 7</p>
      </div>

      <AnimatePresence>
        {isPromoting && (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg">
             <div className="text-center text-amber-300 flex flex-col items-center">
                <div className="relative mb-8">
                   <Sparkles className="w-24 h-24 animate-spin-slow absolute opacity-50 blur-sm" />
                   <Sparkles className="w-24 h-24 animate-spin-slow" />
                </div>
                <h1 className="text-5xl md:text-7xl font-mystic font-extrabold tracking-[0.3em] animate-pulse drop-shadow-[0_0_30px_rgba(251,191,36,0.8)]">阵法大成</h1>
                <p className="mt-6 text-2xl tracking-[0.5em] font-mystic text-amber-100/80">境界突破中...</p>
             </div>
           </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HistoryView({ onSelectRecipe }: { onSelectRecipe: (r: RecipeRecommendation) => void }) {
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const requestUrl = resolveApiUrl("/api/recipes");
    // #region debug-point F:history-request
    void reportDebugEvent("F", "src/App.tsx:HistoryView:beforeFetch", "history request start", {
      href: window.location.href,
      origin: window.location.origin,
      requestUrl,
    });
    // #endregion
    apiJson<SavedRecipe[]>("/api/recipes")
      .then(({ data, response: r }) => {
        // #region debug-point G:history-response
        void reportDebugEvent("G", "src/App.tsx:HistoryView:afterFetch", "history response received", {
          requestUrl,
          status: r.status,
          ok: r.ok,
          redirected: r.redirected,
          responseUrl: r.url,
          contentType: r.headers.get("content-type"),
        });
        // #endregion
        // #region debug-point H:history-json
        void reportDebugEvent("H", "src/App.tsx:HistoryView:afterJson", "history json parsed", {
          requestUrl,
          itemCount: Array.isArray(data) ? data.length : -1,
        });
        // #endregion
        setRecipes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        // #region debug-point I:history-error
        void reportDebugEvent("I", "src/App.tsx:HistoryView:catch", "history request failed", {
          message: e?.message,
          stack: e?.stack,
          href: window.location.href,
          origin: window.location.origin,
        });
        // #endregion
        console.error("Failed to load history", e);
        setLoading(false);
      });
  }, []);

  const filteredRecipes = recipes.filter(r => {
    if (!searchQuery) return true;
    const lowerQ = searchQuery.toLowerCase();
    const inName = r.name.toLowerCase().includes(lowerQ);
    
    let inIngredients = false;
    try {
      const ings = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : r.ingredients;
      if (Array.isArray(ings)) {
        inIngredients = ings.some(ing => ing.toLowerCase().includes(lowerQ));
      }
    } catch(e) {}
    
    return inName || inIngredients;
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#3b236d] tracking-widest">
          我的灵膳
        </h2>
        <div className="bg-purple-100 text-[#3b236d] px-4 py-1.5 rounded-xl text-sm font-bold opacity-80">
          {filteredRecipes.length} 收录
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative flex items-center bg-white rounded-2xl shadow-sm p-3 border border-purple-50">
        <Search className="w-5 h-5 text-gray-300 ml-2" />
        <input 
          type="text" 
          placeholder="搜索佳肴与灵材..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent px-3 flex-shrink w-0 py-2 text-[#3b236d] placeholder:text-gray-400 focus:outline-none font-medium"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-[#3b236d] animate-spin" /></div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-24 text-gray-400 font-medium flex flex-col items-center">
          <Sparkles className="w-16 h-16 mb-4 text-gray-300" strokeWidth={1.5} />
          <p className="text-lg">暂无灵膳，享受美好的一天！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
          {filteredRecipes.map(recipe => {
            let ingredients = [], instructions = [], precautions = [];
            try { ingredients = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients || []; } catch(e){}
            try { instructions = typeof recipe.instructions === 'string' ? JSON.parse(recipe.instructions) : recipe.instructions || []; } catch(e){}
            try { precautions = typeof recipe.precautions === 'string' ? JSON.parse(recipe.precautions) : recipe.precautions || []; } catch(e){}
            
            const parsedRecipe = { ...recipe, ingredients, instructions, precautions };

            return (
              <div 
                key={recipe.id}
                onClick={() => onSelectRecipe(parsedRecipe)}
                className="bg-white border border-purple-200 shadow-sm rounded-xl overflow-hidden cursor-pointer hover:border-purple-400 hover:shadow-md transition-all group flex flex-col relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (deletingId === recipe.id) {
                      apiJson<{ success: boolean }>(`/api/recipes/${recipe.id}`, { method: 'DELETE' }).then(() => {
                        setRecipes(prev => prev.filter(r => r.id !== recipe.id));
                        setDeletingId(null);
                      });
                    } else {
                      setDeletingId(recipe.id);
                      setTimeout(() => setDeletingId(null), 3000);
                    }
                  }}
                  className={`absolute top-2 right-2 p-2 bg-white/90 rounded-full z-20 backdrop-blur-sm transition-all shadow-sm ${deletingId === recipe.id ? 'text-red-500 bg-red-50 hover:bg-red-100 flex items-center justify-center min-w-[72px]' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                >
                  {deletingId === recipe.id ? (
                    <span className="text-xs font-bold leading-none py-0.5">确认删除?</span>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
                {recipe.imageUrl && (
                  <div className="h-32 w-full relative overflow-hidden">
                    <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent"></div>
                  </div>
                )}
                <div className="p-4 flex-1 flex flex-col pt-0 relative z-10 -mt-8">
                  <h3 className="text-lg font-bold text-[#3b236d] mb-2 truncate drop-shadow-sm font-mystic tracking-widest">{recipe.name}</h3>
                  <p className="text-sm text-[#4a3877] line-clamp-2 opacity-90 flex-1 font-mystic leading-relaxed">{recipe.reason}</p>
                  <div className="mt-4 text-xs text-[#3b236d]/60 font-medium">
                    得道日期: {new Date(recipe.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function DrawingTalisman({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [phase, setPhase] = useState<'drawing' | 'result'>('drawing');
  const [fortuneText, setFortuneText] = useState("");
  
  const isDrawing = useRef(false);
  const lastPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const setSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    setSize();
    window.addEventListener('resize', setSize);
    return () => window.removeEventListener('resize', setSize);
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return {x: 0, y: 0};
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (phase !== 'drawing') return;
    isDrawing.current = true;
    lastPos.current = getPos(e);
    setHasDrawn(true);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing.current || phase !== 'drawing') return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas || !lastPos.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#fcd34d';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastPos.current = pos;
  };

  const handleEnd = () => {
    isDrawing.current = false;
    lastPos.current = null;
  };

  const handleComplete = () => {
    setPhase('result');
    const result = Math.random() > 0.5 ? '大吉' : '吉';
    setFortuneText(result);
    // After showing the animation for 2.5 seconds, advance
    setTimeout(() => {
      onComplete();
    }, 2500);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center mt-12 px-4">
      {phase === 'drawing' ? (
        <>
          <h3 className="text-[#3b236d] font-mystic text-xl mb-6 tracking-widest animate-pulse font-bold text-center">
            请随意画符，注入灵力
          </h3>
          <div className="relative w-full max-w-sm h-[400px]">
            <canvas 
              ref={canvasRef}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              className="absolute inset-0 w-full h-full border border-purple-200/50 rounded-[2rem] cursor-crosshair shadow-[0_10px_30px_rgba(59,35,109,0.05)] touch-none bg-white/40 backdrop-blur-md z-10"
            />
            <div className="absolute -inset-4 bg-gradient-to-tr from-purple-100 to-amber-50 rounded-[2.5rem] -z-10 blur-xl opacity-60 pointer-events-none"></div>
          </div>
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: hasDrawn ? 1 : 0, y: hasDrawn ? 0 : 20 }}
             className="mt-8"
          >
            <button
               onClick={handleComplete}
               disabled={!hasDrawn}
               className="px-8 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold tracking-widest shadow-lg hover:shadow-xl transition-all active:scale-95 font-mystic"
            >
              注入完毕
            </button>
          </motion.div>
        </>
      ) : (
        <div className="w-full max-w-sm h-[500px] flex items-center justify-center relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 100 }}
            className="relative z-20 flex flex-col items-center justify-center"
          >
            <motion.div 
               animate={{ scale: [1, 1.2, 1], filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'] }}
               transition={{ duration: 1.5, repeat: Infinity }}
               className="text-[120px] font-mystic font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 via-yellow-500 to-orange-600 drop-shadow-[0_0_30px_rgba(245,158,11,0.8)]"
            >
              {fortuneText}
            </motion.div>
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5 }}
               className="text-amber-600 font-bold tracking-widest mt-4 text-xl"
            >
              灵力汇聚，命理契合
            </motion.div>
          </motion.div>
          
          <motion.div 
             initial={{ scale: 0, opacity: 0 }}
             animate={{ scale: [1, 2, 3], opacity: [1, 0.5, 0] }}
             transition={{ duration: 1.5, ease: "easeOut" }}
             className="absolute inset-0 m-auto w-32 h-32 rounded-full border-4 border-amber-400 z-10"
          />
          <motion.div 
             initial={{ scale: 0, opacity: 0 }}
             animate={{ scale: [1, 2, 3], opacity: [1, 0.5, 0] }}
             transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
             className="absolute inset-0 m-auto w-32 h-32 rounded-full border-4 border-orange-400 z-10"
          />
        </div>
      )}
    </div>
  );
}
