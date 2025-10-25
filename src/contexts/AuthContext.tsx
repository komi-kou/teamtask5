import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import ApiService from '../services/api';
import { LocalStorage } from '../utils/storage';

interface User {
  id: string;
  username: string;
  email: string;
  teamId?: string;
  teamName?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 初期化時にトークンをチェック
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('認証初期化開始');
        const token = LocalStorage.get('authToken');
        const savedUser = LocalStorage.get('currentUser');
        
        console.log('保存されたトークン:', token);
        console.log('保存されたユーザー:', savedUser);
        
        if (token && savedUser) {
          // トークンとユーザー情報が存在する場合、状態を設定
          console.log('保存された認証情報を復元');
          setUser(savedUser as User);
          // トークンの有効性を確認
          try {
            console.log('トークン検証開始');
            const response = await ApiService.getCurrentUser();
            console.log('トークン検証成功:', response);
            setUser(response.user);
            LocalStorage.set('currentUser', response.user);
          } catch (error) {
            console.error('トークン検証エラー:', error);
            // トークンが無効な場合はクリア
            setUser(null);
            LocalStorage.remove('authToken');
            LocalStorage.remove('currentUser');
          }
        } else {
          console.log('保存された認証情報なし');
        }
      } catch (error) {
        console.error('認証初期化エラー:', error);
        // エラーの場合はトークンを削除
        LocalStorage.remove('authToken');
        LocalStorage.remove('currentUser');
      } finally {
        console.log('認証初期化完了');
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('ログイン開始:', { email });
      setIsLoading(true);
      const response = await ApiService.login(email, password);
      
      console.log('ログイン応答:', response);
      
      if (response.success && response.token) {
        // ユーザー情報を保存
        const userData = response.user;
        console.log('ユーザーデータ保存:', userData);
        setUser(userData);
        LocalStorage.set('currentUser', userData);
        
        return { success: true };
      } else {
        console.log('ログイン失敗:', response);
        return { success: false, message: response.message || 'ログインに失敗しました' };
      }
    } catch (error: any) {
      console.error('ログインエラー:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'ログインに失敗しました' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('新規登録開始:', { username, email });
      setIsLoading(true);
      const response = await ApiService.register({
        username,
        email,
        password
      });
      
      console.log('新規登録応答:', response);
      
      if (response.success && response.token) {
        // ユーザー情報を保存
        const userData = response.user;
        console.log('ユーザーデータ保存:', userData);
        setUser(userData);
        LocalStorage.set('currentUser', userData);
        
        return { success: true };
      } else {
        console.log('新規登録失敗:', response);
        return { success: false, message: response.message || '新規登録に失敗しました' };
      }
    } catch (error: any) {
      console.error('新規登録エラー:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || '新規登録に失敗しました' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log('ログアウト実行');
    setUser(null);
    LocalStorage.remove('authToken');
    LocalStorage.remove('currentUser');
    ApiService.logout();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
