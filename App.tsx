
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { PlusCircle, Calendar, List, Wallet } from 'lucide-react';
import Home from './pages/Home';
import CalendarPage from './pages/CalendarPage';
import Details from './pages/Details';
import { Transaction, Diary } from './types';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('sman_transactions_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [diaries, setDiaries] = useState<Diary[]>(() => {
    const saved = localStorage.getItem('sman_diaries_v2');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('sman_transactions_v2', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('sman_diaries_v2', JSON.stringify(diaries));
  }, [diaries]);

  const addTransaction = (t: Transaction) => {
    setTransactions(prev => [t, ...prev]);
  };

  const handleImportAll = (newTs: Transaction[], newDiaries: Diary[]) => {
    setTransactions(prev => [...newTs, ...prev]);
    setDiaries(prev => {
      const merged = [...prev];
      newDiaries.forEach(nd => {
        const existingIdx = merged.findIndex(d => d.date === nd.date);
        if (existingIdx > -1) {
          merged[existingIdx] = nd;
        } else {
          merged.push(nd);
        }
      });
      return merged;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const saveDiary = (date: string, content: string) => {
    setDiaries(prev => {
      const filtered = prev.filter(d => d.date !== date);
      return content.trim() ? [...filtered, { date, content }] : filtered;
    });
  };

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen max-w-md mx-auto bg-[#EBE7E0] shadow-2xl overflow-hidden relative border-x border-slate-200">
        
        {/* 顶部 Header + 导航区域 */}
        <header className="sticky top-0 z-30 bg-[#EBE7E0]/95 backdrop-blur-sm px-4 pt-4 pb-2">
          <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <div className="bg-black p-1.5 rounded-xl">
                  <Wallet size={16} className="text-white" />
                </div>
                <h1 className="text-lg font-extrabold tracking-tight text-black">sman随记语音版2.0</h1>
              </div>
            </div>
            
            {/* 导航栏整合在 Header 内部 */}
            <div className="bg-slate-50 rounded-xl p-1 flex justify-around items-center">
              <NavLink to="/" icon={<PlusCircle />} label="记一笔" />
              <NavLink to="/calendar" icon={<Calendar />} label="日历" />
              <NavLink to="/details" icon={<List />} label="明细" />
            </div>
          </div>
        </header>

        {/* 主内容区域，移除了底部的 padding */}
        <main className="flex-1 overflow-y-auto pb-6 px-4 hide-scrollbar">
          <Routes>
            <Route path="/" element={
              <Home 
                transactions={transactions} 
                diaries={diaries}
                onAdd={addTransaction} 
                onImportAll={handleImportAll}
                onSaveDiary={saveDiary}
              />
            } />
            <Route path="/calendar" element={<CalendarPage transactions={transactions} diaries={diaries} onSaveDiary={saveDiary} />} />
            <Route path="/details" element={
              <Details 
                transactions={transactions} 
                onDelete={deleteTransaction} 
                diaries={diaries} 
                onSaveDiary={saveDiary}
              />
            } />
          </Routes>
        </main>

        {/* 底部导航栏已移除 */}
      </div>
    </HashRouter>
  );
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to === '/details' && location.pathname.startsWith('/details'));
  return (
    <Link 
      to={to} 
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-white text-black shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
    >
      {React.cloneElement(icon as React.ReactElement<any>, { size: 16, strokeWidth: isActive ? 2.5 : 2 })}
      <span className={`text-xs font-black ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </Link>
  );
};

export default App;
