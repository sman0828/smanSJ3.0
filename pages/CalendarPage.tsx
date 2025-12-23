
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Transaction, Diary } from '../types';
import { CHART_COLORS } from '../constants';

interface CalendarPageProps {
  transactions: Transaction[];
  diaries: Diary[];
  onSaveDiary: (date: string, content: string) => void;
}

// 辅助函数：获取本地日期字符串 YYYY-MM-DD
const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const CalendarPage: React.FC<CalendarPageProps> = ({ transactions, diaries }) => {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStr = currentMonth.toISOString().slice(0, 7);
  
  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    return days;
  }, [currentMonth]);

  const monthSummary = useMemo(() => {
    const relevant = transactions.filter(t => t.date.startsWith(monthStr));
    const inc = relevant.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const exp = relevant.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const grouped = relevant.filter(t => t.type === 'expense').reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
    // Fix: Explicitly cast to number for subtraction to avoid TS arithmetic error
    const chart = Object.entries(grouped).map(([name, value]) => ({ name, value })).sort((a, b) => Number(b.value) - Number(a.value));
    return { inc, exp, chart };
  }, [transactions, monthStr]);

  const getDaySummary = (date: string) => {
    const ts = transactions.filter(t => t.date === date);
    const inc = ts.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const exp = ts.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const hasD = diaries.some(d => d.date === date);
    return { inc, exp, hasD };
  };

  return (
    <div className="space-y-6 pb-6 animate-in slide-in-from-right-1 duration-300">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-black transition-all shadow-sm"><ChevronLeft size={24} /></button>
          <h2 className="text-2xl font-black tracking-tighter text-black">{currentMonth.getFullYear()}年 {currentMonth.getMonth() + 1}月</h2>
          <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-black transition-all shadow-sm"><ChevronRight size={24} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center mb-4">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (<div key={d} className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{d}</div>))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {daysInMonth.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-20"></div>;
            const ds = getLocalDateString(day);
            const sum = getDaySummary(ds);
            const isToday = ds === getLocalDateString(new Date());
            
            return (
              <button 
                key={ds} 
                onClick={() => navigate(`/details?date=${ds}`)} 
                className={`h-20 flex flex-col items-center justify-between p-2 rounded-2xl border transition-all bg-slate-50 border-transparent hover:border-black/10 hover:shadow-lg active:scale-95 ${isToday ? 'ring-2 ring-black/5 ring-offset-2' : ''}`}
              >
                <div className="w-full flex justify-between items-start">
                  <span className={`text-xs font-black ${isToday ? 'text-black underline decoration-2' : 'text-slate-500'}`}>{day.getDate()}</span>
                  {sum.hasD && <BookOpen size={10} className="text-slate-300" />}
                </div>
                <div className="w-full text-[8px] font-black truncate leading-tight space-y-0.5 overflow-hidden">
                  {sum.inc > 0 && <p className="text-green-600">+{sum.inc.toFixed(0)}</p>}
                  {sum.exp > 0 && <p className="text-red-500">-{sum.exp.toFixed(0)}</p>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
        <h3 className="text-xl font-black mb-8 flex items-center gap-2 text-black"><BarChart3 size={20} /> 月度收支概览</h3>
        <div className="grid grid-cols-2 gap-5 mb-10">
          <div className="bg-green-50/50 p-6 rounded-[1.8rem] border border-green-100/50 shadow-sm">
            <p className="text-xs font-black text-green-700/50 uppercase tracking-widest mb-2">本月总收入</p>
            <p className="text-3xl font-black text-green-700 tracking-tighter text-black">¥{monthSummary.inc.toFixed(1)}</p>
          </div>
          <div className="bg-red-50/50 p-6 rounded-[1.8rem] border border-red-100/50 shadow-sm">
            <p className="text-xs font-black text-red-700/50 uppercase tracking-widest mb-2">本月总支出</p>
            <p className="text-3xl font-black text-red-700 tracking-tighter text-black">¥{monthSummary.exp.toFixed(1)}</p>
          </div>
        </div>

        <h3 className="text-sm font-black mb-6 text-slate-400">本月支出分布占比</h3>
        {monthSummary.chart.length > 0 ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={monthSummary.chart} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="value">
                  {monthSummary.chart.map((_, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} strokeWidth={0} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-200 font-black">本月暂无支出记录</div>
        )}
      </div>
    </div>
  );
};

export default CalendarPage;
