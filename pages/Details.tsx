
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trash2, Filter, BookOpen, ChevronDown, List as ListIcon, Calendar as CalendarIcon, Save, PieChart as PieChartIcon } from 'lucide-react';
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
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');

  useEffect(() => {
    const dParam = searchParams.get('date');
    if (dParam) { 
      setSelDay(dParam); 
      setMode('day'); 
    }
  }, [searchParams]);

  const filteredDiaries = useMemo(() => {
    switch (mode) {
      case 'day': return diaries.filter(d => d.date === selDay);
      case 'month': return diaries.filter(d => d.date.startsWith(selMonth)).sort((a, b) => b.date.localeCompare(a.date));
      case 'year': return diaries.filter(d => d.date.startsWith(selYear)).sort((a, b) => b.date.localeCompare(a.date));
      default: return [...diaries].sort((a, b) => b.date.localeCompare(a.date));
    }
  }, [diaries, mode, selDay, selMonth, selYear]);

  const filteredTransactions = useMemo(() => {
    switch (mode) {
      case 'day': return transactions.filter(t => t.date === selDay);
      case 'month': return transactions.filter(t => t.date.startsWith(selMonth));
      case 'year': return transactions.filter(t => t.date.startsWith(selYear));
      default: return transactions;
    }
  }, [transactions, mode, selDay, selMonth, selYear]);

  const stats = useMemo(() => {
    const inc = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { inc, exp, bal: inc - exp };
  }, [filteredTransactions]);

  const allCats = useMemo(() => {
    const items: CategoryItem[] = [];
    CATEGORY_GROUPS.forEach(g => items.push(...g.items));
    items.push(INCOME_CATEGORY);
    return items;
  }, []);

  // 计算筛选时间段内的图表数据
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
      // Fix: Explicitly cast to number for subtraction to avoid TS arithmetic error
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

  return (
    <div className="space-y-6 pb-6 animate-in slide-in-from-bottom-2 duration-400">
      {/* 筛选卡片 */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] mb-8 shadow-inner">
          {(['day', 'month', 'year', 'all'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setEditingDate(null); }} className={`flex-1 py-3 rounded-[1rem] text-xs font-black uppercase tracking-tighter transition-all ${mode === m ? 'bg-black text-white shadow-lg scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
              {m === 'day' ? '日' : m === 'month' ? '月' : m === 'year' ? '年' : '全部'}
            </button>
          ))}
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <CalendarIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
            {mode === 'day' && <input type="date" value={selDay} onChange={e => setSelDay(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] outline-none font-black text-sm shadow-sm text-black" />}
            {mode === 'month' && <input type="month" value={selMonth} onChange={e => setSelMonth(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] outline-none font-black text-sm shadow-sm text-black" />}
            {mode === 'year' && (
              <select value={selYear} onChange={e => setSelYear(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.2rem] outline-none font-black text-sm appearance-none shadow-sm text-black">
                {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}年</option>)}
              </select>
            )}
            {mode === 'all' && <div className="w-full pl-11 pr-4 py-4 bg-slate-100 border border-slate-100 rounded-[1.2rem] font-black text-sm text-slate-400 italic">查看历史所有记录</div>}
          </div>
          {mode !== 'all' && <div className="p-4 bg-black/5 rounded-[1.2rem] text-black shadow-sm flex items-center"><Filter size={20} /></div>}
        </div>
      </div>

      {/* 数据概览卡片 */}
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

      {/* 联动图表卡片 */}
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

      {/* 期间日记汇总 */}
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
            <p className="text-xs font-black text-slate-300 uppercase tracking-widest">这段时间内没有写过日记</p>
          </div>
        )}
      </div>

      {/* 明细表 */}
      <div className="space-y-4 px-1 pt-4">
        <div className="flex justify-between items-end px-3">
          <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2 text-black">收支详细明细表 <ChevronDown size={14} /></h3>
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
                  <p className="text-xs font-bold text-black truncate max-w-[160px]">{t.note || '暂无备注内容'}</p>
                  <p className="text-[10px] font-black text-slate-200">{t.date}</p>
                </div>
              </div>
              <button onClick={() => onDelete(t.id)} className="p-3 text-slate-100 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button>
            </div>
          );
        }) : (
          <div className="py-24 text-center flex flex-col items-center gap-6 opacity-20 grayscale">
            <div className="p-8 bg-slate-100 rounded-[3rem] shadow-inner"><ListIcon size={64} className="text-black" /></div>
            <p className="text-sm font-black tracking-widest text-black">记录列表空空如也</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Details;
