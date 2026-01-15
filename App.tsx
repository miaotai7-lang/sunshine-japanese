
import React from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Learning from './pages/Learning';
import Practice from './pages/Practice';
import Collection from './pages/Collection';
import Songs from './pages/Songs';
import ArticleDetail from './pages/ArticleDetail';
import Bible from './pages/Bible';
import BibleDetail from './pages/BibleDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 md:pl-20">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-indigo-600 tracking-tight">Komorebi</h1>
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
              <i className="fa-solid fa-user text-indigo-600 text-sm"></i>
            </div>
          </div>
        </header>

        <Sidebar />

        <main className="flex-1 container mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/learning" element={<Learning />} />
            <Route path="/learning/:id" element={<ArticleDetail />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/collection" element={<Collection />} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/bible" element={<Bible />} />
            <Route path="/bible/:id" element={<BibleDetail />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </HashRouter>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/', icon: 'fa-house', label: 'ホーム' },
    { path: '/learning', icon: 'fa-book-open', label: '学習' },
    { path: '/bible', icon: 'fa-dove', label: '聖書' },
    { path: '/practice', icon: 'fa-pencil', label: '練習' },
    { path: '/collection', icon: 'fa-star', label: '收藏' },
    { path: '/songs', icon: 'fa-music', label: '歌' },
  ];

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 bg-white border-r border-slate-200 flex-col items-center py-8 z-50">
      <div className="mb-12 text-indigo-600">
        <i className="fa-solid fa-seedling text-3xl"></i>
      </div>
      <nav className="flex flex-col gap-8">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-colors ${
              isActive(item.path) ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <i className={`fa-solid ${item.icon} text-xl`}></i>
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

const BottomNav: React.FC = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navItems = [
    { path: '/', icon: 'fa-house', label: '首页' },
    { path: '/learning', icon: 'fa-book-open', label: '学习' },
    { path: '/bible', icon: 'fa-dove', label: '圣经' },
    { path: '/practice', icon: 'fa-pencil', label: '练习' },
    { path: '/collection', icon: 'fa-star', label: '收藏' },
    { path: '/songs', icon: 'fa-music', label: '歌曲' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-1 z-50 shadow-lg">
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 ${
            isActive(item.path) ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <i className={`fa-solid ${item.icon} text-lg`}></i>
          <span className="text-[9px] font-medium">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
};

export default App;
