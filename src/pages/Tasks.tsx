import React, { useState, useEffect } from 'react';
import { Plus, Clock, CheckCircle, AlertCircle, User, Calendar, Link, FileText, Edit2, Trash2 } from 'lucide-react';
import { LocalStorage, STORAGE_KEYS } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import SocketService from '../services/socket';
import './Tasks.css';

interface Task {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: string;
  meetingLink?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'away';
}

const Tasks: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    status: 'pending',
    priority: 'medium',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);

  // データをサーバーから取得
  const loadDataFromServer = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const [tasksResponse, membersResponse] = await Promise.all([
        ApiService.getData(STORAGE_KEYS.TASKS_DATA),
        ApiService.getData(STORAGE_KEYS.TEAM_MEMBERS)
      ]);
      
      // LocalStorageが空の場合のみサーバーのデータを使用
      // これにより、既存のローカルデータを保持しつつ、別ブラウザでもデータが表示される
      if (tasksResponse.data && (!LocalStorage.get(STORAGE_KEYS.TASKS_DATA) || LocalStorage.get(STORAGE_KEYS.TASKS_DATA)?.length === 0)) {
        setTasks(tasksResponse.data);
        LocalStorage.set(STORAGE_KEYS.TASKS_DATA, tasksResponse.data);
      }
      if (membersResponse.data && (!LocalStorage.get(STORAGE_KEYS.TEAM_MEMBERS) || LocalStorage.get(STORAGE_KEYS.TEAM_MEMBERS)?.length === 0)) {
        setTeamMembers(membersResponse.data);
        LocalStorage.set(STORAGE_KEYS.TEAM_MEMBERS, membersResponse.data);
      }
      
    } catch (error) {
      console.error('サーバーからのデータ取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ローカルストレージからデータを読み込み
  const loadDataFromLocal = () => {
    const savedTasks = LocalStorage.get<Task[]>(STORAGE_KEYS.TASKS_DATA);
    const savedMembers = LocalStorage.get<TeamMember[]>(STORAGE_KEYS.TEAM_MEMBERS);
    
    if (savedTasks && savedTasks.length > 0) {
      setTasks(savedTasks);
    }
    if (savedMembers && savedMembers.length > 0) {
      setTeamMembers(savedMembers);
    }
  };

  // データをサーバーに保存
  const saveDataToServer = async (dataType: string, data: any) => {
    if (!isAuthenticated) return;
    
    try {
      await ApiService.saveData(dataType, data);
    } catch (error) {
      console.error('サーバーへのデータ保存エラー:', error);
    }
  };

  useEffect(() => {
    // まずLocalStorageから読み込む
    loadDataFromLocal();
    setIsLoading(false);
    
    if (isAuthenticated) {
      // サーバーからも取得を試みる（バックグラウンド）
      loadDataFromServer();
      
      // Socket.io接続
      if (user?.teamId) {
        SocketService.connect(user.teamId);
        
        // リアルタイム更新のリスナーを設定（他のユーザーの変更のみ適用）
        const handleDataUpdate = (data: any) => {
          const { dataType, data: newData, userId } = data;
          
          // 現在のユーザー自身の変更は無視（LocalStorage優先）
          if (userId === user?.userId) {
            return;
          }
          
          if (dataType === STORAGE_KEYS.TASKS_DATA) {
            setTasks(newData);
          } else if (dataType === STORAGE_KEYS.TEAM_MEMBERS) {
            setTeamMembers(newData);
          }
        };
        
        SocketService.on('dataUpdated', handleDataUpdate);
        
        return () => {
          SocketService.off('dataUpdated', handleDataUpdate);
        };
      }
    }
  }, [isAuthenticated, user?.teamId]);

  const statusColumns = [
    { key: 'pending', label: '未着手', color: '#9E9E9E' },
    { key: 'in-progress', label: '進行中', color: '#FFC107' },
    { key: 'on-hold', label: '保留', color: '#FF9800' },
    { key: 'completed', label: '完了', color: '#4CAF50' }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF5252';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const moveTask = (taskId: number, newStatus: Task['status']) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
    );
    setTasks(updatedTasks);
    LocalStorage.set(STORAGE_KEYS.TASKS_DATA, updatedTasks);
    
    // サーバーに保存
    saveDataToServer(STORAGE_KEYS.TASKS_DATA, updatedTasks);
  };

  const addTask = () => {
    if (newTask.title && newTask.assignee && newTask.dueDate) {
      let updatedTasks;
      
      if (editingTask) {
        // 編集モード
        updatedTasks = tasks.map(task => 
          task.id === editingTask.id 
            ? {
                ...editingTask,
                title: newTask.title,
                description: newTask.description || '',
                status: newTask.status as Task['status'],
                priority: newTask.priority as Task['priority'],
                assignee: newTask.assignee,
                dueDate: newTask.dueDate,
                meetingLink: newTask.meetingLink,
                notes: newTask.notes,
                updatedAt: new Date().toISOString()
              }
            : task
        );
        setEditingTask(null);
      } else {
        // 新規追加モード
        const task: Task = {
          id: Date.now(),
          title: newTask.title,
          description: newTask.description || '',
          status: newTask.status as Task['status'],
          priority: newTask.priority as Task['priority'],
          assignee: newTask.assignee,
          dueDate: newTask.dueDate,
          meetingLink: newTask.meetingLink,
          notes: newTask.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedTasks = [...tasks, task];
      }
      
      setTasks(updatedTasks);
      LocalStorage.set(STORAGE_KEYS.TASKS_DATA, updatedTasks);
      
      // サーバーに保存
      saveDataToServer(STORAGE_KEYS.TASKS_DATA, updatedTasks);
      
      setNewTask({ status: 'pending', priority: 'medium', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      setShowAddTask(false);
    }
  };

  const updateTask = (taskId: number, updates: Partial<Task>) => {
    const updatedTasks = tasks.map(task => 
      task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
    );
    setTasks(updatedTasks);
    LocalStorage.set(STORAGE_KEYS.TASKS_DATA, updatedTasks);
    
    // サーバーに保存
    saveDataToServer(STORAGE_KEYS.TASKS_DATA, updatedTasks);
  };

  const deleteTask = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && window.confirm(`「${task.title}」のタスクを削除してもよろしいですか？`)) {
      const updatedTasks = tasks.filter(task => task.id !== taskId);
      setTasks(updatedTasks);
      LocalStorage.set(STORAGE_KEYS.TASKS_DATA, updatedTasks);
      
      // サーバーに保存
      saveDataToServer(STORAGE_KEYS.TASKS_DATA, updatedTasks);
      
      setShowTaskDetail(null);
    }
  };

  const editTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
      meetingLink: task.meetingLink,
      notes: task.notes,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    });
    setShowAddTask(true);
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>データを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="tasks">
      <div className="tasks-header">
        <h1>タスク管理</h1>
        <button className="add-task-btn" onClick={() => setShowAddTask(true)}>
          <Plus size={20} />
          新規タスク
        </button>
      </div>

      <div className="task-stats">
        <div className="stat-item">
          <CheckCircle size={20} color="#4CAF50" />
          <span>完了: {tasks.filter(t => t.status === 'completed').length}</span>
        </div>
        <div className="stat-item">
          <Clock size={20} color="#FFC107" />
          <span>進行中: {tasks.filter(t => t.status === 'in-progress').length}</span>
        </div>
        <div className="stat-item">
          <AlertCircle size={20} color="#FF5252" />
          <span>高優先度: {tasks.filter(t => t.priority === 'high').length}</span>
        </div>
        <div className="stat-item">
          <User size={20} color="#2196F3" />
          <span>担当者別: {new Set(tasks.map(t => t.assignee)).size}名</span>
        </div>
      </div>

      {tasks.length === 0 && (
        <div className="no-tasks">
          <h3>タスクがありません</h3>
          <p>「新規タスク」ボタンからタスクを追加してください</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="progress-overview">
          <h3>進捗概要</h3>
          <div className="progress-stats">
            <div className="progress-item">
              <div className="progress-circle">
                <div className="progress-text">
                  {Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}%
                </div>
              </div>
              <p>完了率</p>
            </div>
            <div className="progress-item">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100}%` 
                  }}
                ></div>
              </div>
              <p>全体進捗</p>
            </div>
            <div className="progress-item">
              <div className="priority-indicator">
                <div className="priority-high">
                  {tasks.filter(t => t.priority === 'high').length}
                </div>
                <div className="priority-medium">
                  {tasks.filter(t => t.priority === 'medium').length}
                </div>
                <div className="priority-low">
                  {tasks.filter(t => t.priority === 'low').length}
                </div>
              </div>
              <p>優先度別</p>
            </div>
          </div>
        </div>
      )}

      <div className="kanban-board">
        {statusColumns.map(column => (
          <div key={column.key} className="kanban-column">
            <div className="column-header" style={{ borderColor: column.color }}>
              <h3>{column.label}</h3>
              <span className="task-count">
                {tasks.filter(t => t.status === column.key).length}
              </span>
            </div>
            <div className="column-tasks">
              {tasks
                .filter(task => task.status === column.key)
                .map(task => (
                  <div key={task.id} className="task-card" onClick={() => setShowTaskDetail(task)}>
                    <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                      {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                    </div>
                    <h4>{task.title}</h4>
                    <p className="task-description">{task.description}</p>
                    <div className="task-meta">
                      <div className="task-assignee">
                        <User size={14} />
                        <span>{task.assignee}</span>
                      </div>
                      <div className="task-due">
                        <Calendar size={14} />
                        <span>{task.dueDate}</span>
                      </div>
                    </div>
                    {task.meetingLink && (
                      <div className="task-meeting-link">
                        <Link size={14} />
                        <a href={task.meetingLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                          会議リンク
                        </a>
                      </div>
                    )}
                    <div className="task-actions" onClick={(e) => e.stopPropagation()}>
                      {column.key !== 'pending' && (
                        <button onClick={() => moveTask(task.id, 'pending')}>未着手へ</button>
                      )}
                      {column.key !== 'in-progress' && (
                        <button onClick={() => moveTask(task.id, 'in-progress')}>進行中へ</button>
                      )}
                      {column.key !== 'completed' && (
                        <button onClick={() => moveTask(task.id, 'completed')}>完了へ</button>
                      )}
                      <button 
                        className="edit-btn"
                        onClick={() => editTask(task)}
                        title="編集"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => deleteTask(task.id)}
                        title="削除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {showAddTask && (
        <div className="modal-overlay" onClick={() => {
          setShowAddTask(false);
          setEditingTask(null);
          setNewTask({ status: 'pending', priority: 'medium', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTask ? 'タスク編集' : '新規タスク追加'}</h2>
            <div className="form-group">
              <label>タイトル</label>
              <input
                type="text"
                value={newTask.title || ''}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>説明</label>
              <textarea
                value={newTask.description || ''}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>担当者</label>
              <select
                value={newTask.assignee || ''}
                onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
              >
                <option value="">担当者を選択</option>
                {teamMembers.map(member => (
                  <option key={member.id} value={member.name}>{member.name} ({member.role})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>会議リンク（Zoom、Teams等）</label>
              <input
                type="url"
                placeholder="https://zoom.us/j/..."
                value={newTask.meetingLink || ''}
                onChange={(e) => setNewTask({ ...newTask, meetingLink: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>メモ・備考</label>
              <textarea
                value={newTask.notes || ''}
                onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                rows={3}
                placeholder="タスクに関する追加情報や注意事項"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>優先度</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
              <div className="form-group">
                <label>期限</label>
                <input
                  type="date"
                  value={newTask.dueDate || ''}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => {
                setShowAddTask(false);
                setEditingTask(null);
                setNewTask({ status: 'pending', priority: 'medium', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
              }}>キャンセル</button>
              <button className="save-btn" onClick={addTask}>
                {editingTask ? 'タスクを更新' : 'タスクを追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTaskDetail && (
        <div className="modal-overlay" onClick={() => setShowTaskDetail(null)}>
          <div className="modal-content task-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{showTaskDetail.title}</h2>
            <div className="task-detail-content">
              <div className="detail-section">
                <h3>基本情報</h3>
                <p><strong>説明:</strong> {showTaskDetail.description || 'なし'}</p>
                <p><strong>担当者:</strong> {showTaskDetail.assignee}</p>
                <p><strong>期限:</strong> {showTaskDetail.dueDate}</p>
                <p><strong>優先度:</strong> 
                  <span className="priority-badge" style={{ backgroundColor: getPriorityColor(showTaskDetail.priority) }}>
                    {showTaskDetail.priority === 'high' ? '高' : showTaskDetail.priority === 'medium' ? '中' : '低'}
                  </span>
                </p>
                <p><strong>ステータス:</strong> 
                  <span className="status-badge" style={{ backgroundColor: statusColumns.find(col => col.key === showTaskDetail.status)?.color }}>
                    {statusColumns.find(col => col.key === showTaskDetail.status)?.label}
                  </span>
                </p>
              </div>
              
              {showTaskDetail.meetingLink && (
                <div className="detail-section">
                  <h3>会議情報</h3>
                  <p><strong>会議リンク:</strong> 
                    <a href={showTaskDetail.meetingLink} target="_blank" rel="noopener noreferrer">
                      <Link size={16} /> 会議に参加
                    </a>
                  </p>
                </div>
              )}
              
              {showTaskDetail.notes && (
                <div className="detail-section">
                  <h3>メモ・備考</h3>
                  <p>{showTaskDetail.notes}</p>
                </div>
              )}
              
              <div className="detail-section">
                <h3>ステータス変更</h3>
                <div className="status-buttons">
                  {statusColumns.map(column => (
                    <button
                      key={column.key}
                      className={`status-btn ${showTaskDetail.status === column.key ? 'active' : ''}`}
                      onClick={() => {
                        updateTask(showTaskDetail.id, { status: column.key as Task['status'] });
                        setShowTaskDetail({ ...showTaskDetail, status: column.key as Task['status'] });
                      }}
                    >
                      {column.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="edit-btn"
                onClick={() => {
                  editTask(showTaskDetail);
                  setShowTaskDetail(null);
                }}
              >
                編集
              </button>
              <button className="delete-btn" onClick={() => deleteTask(showTaskDetail.id)}>削除</button>
              <button className="cancel-btn" onClick={() => setShowTaskDetail(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks;