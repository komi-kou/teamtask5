import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Tasks from './pages/Tasks';
import Sales from './pages/Sales';
import Projects from './pages/Projects';
import SalesEmails from './pages/SalesEmails';
import ServiceMaterials from './pages/ServiceMaterials';
import './App.css';

// 認証が必要なページを保護するコンポーネント
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>読み込み中...</p>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// メインアプリケーションコンポーネント
const AppContent: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();

  // ログイン画面の場合はサイドバーを表示しない
  if (!isAuthenticated) {
    return (
      <div className="app">
        <div className="main-content full-width">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="logo-section">
          <h1 className="logo">TeamHub</h1>
          {user && (
            <div className="user-info">
              <p className="user-name">{user.username}</p>
              {user.teamName && <p className="team-name">{user.teamName}</p>}
            </div>
          )}
        </div>
               <ul className="nav-menu">
                 <li><Link to="/">📊 全体ダッシュボード</Link></li>
                 <li><Link to="/sales">👥 顧客管理</Link></li>
                 <li><Link to="/projects">📋 案件管理</Link></li>
                 <li><Link to="/tasks">✅ タスク管理</Link></li>
                 <li><Link to="/documents">📝 議事録・打ち合わせ</Link></li>
                 <li><Link to="/sales-emails">📧 営業メール</Link></li>
                 <li><Link to="/service-materials">📚 サービス資料</Link></li>
               </ul>
        {user && (
          <div className="logout-section">
            <button className="logout-button" onClick={logout}>
              ログアウト
            </button>
          </div>
        )}
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/sales-emails" element={<SalesEmails />} />
          <Route path="/service-materials" element={<ServiceMaterials />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
