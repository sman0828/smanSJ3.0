
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trash2, BookOpen, ChevronDown, List as ListIcon, Calendar as CalendarIcon, Save, PieChart as PieChartIcon, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction, Diary } from '../types';
import { CATEGORY_GROUPS, INCOME_CATEGORY, CategoryItem, CHART_COLORS } from '../constants';

interface DetailsProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  diaries: Diary[];
  onSaveDiary: (date: string, content: string) => void;
}

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const Details: React.FC<DetailsProps> = ({ transactions, onDelete, diaries, onSaveDiary }) => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [selDay, setSelDay] = useState(getLocalDateString(new Date()));
  const [selMonth, setSelMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selYear, setSelYear] = useState(new Date().getFullYear().toString());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  
  // 日历与选择器逻辑
  const [showPicker, setShowPicker] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dParam = searchParams.get('date');
    if (dParam) { 
      setSelDay(dParam); 
      setMode('day'); 
    }
  }, [searchParams]);

  const allCats = useMemo(() => {
    const items: CategoryItem[] = [];
    CATEGORY_GROUPS.forEach(g => items.push(...g.items));
    items.push(INCOME_CATEGORY);
    return items;
  }, []);

  const filteredTransactions = useMemo(() => {
    let base = [];
    switch (mode) {
      case 'day': base = transactions.filter(t => t.date === selDay); break;
      case 'month': base = transactions.filter(t => t.date.startsWith(selMonth)); break;
      case 'year': base = transactions.filter(t => t.date.startsWith(selYear)); break;
      default: base = transactions;
    }

    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase();
    return base.filter(t => {
      const cat = allCats.find(c => c.label === t.category);
      const catName = (cat?.displayLabel || t.category).toLowerCase();
      const note = t.note.toLowerCase();
      const amount = t.amount.toString();
      return catName.includes(q) || note.includes(q) || amount.includes(q);
    });
  }, [transactions, mode, selDay, selMonth, selYear, searchQuery, allCats]);

  const filteredDiaries = useMemo(() => {
    let base = [];
    switch (mode) {
      case 'day': base = diaries.filter(d => d.date === selDay); break;
      case 'month': base = diaries.filter(d => d.date.startsWith(selMonth)); break;
      case 'year': base = diaries.filter(d => d.date.startsWith(selYear)); break;
      default: base = [...diaries];
    }
    
    base.sort((a, b) => b.date.localeCompare(a.date));

    if (!searchQuery.trim()) return base;

    const q = searchQuery.toLowerCase();
    return base.filter(d => d.content.toLowerCase().includes(q));
  }, [diaries, mode, selDay, selMonth, selYear, searchQuery]);

  const stats = useMemo(() => {
    const inc = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'expense');
    const grouped = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(grouped)
      .map(([name, value]) => ({ 
        name: allCats.find(i => i.label === name)?.displayLabel || name, 
        value 
      }))
      .sort((a, b) => Number(b.value) - Number(a.value));
  }, [filteredTransactions, allCats]);

  const handleStartEdit = (diary: Diary) => {
    setEditingDate(diary.date);
    setEditInput(diary.content);
  };

  const handleSaveEdit = () => {
    if (editingDate) {
      onSaveDiary(editingDate, editInput);
      setEditingDate(null);
    }
  };

  const focusSearch = () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const years = useMemo(() => {
    const currentViewYear = viewDate.getFullYear();
    return Array.from({ length: 12 }, (_, i) => currentViewYear - 11 + i).reverse();
  }, [viewDate]);

  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  return (
    <div className="space-y-6 pb-6 animate-in slide-in-from-bottom-2 duration-400">
      {/* 统一日期/月份/年份选择器弹窗 */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-black">
                {mode === 'day' ? '选择日期' : mode === 'month' ? '选择月份' : '选择年份'}
              </h3>
              <button onClick={() => setShowPicker(false)} className="p-2 text-black hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>

            {mode === 'day' && (
              <>
                <div className="flex justify-between items-center mb-4 text-black">
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft size={20} /></button>
                  <span className="font-extrabold text-base">{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {daysInMonth.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-10"></div>;
                    const dateStr = getLocalDateString(day);
                    const isSelected = selDay === dateStr;
                    return (
                      <button key={dateStr} onClick={() => { setSelDay(dateStr); setShowPicker(false); }} className={`h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-black text-white shadow-lg' : 'hover:bg-slate-50 text-slate-700'}`}>
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {mode === 'month' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 text-black">
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear() - 1, 0, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft size={20} /></button>
                  <span className="font-extrabold text-base">{viewDate.getFullYear()}年</span>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear() + 1, 0, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {months.map(m => {
                    const currentSel = `${viewDate.getFullYear()}-${m}`;
                    const isSelected = selMonth === currentSel;
                    return (
                      <button key={m} onClick={() => { setSelMonth(currentSel); setShowPicker(false); }} className={`py-4 rounded-2xl text-sm font-black transition-all ${isSelected ? 'bg-black text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        {parseInt(m)}月
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'year' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2 text-black">
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear() - 12, 0, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft size={20} /></button>
                  <span className="font-extrabold text-base">{years[years.length-1]} - {years[0]}</span>
                  <button onClick={() => setViewDate(new Date(viewDate.getFullYear() + 12, 0, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronRight size={20} /></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {years.map(y => {
                    const isSelected = selYear === y.toString();
                    return (
                      <button key={y} onClick={() => { setSelYear(y.toString()); setShowPicker(false); }} className={`py-5 rounded-2xl text-sm font-black transition-all ${isSelected ? 'bg-black text-white shadow-lg' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                        {y}年
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. 筛选与搜索卡片 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] mb-6 shadow-inner">
          {(['day', 'month', 'year', 'all'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setEditingDate(null); }} className={`flex-1 py-3 rounded-[1rem] text-xs font-black uppercase tracking-tighter transition-all ${mode === m ? 'bg-black text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              {m === 'day' ? '日' : m === 'month' ? '月' : m === 'year' ? '年' : '全部'}
            </button>
          ))}
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
              {mode !== 'all' ? (
                <button 
                  onClick={() => setShowPicker(true)} 
                  className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] outline-none font-black text-sm shadow-sm text-black text-left flex items-center justify-between"
                >
                  <span>
                    {mode === 'day' ? selDay : mode === 'month' ? `${selMonth.split('-')[0]}年 ${parseInt(selMonth.split('-')[1])}月` : `${selYear}年`}
                  </span>
                  <ChevronDown size={14} className="text-slate-300" />
                </button>
              ) : (
                <div className="w-full pl-11 pr-4 py-4 bg-slate-100 border border-slate-100 rounded-[1.2rem] font-black text-sm text-slate-400 italic">查看历史所有记录</div>
              )}
            </div>
            
            <button 
              onClick={focusSearch}
              className="p-4 bg-black text-white rounded-[1.2rem] shadow-lg active:scale-90 transition-all hover:bg-black/90"
            >
              <Search size={20} strokeWidth={2.5} />
            </button>
          </div>

          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-black transition-colors" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="搜索账单备注、分类或日记..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-11 py-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] outline-none font-bold text-sm shadow-inner text-black placeholder:text-slate-300 focus:ring-2 focus:ring-black/10 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 bg-slate-200 text-slate-500 rounded-full hover:bg-slate-300 transition-colors"
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. 期间日记汇总 (保持在数据上方) */}
      <div className="space-y-4 px-1">
        <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 text-black px-3">期间日记汇总</h3>
        {filteredDiaries.length > 0 ? (
          <div className="space-y-4">
            {filteredDiaries.map(diary => (
              <div key={diary.date} className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 relative group animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-slate-400" />
                    <span className="text-xs font-black text-black">{diary.date}</span>
                  </div>
                  {editingDate === diary.date ? (
                    <button onClick={handleSaveEdit} className="p-2 bg-black text-white rounded-xl shadow-lg active:scale-90 transition-all">
                      <Save size={14} />
                    </button>
                  ) : (
                    <button onClick={() => handleStartEdit(diary)} className="text-[10px] font-black text-slate-300 hover:text-black uppercase tracking-widest transition-colors">编辑</button>
                  )}
                </div>
                {editingDate === diary.date ? (
                  <textarea 
                    autoFocus
                    value={editInput}
                    onChange={e => setEditInput(e.target.value)}
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm font-bold text-black focus:ring-2 focus:ring-black outline-none transition-all"
                  />
                ) : (
                  <p className="text-sm font-bold text-black leading-relaxed italic border-l-4 border-slate-200 pl-4 py-1">
                    {diary.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-10 border border-dashed border-slate-200 text-center">
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">
              {searchQuery ? '未找到相关内容' : '期间无日记记录'}
            </p>
          </div>
        )}
      </div>

      {/* 3. 详细账单列表 (上移至数据区顶部) */}
      <div className="space-y-4 px-1 pt-2">
        <div className="flex justify-between items-end px-3">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 text-black">详细账单列表 <ChevronDown size={14} /></h3>
          <span className="text-[10px] font-bold text-slate-300">{filteredTransactions.length} 笔</span>
        </div>
        
        {filteredTransactions.length > 0 ? filteredTransactions.map(t => {
          const cat = allCats.find(i => i.label === t.category);
          return (
            <div key={t.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 active:scale-[0.98] transition-all group">
              <div className="w-14 h-14 rounded-[1.2rem] flex items-center justify-center shrink-0 shadow-sm transition-transform" style={{ backgroundColor: cat?.color || '#94a3b8' }}>
                {cat?.icon ? React.cloneElement(cat.icon as React.ReactElement<any>, { size: 24, color: 'white', strokeWidth: 2.5 }) : <ListIcon size={24} color="white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-extrabold text-black text-base truncate tracking-tight">{cat?.displayLabel || t.category}</h4>
                  <p className={`font-black text-base ${t.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                    {t.type === 'income' ? '+' : '-'}¥{t.amount.toFixed(2)}
                  </p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-black truncate max-w-[160px]">{t.note || '暂无备注'}</p>
                  <p className="text-[10px] font-black text-slate-200">{t.date}</p>
                </div>
              </div>
              <button onClick={() => onDelete(t.id)} className="p-3 text-slate-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
            </div>
          );
        }) : (
          <div className="py-24 text-center flex flex-col items-center gap-6 opacity-20 grayscale bg-white rounded-[2.5rem] border border-slate-100">
            <div className="p-8 bg-slate-100 rounded-[3rem] shadow-inner"><ListIcon size={64} className="text-black" /></div>
            <p className="text-sm font-black tracking-widest text-black">
              {searchQuery ? `未找到匹配项` : '列表为空'}
            </p>
          </div>
        )}
      </div>

      {/* 4. 期间支出占比 (位于详细账单列表下方) */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <h3 className="text-lg font-black text-black mb-6 flex items-center gap-2">
          <PieChartIcon size={20} className="text-slate-400" />
          期间支出占比
        </h3>
        {chartData.length > 0 ? (
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={chartData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={55} 
                  outerRadius={80} 
                  paddingAngle={6} 
                  dataKey="value" 
                  animationBegin={0} 
                  animationDuration={1000}
                >
                  {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontWeight: 'bold' }} 
                />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '20px' }} 
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-0.5">总额</p>
              <p className="text-lg font-black text-black">¥{stats.exp.toFixed(0)}</p>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center opacity-20">
            <PieChartIcon size={40} className="mx-auto mb-3" />
            <p className="text-xs font-black uppercase tracking-widest">暂无支出数据</p>
          </div>
        )}
      </div>

      {/* 5. 收入支出结余 (位于期间支出占比下方) */}
      <div className="grid grid-cols-3 gap-3 px-1">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">收入</p>
          <p className="text-sm font-black text-green-700">¥{stats.inc.toFixed(0)}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">支出</p>
          <p className="text-sm font-black text-red-600">¥{stats.exp.toFixed(0)}</p>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 text-center shadow-sm">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">结余</p>
          <p className="text-sm font-black text-slate-800">¥{stats.bal.toFixed(0)}</p>
        </div>
      </div>
    </div>
  );
};

export default Details;
