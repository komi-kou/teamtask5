import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import SocketService from '../services/socket';
import { LocalStorage } from '../utils/storage';

interface UseDataSyncOptions {
  storageKey: string;
  defaultValue?: any;
  onDataUpdate?: (data: any) => void;
}

export const useDataSync = <T = any>({ 
  storageKey, 
  defaultValue = [], 
  onDataUpdate 
}: UseDataSyncOptions) => {
  const { user, isAuthenticated } = useAuth();
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // サーバーからデータを取得
  const loadFromServer = async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const response = await ApiService.getData(storageKey);
      
      if (response.data) {
        setData(response.data);
        // LocalStorageにキャッシュとして保存
        LocalStorage.set(storageKey, response.data);
        onDataUpdate?.(response.data);
      }
    } catch (err) {
      console.error('サーバーからのデータ取得エラー:', err);
      setError('データの取得に失敗しました');
      
      // エラー時はローカルストレージから読み込み
      const cachedData = LocalStorage.get<T>(storageKey);
      if (cachedData) {
        setData(cachedData);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // サーバーにデータを保存
  const saveToServer = async (newData: T) => {
    if (!isAuthenticated) {
      // 非認証時はローカルストレージのみ更新
      setData(newData);
      LocalStorage.set(storageKey, newData);
      return;
    }

    try {
      setData(newData);
      LocalStorage.set(storageKey, newData);
      await ApiService.saveData(storageKey, newData);
      
      // Socket.ioで他のクライアントに通知
      if (user?.teamId) {
        SocketService.emit('data-update', {
          teamId: user.teamId,
          dataType: storageKey,
          data: newData,
          userId: user.id
        });
      }
    } catch (err) {
      console.error('サーバーへのデータ保存エラー:', err);
      setError('データの保存に失敗しました');
    }
  };

  // リアルタイム更新の処理
  useEffect(() => {
    if (isAuthenticated && user?.teamId) {
      // サーバーからデータを取得
      loadFromServer();
      
      // Socket.io接続
      SocketService.connect(user.teamId);
      
      // リアルタイム更新のリスナーを設定
      const handleDataUpdate = (updateData: any) => {
        const { dataType, data: newData } = updateData;
        
        if (dataType === storageKey) {
          setData(newData);
          LocalStorage.set(storageKey, newData);
          onDataUpdate?.(newData);
        }
      };
      
      SocketService.on('dataUpdated', handleDataUpdate);
      
      return () => {
        SocketService.off('dataUpdated', handleDataUpdate);
      };
    } else {
      // 非認証時はローカルストレージから読み込み
      const cachedData = LocalStorage.get<T>(storageKey);
      if (cachedData) {
        setData(cachedData);
      }
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.teamId, storageKey]);

  // 手動リフレッシュ
  const refresh = async () => {
    await loadFromServer();
  };

  return {
    data,
    isLoading,
    error,
    setData: saveToServer,
    refresh
  };
};