import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Lock, Users } from 'lucide-react';
import './Login.css';

const Login: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // フォームデータ
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // エラーをクリア
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLoginMode) {
        // ログイン処理
        const result = await login(formData.email, formData.password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message || 'ログインに失敗しました');
        }
      } else {
        // 新規登録処理
        if (formData.password !== formData.confirmPassword) {
          setError('パスワードが一致しません');
          return;
        }
        
        const result = await register(formData.username, formData.email, formData.password);
        if (result.success) {
          navigate('/');
        } else {
          setError(result.message || '新規登録に失敗しました');
        }
      }
    } catch (error) {
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">TeamHub</h1>
          <p className="login-subtitle">チーム管理ツール</p>
        </div>

        <div className="login-tabs">
          <button 
            className={`tab-button ${isLoginMode ? 'active' : ''}`}
            onClick={() => setIsLoginMode(true)}
          >
            ログイン
          </button>
          <button 
            className={`tab-button ${!isLoginMode ? 'active' : ''}`}
            onClick={() => setIsLoginMode(false)}
          >
            新規登録
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {isLoginMode ? (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={16} />
                パスワード
              </label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username">
                <User size={16} />
                ユーザー名
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                placeholder="ユーザー名を入力"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                メールアドレス
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="your@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <Lock size={16} />
                パスワード
              </label>
              <div className="password-input">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="パスワードを入力"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">
                <Lock size={16} />
                パスワード確認
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                placeholder="パスワードを再入力"
              />
            </div>


            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? '登録中...' : '新規登録'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default Login;
