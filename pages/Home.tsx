
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Upload, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight, X, BookOpen, Save, Mic, MicOff, AlertCircle, ShieldAlert } from 'lucide-react';
import { Transaction, Diary, TransactionType } from '../types';
import { CATEGORY_GROUPS, INCOME_CATEGORY } from '../constants';

interface HomeProps {
  transactions: Transaction[];
  diaries: Diary[];
  onAdd: (t: Transaction) => void;
  onImportAll: (ts: Transaction[], ds: Diary[]) => void;
  onSaveDiary: (date: string, content: string) => void;
}

const KEYWORD_MAP: Record<string, string> = {
  '饭': '餐饮', '餐': '餐饮', '吃': '餐饮', '喝': '餐饮', '奶茶': '餐饮', '零食': '餐饮', '咖啡': '餐饮', '外卖': '餐饮',
  '车': '交通', '地铁': '交通', '公交': '交通', '打车': '交通', '油': '交通', '路费': '交通', '停车': '交通',
  '买': '菜篮子', '菜': '菜篮子', '超市': '菜篮子', '水果': '菜篮子', '零用': '菜篮子',
  '衣服': '服饰', '鞋': '服饰', '裙': '服饰', '裤': '服饰',
  '住': '住宿', '房': '住宿', '酒店': '住宿', '民宿': '住宿',
  '玩': '娱乐其他', '电影': '娱乐其他', '游戏': '娱乐其他', '门票': '票务', '演出': '票务',
  '水': '水', '电': '电', '煤': '燃', '气': '燃', '话费': '话', '手机': '话', '网费': '话',
  '收': '收入', '工资': '收入', '赚': '收入', '利息': '收入', '奖金': '收入', '红包': '收入'
};

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const normalizeVoiceText = (text: string) => {
  let t = text;
  t = t.replace(/两/g, '二');
  const map: Record<string, number> = { '零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  const d = (char: string) => map[char];
  t = t.replace(/([一二三四五六七八九])千/g, (_, p1) => String(d(p1) * 1000));
  t = t.replace(/([一二三四五六七八九])百([一二三四五六七八九])十([一二三四五六七八九])/g, (_, p1, p2, p3) => String(d(p1)*100 + d(p2)*10 + d(p3)));
  t = t.replace(/([一二三四五六七八九])百([一二三四五六七八九])十/g, (_, p1, p2) => String(d(p1)*100 + d(p2)*10));
  t = t.replace(/([一二三四五六七八九])百零([一二三四五六六七八九])/g, (_, p1, p2) => String(d(p1)*100 + d(p2)));
  t = t.replace(/([一二三四五六七八九])百([一二三四五六七八九])(?![十])/g, (_, p1, p2) => String(d(p1)*100 + d(p2)*10));
  t = t.replace(/([一二三四五六七八九])百/g, (_, p1) => String(d(p1)*100));
  t = t.replace(/([一二三四五六七八九])十([一二三四五六七八九])/g, (_, p1, p2) => String(d(p1) * 10 + d(p2)));
  t = t.replace(/([一二三四五六七八九])十/g, (_, p1) => String(d(p1) * 10));
  t = t.replace(/十([一二三四五六七八九])/g, (_, p1) => String(10 + d(p1)));
  t = t.replace(/十/g, '10');
  return t.replace(/[零一二三四五六七八九]/g, (m) => String(map[m]));
};

const Home: React.FC<HomeProps> = ({ transactions, diaries, onAdd, onImportAll, onSaveDiary }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('餐饮');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getLocalDateString(new Date()));
  const [note, setNote] = useState('');
  const [diaryInput, setDiaryInput] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [isSavingDiary, setIsSavingDiary] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [isDiaryListening, setIsDiaryListening] = useState(false);
  const [supportSpeech, setSupportSpeech] = useState(true);
  const [isSecure, setIsSecure] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const activeModeRef = useRef<'transaction' | 'diary'>('transaction');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatWithCommas = (val: string) => {
    if (!val) return '';
    const cleanValue = val.replace(/[^\d.]/g, '');
    const parts = cleanValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (parts.length > 1) {
      return `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    return parts[0];
  };

  useEffect(() => {
    const existing = diaries.find(d => d.date === date);
    setDiaryInput(existing?.content || '');
  }, [date, diaries]);

  // 环境检测与初始化
  useEffect(() => {
    // 检查安全上下文（Android 9+ 必须 HTTPS）
    if (window.isSecureContext === false) {
      setIsSecure(false);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupportSpeech(false);
      return;
    }

    const initRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => {
        if (navigator.vibrate) navigator.vibrate(40);
      };

      recognition.onend = () => {
        setIsListening(false);
        setIsDiaryListening(false);
        if (navigator.vibrate) navigator.vibrate([20, 20]);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setIsDiaryListening(false);
        
        const err = event.error;
        // 处理 no-speech 错误，这是最常见的静默中断原因，通常不需要弹出警告
        if (err === 'no-speech') {
          console.debug("Recognition: No speech detected.");
          return;
        }

        if (err === 'not-allowed') {
          alert('权限被拦截：\n1. 请在安卓系统中开启APP的“录音/麦克风”权限。\n2. 如果是打包后的APK，请确保已在代码中声明 RECORD_AUDIO。');
        } else if (err === 'service-not-allowed') {
          alert('系统限制：Android安全策略可能拦截了非HTTPS页面的语音请求。');
        } else if (err === 'network') {
          alert('识别失败：此功能需要联网调用系统语音引擎（如Google语音或华为语音）。');
        }
        console.error("Recognition Error:", err);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeModeRef.current === 'transaction') {
          handleVoiceParse(transcript);
        } else {
          setDiaryInput(prev => prev + (prev ? ' ' : '') + transcript);
        }
      };
      return recognition;
    };

    recognitionRef.current = initRecognition();
  }, []);

  const handleVoiceParse = (originalText: string) => {
    const text = normalizeVoiceText(originalText);
    let noteText = text;
    const dateOffsets: Record<string, number> = { '前天': -2, '昨天': -1, '今天': 0, '明天': 1, '后天': 2 };
    for (const [key, offset] of Object.entries(dateOffsets)) {
      if (noteText.includes(key)) {
        const d = new Date();
        d.setDate(d.getDate() + offset);
        setDate(getLocalDateString(d));
        noteText = noteText.replace(key, '');
        break;
      }
    }
    let extractedAmount = '';
    const currencyMatch = noteText.match(/(\d+(?:\.\d+)?)\s*(?:元|块|钱)/);
    if (currencyMatch) {
      extractedAmount = currencyMatch[1];
      noteText = noteText.replace(currencyMatch[0], '');
    } else {
      const contextMatch = noteText.match(/(?:花了|花费|用去|支出|收入|收款|入账|付|交)\s*(\d+(?:\.\d+)?)/);
      if (contextMatch) {
        extractedAmount = contextMatch[1];
        noteText = noteText.replace(contextMatch[1], ''); 
      } else {
        const genericMatch = noteText.match(/\d+(?:\.\d+)?/);
        if (genericMatch) {
          extractedAmount = genericMatch[0];
          noteText = noteText.replace(genericMatch[0], '');
        }
      }
    }
    if (extractedAmount) setAmount(formatWithCommas(extractedAmount));
    noteText = noteText.replace(/花了|花费|用去|买|去|支出|收入|坐|做/g, '').replace(/元|块|钱/g, '').replace(/[，。！？,.!?]/g, ' ');
    setNote(noteText.trim());
    let detectedCategory = '';
    let detectedType: TransactionType = 'expense';
    let bestMatchLength = 0;
    if (text.includes('收') || text.includes('赚') || text.includes('工资') || text.includes('奖金') || text.includes('红包')) {
      detectedType = 'income';
      detectedCategory = '收入';
    } else {
      for (const [key, label] of Object.entries(KEYWORD_MAP)) {
        if (text.includes(key) && key.length > bestMatchLength) {
          bestMatchLength = key.length;
          detectedCategory = label;
        }
      }
    }
    if (detectedCategory) { setType(detectedType); setCategory(detectedCategory); }
  };

  const startListening = async (mode: 'transaction' | 'diary') => {
    if (!recognitionRef.current) return;

    // 预触发：强制调用一次 getUserMedia 以在 APK 环境触发系统权限弹窗
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); // 仅用于触发弹窗，立即关闭
    } catch (e) {
      console.warn("Pre-auth failed, but continuing with Recognition API");
    }
    
    try { recognitionRef.current.stop(); } catch(e) {}

    activeModeRef.current = mode;
    setTimeout(() => {
      try {
        recognitionRef.current.start();
        if (mode === 'transaction') setIsListening(true);
        else setIsDiaryListening(true);
      } catch (e) {
        setIsListening(false);
        setIsDiaryListening(false);
      }
    }, 100);
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmount = amount.replace(/,/g, '');
    const val = parseFloat(cleanAmount);
    if (!val || isNaN(val)) return;
    setIsSavingRecord(true);
    setTimeout(() => setIsSavingRecord(false), 400);
    const group = CATEGORY_GROUPS.find(g => g.items.some(i => i.label === category))?.name || '其他大类';
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      type, category,
      categoryGroup: type === 'income' ? '收入' : group,
      amount: Math.abs(val),
      date, note, createdAt: Date.now()
    });
    setAmount('');
    setNote('');
  };

  const handleSaveDiary = () => {
    setIsSavingDiary(true);
    onSaveDiary(date, diaryInput);
    setTimeout(() => setIsSavingDiary(false), 500);
  };

  const handleExport = () => {
    let content = "---SMAN TRANSACTIONS---\n";
    content += transactions.map(t => `${t.date}|${t.type}|${t.category}|${t.amount}|${t.note}`).join('\n');
    content += "\n---SMAN DIARIES---\n";
    content += diaries.map(d => `${d.date}|${d.content.replace(/\n/g, '\\n')}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sman_finance_${date}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      let currentSection = "";
      const importedTs: Transaction[] = [];
      const importedDs: Diary[] = [];
      lines.forEach(line => {
        if (line.includes("---SMAN TRANSACTIONS---")) { currentSection = "ts"; return; }
        if (line.includes("---SMAN DIARIES---")) { currentSection = "ds"; return; }
        if (!line.trim()) return;
        if (currentSection === "ts") {
          const [d, t, c, a, n] = line.split('|');
          if (d && t && c && a) {
            importedTs.push({ id: Math.random().toString(36).substr(2, 9), date: d, type: t as TransactionType, category: c, categoryGroup: '', amount: parseFloat(a), note: n || '', createdAt: Date.now() });
          }
        } else if (currentSection === "ds") {
          const [d, c] = line.split('|');
          if (d && c) importedDs.push({ date: d, content: c.replace(/\\n/g, '\n') });
        }
      });
      onImportAll(importedTs, importedDs);
      alert('数据已导入');
    };
    reader.readAsText(file);
  };

  const daysInMonth = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [viewDate]);

  const allExpenseCategories = useMemo(() => CATEGORY_GROUPS.flatMap(g => g.items), []);

  return (
    <div className="space-y-3 pb-6 animate-in fade-in duration-500 relative">
      {!isSecure && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2 mb-2">
          <ShieldAlert size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <p className="text-[10px] font-bold text-amber-700 leading-normal">
            安全警告：当前处于非安全环境（HTTP）。Android系统可能因此禁用语音识别。请打包APK时确保WebView访问地址以 https:// 开头。
          </p>
        </div>
      )}

      {!supportSpeech && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-3 flex items-start gap-2 mb-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-[10px] font-bold text-red-600 leading-normal">
            设备不支持原生语音识别。请安装“Google 语音服务”或在 APK 设置中启用相应系统权限。
          </p>
        </div>
      )}

      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-extrabold text-black">选择记录日期</h3>
              <button onClick={() => setShowCalendar(false)} className="p-2 text-black hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
            <div className="flex justify-between items-center mb-4 text-black">
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft size={20} /></button>
              <span className="font-extrabold text-base">{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
              <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronRight size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-xs font-black text-slate-300 uppercase tracking-widest">{d}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="h-10"></div>;
                const dateStr = getLocalDateString(day);
                const isSelected = date === dateStr;
                return (
                  <button key={dateStr} onClick={() => { setDate(dateStr); setShowCalendar(false); }} className={`h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-black text-white shadow-lg' : 'hover:bg-slate-50 text-slate-700'}`}>
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Diary Section */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xl font-black text-black flex items-center gap-2 tracking-tighter">
            <BookOpen size={20} className="text-slate-400" /> 
            {date === getLocalDateString(new Date()) ? '今日日记' : '日记'}
          </h3>
          <button onClick={() => setShowCalendar(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all active:scale-95">
            <span className="text-[10px] font-bold text-slate-500">{date}</span>
            <CalendarIcon size={12} className="text-slate-400" />
          </button>
        </div>
        <textarea value={diaryInput} onChange={e => setDiaryInput(e.target.value)} placeholder="今天发生了什么难忘的事吗？" className="w-full h-20 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold outline-none resize-none focus:ring-2 focus:ring-black transition-all shadow-inner text-black placeholder:text-slate-200 mb-3" />
        <div className="flex justify-end gap-2">
          <button 
            onPointerDown={(e) => { e.preventDefault(); startListening('diary'); }}
            onPointerUp={(e) => { e.preventDefault(); stopListening(); }}
            onPointerLeave={(e) => { e.preventDefault(); stopListening(); }}
            className={`flex items-center gap-1 px-4 py-2.5 rounded-xl font-black text-xs transition-all duration-300 select-none touch-none ${
              isDiaryListening 
                ? 'bg-red-500 text-white border border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' 
                : 'bg-slate-100 text-black border border-slate-200 shadow-sm active:scale-95'
            }`}
          >
            {isDiaryListening ? <MicOff size={14} /> : <Mic size={14} />} 
            {isDiaryListening ? '松开停止' : '语音日记'}
          </button>
          <button onClick={handleSaveDiary} className={`flex items-center gap-1 bg-black text-white px-5 py-2.5 rounded-xl font-black text-xs transition-all duration-300 ${isSavingDiary ? 'scale-110 shadow-md bg-black/80' : 'active:scale-95 shadow-lg'}`}>
            <Save size={14} /> 保存日记
          </button>
        </div>
      </div>

      {/* Transaction Section */}
      <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-black text-black flex items-center gap-3 tracking-tighter">今日记账</h2>
          <div className="flex gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shadow-sm">
              <Download size={18} />
              <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".txt" />
            </button>
            <button onClick={handleExport} className="p-2.5 bg-slate-50 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"><Upload size={18} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-2xl shadow-inner">
            <button type="button" onClick={() => { setType('expense'); setCategory('餐饮'); }} className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${type === 'expense' ? 'bg-white shadow-md text-black scale-[1.02]' : 'text-slate-400'}`}>支出</button>
            <button type="button" onClick={() => { setType('income'); setCategory('收入'); }} className={`flex-1 py-2.5 rounded-xl font-extrabold text-xs transition-all ${type === 'income' ? 'bg-white shadow-md text-black scale-[1.02]' : 'text-slate-400'}`}>收入</button>
          </div>

          <div className="flex gap-3 text-black">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">记录时间</label>
              <button type="button" onClick={() => setShowCalendar(true)} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-sm shadow-sm active:scale-95 transition-all">
                <span className="flex items-center gap-2"><CalendarIcon size={16} className="text-slate-400" /> {date === getLocalDateString(new Date()) ? '今天' : date}</span>
                <ChevronDown size={14} className="text-slate-300" />
              </button>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">金额</label>
              <div className="relative group">
                <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(formatWithCommas(e.target.value))} placeholder="0.00" className="w-full pl-4 pr-8 py-3 bg-slate-50 rounded-xl border border-slate-100 font-black text-lg outline-none focus:ring-2 focus:ring-black transition-all shadow-sm text-black placeholder:text-slate-200" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-black text-slate-300 text-sm">¥</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">备注说明</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="记录点什么..." className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 font-bold text-sm outline-none focus:ring-2 focus:ring-black shadow-sm text-black placeholder:text-slate-200" />
          </div>

          <div className="select-none py-1">
            <div className="flex gap-3">
              <button 
                onPointerDown={(e) => { e.preventDefault(); startListening('transaction'); }}
                onPointerUp={(e) => { e.preventDefault(); stopListening(); }}
                onPointerLeave={(e) => { e.preventDefault(); stopListening(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border transition-all duration-150 touch-none select-none ${
                  isListening 
                    ? 'bg-red-500 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-95 animate-pulse' 
                    : 'bg-slate-100 border-slate-200 text-black active:scale-95'
                }`}
              >
                {isListening ? (
                  <>
                    <MicOff size={18} />
                    <span className="font-bold text-sm">松开结束</span>
                  </>
                ) : (
                  <>
                    <Mic size={18} />
                    <span className="font-bold text-sm">按住说话</span>
                  </>
                )}
              </button>
              <button type="submit" className={`flex-1 bg-black text-white py-3.5 rounded-2xl font-black text-lg shadow-xl transition-all duration-300 flex items-center justify-center gap-2 ${isSavingRecord ? 'scale-105' : 'active:scale-95'}`}>
                <Check size={20} strokeWidth={3} /> 保存记录
              </button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">分类明细</label>
            <div className="overflow-y-auto pr-1 space-y-3 hide-scrollbar pb-2">
              {type === 'expense' ? (
                <div className="grid grid-cols-5 gap-y-3 gap-x-1 pt-1">
                  {allExpenseCategories.map(item => (
                    <button key={item.label} type="button" onClick={() => setCategory(item.label)} className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all ${category === item.label ? 'bg-white shadow-lg scale-110 z-10' : 'opacity-60'}`}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: item.color }}>
                        {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18, color: 'white', strokeWidth: 2.5 })}
                      </div>
                      <span className="text-[10px] font-black text-black leading-tight h-4 flex items-center text-center scale-90">{item.displayLabel}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-1 pt-1">
                  <button type="button" onClick={() => setCategory('收入')} className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-all ${category === '收入' ? 'bg-white shadow-lg scale-110 z-10' : 'opacity-60'}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: INCOME_CATEGORY.color }}>
                      {React.cloneElement(INCOME_CATEGORY.icon as React.ReactElement<any>, { size: 18, color: 'white', strokeWidth: 2.5 })}
                    </div>
                    <span className="text-[10px] font-black text-black scale-90">收入进账</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const ChevronDown = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

export default Home;
