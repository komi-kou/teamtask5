import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { STORAGE_KEYS } from '../utils/storage';
import { Plus, Users, Calendar, FileText, CheckCircle, Link, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDataSync } from '../hooks/useDataSync';
import './Dashboard.css';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  status: 'online' | 'offline' | 'away';
  avatar?: string;
}

interface Meeting {
  id: number;
  title: string;
  date: string;
  time: string;
  link?: string;
  attendees: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface Activity {
  id: number;
  type: 'task' | 'document' | 'meeting' | 'sales';
  title: string;
  user: string;
  timestamp: string;
  description?: string;
}

interface SalesRecord {
  month: string;
  sales: number;
  target: number;
}

interface Project {
  id: number;
  status: string;
  isActive: boolean;
  budget: number;
  actualRevenue?: number;
  completedDate?: string;
  startDate: string;
}

const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newSales, setNewSales] = useState({ month: '', sales: 0, target: 0 });
  const [newMember, setNewMember] = useState<{ name: string; role: string; status: 'online' | 'offline' | 'away' }>({ name: '', role: '', status: 'offline' });
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '', link: '', attendees: '' });
  
  const { data: salesData, setData: setSalesData, isLoading: salesLoading } = useDataSync<SalesRecord[]>({
    storageKey: STORAGE_KEYS.SALES_DATA,
    defaultValue: []
  });
  
  const { data: teamMembers, setData: setTeamMembers, isLoading: membersLoading } = useDataSync<TeamMember[]>({
    storageKey: STORAGE_KEYS.TEAM_MEMBERS,
    defaultValue: []
  });
  
  const { data: meetings, setData: setMeetings, isLoading: meetingsLoading } = useDataSync<Meeting[]>({
    storageKey: STORAGE_KEYS.MEETINGS,
    defaultValue: []
  });
  
  const { data: activities, setData: setActivities, isLoading: activitiesLoading } = useDataSync<Activity[]>({
    storageKey: STORAGE_KEYS.ACTIVITIES,
    defaultValue: []
  });
  
  const { data: projects, setData: setProjects, isLoading: projectsLoading } = useDataSync<Project[]>({
    storageKey: STORAGE_KEYS.PROJECTS_DATA,
    defaultValue: []
  });
  
  const { data: tasks, setData: setTasks, isLoading: tasksLoading, error } = useDataSync<any[]>({
    storageKey: STORAGE_KEYS.TASKS_DATA,
    defaultValue: []
  });
  
  const isLoading = salesLoading || membersLoading || meetingsLoading || activitiesLoading || projectsLoading || tasksLoading;

  // Auto-generate sales data from projects if no sales data exists
  useEffect(() => {
    if (projects.length > 0 && salesData.length === 0) {
      const monthlyRevenue = generateMonthlyRevenueFromProjects(projects);
      if (monthlyRevenue.length > 0) {
        setSalesData(monthlyRevenue);
      }
    }
  }, [projects, salesData, setSalesData]);

  // 案件データから月別売上を生成
  const generateMonthlyRevenueFromProjects = (projects: Project[]) => {
    const monthlyData: { [key: string]: number } = {};
    const monthlyTarget: { [key: string]: number } = {};
    
    projects.forEach(project => {
      if (project.status === 'completed' && project.completedDate) {
        const date = new Date(project.completedDate);
        const monthKey = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        const revenue = project.actualRevenue || project.budget;
        
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + revenue;
        monthlyTarget[monthKey] = (monthlyTarget[monthKey] || 0) + project.budget;
      }
    });
    
    return Object.keys(monthlyData).map(month => ({
      month,
      sales: monthlyData[month],
      target: monthlyTarget[month]
    })).sort((a, b) => {
      const dateA = new Date(a.month.replace(/年/g, '-').replace(/月/g, ''));
      const dateB = new Date(b.month.replace(/年/g, '-').replace(/月/g, ''));
      return dateA.getTime() - dateB.getTime();
    });
  };

  const addSalesData = () => {
    if (newSales.month && newSales.sales > 0) {
      const updatedSales = [...salesData, newSales];
      setSalesData(updatedSales);
      
      setNewSales({ month: '', sales: 0, target: 0 });
      setShowSalesModal(false);
      
      // アクティビティに追加
      const activity: Activity = {
        id: Date.now(),
        type: 'sales',
        title: `${newSales.month}の売上データを追加`,
        user: user?.username || 'システム',
        timestamp: new Date().toLocaleString('ja-JP'),
        description: `売上: ¥${newSales.sales.toLocaleString()}`
      };
      const updatedActivities = [activity, ...activities.slice(0, 9)];
      setActivities(updatedActivities);
    }
  };

  const addTeamMember = () => {
    if (editingMember) {
      // 編集モード
      const updatedMembers = teamMembers.map(m => 
        m.id === editingMember.id 
          ? { ...editingMember, name: newMember.name, role: newMember.role, status: newMember.status }
          : m
      );
      setTeamMembers(updatedMembers);
      
      // サーバーに保存
      saveDataToServer(STORAGE_KEYS.TEAM_MEMBERS, updatedMembers);
      
      // アクティビティに追加
      const activity: Activity = {
        id: Date.now(),
        type: 'task',
        title: `チームメンバー「${newMember.name}」を更新`,
        user: user?.username || 'システム',
        timestamp: new Date().toLocaleString('ja-JP'),
        description: `役職: ${newMember.role}`
      };
      const updatedActivities = [activity, ...activities.slice(0, 9)];
      setActivities(updatedActivities);
      
      // アクティビティもサーバーに保存
      saveDataToServer(STORAGE_KEYS.ACTIVITIES, updatedActivities);
      
      setEditingMember(null);
    } else {
      // 新規追加モード
      if (newMember.name && newMember.role) {
        const member: TeamMember = {
          id: Date.now(),
          name: newMember.name,
          role: newMember.role,
          status: newMember.status
        };
        const updatedMembers = [...teamMembers, member];
        setTeamMembers(updatedMembers);
        LocalStorage.set(STORAGE_KEYS.TEAM_MEMBERS, updatedMembers);
        
        // サーバーに保存
        saveDataToServer(STORAGE_KEYS.TEAM_MEMBERS, updatedMembers);
        
        // アクティビティに追加
        const activity: Activity = {
          id: Date.now(),
          type: 'task',
          title: `チームメンバー「${member.name}」を追加`,
          user: user?.username || 'システム',
          timestamp: new Date().toLocaleString('ja-JP'),
          description: `役職: ${member.role}`
        };
        const updatedActivities = [activity, ...activities.slice(0, 9)];
        setActivities(updatedActivities);
        LocalStorage.set(STORAGE_KEYS.ACTIVITIES, updatedActivities);
        
        // アクティビティもサーバーに保存
        saveDataToServer(STORAGE_KEYS.ACTIVITIES, updatedActivities);
      }
    }
    
    setNewMember({ name: '', role: '', status: 'offline' });
    setShowMemberModal(false);
  };

  const editMember = (member: TeamMember) => {
    setEditingMember(member);
    setNewMember({
      name: member.name,
      role: member.role,
      status: member.status
    });
    setShowMemberModal(true);
  };

  const deleteMember = (memberId: number) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member && window.confirm(`${member.name}を削除してもよろしいですか？`)) {
      const updatedMembers = teamMembers.filter(m => m.id !== memberId);
      setTeamMembers(updatedMembers);
      
      // アクティビティに追加
      const activity: Activity = {
        id: Date.now(),
        type: 'task',
        title: `チームメンバー「${member.name}」を削除`,
        user: 'システム',
        timestamp: new Date().toLocaleString('ja-JP')
      };
      const updatedActivities = [activity, ...activities.slice(0, 9)];
      setActivities(updatedActivities);
    }
  };

  const addMeeting = () => {
    if (newMeeting.title && newMeeting.date && newMeeting.time) {
      const meeting: Meeting = {
        id: Date.now(),
        title: newMeeting.title,
        date: newMeeting.date,
        time: newMeeting.time,
        link: newMeeting.link,
        attendees: newMeeting.attendees.split(',').map(name => name.trim()),
        status: 'scheduled'
      };
      const updatedMeetings = [...meetings, meeting];
      setMeetings(updatedMeetings);
      setNewMeeting({ title: '', date: '', time: '', link: '', attendees: '' });
      setShowMeetingModal(false);
      
      // アクティビティに追加
      const activity: Activity = {
        id: Date.now(),
        type: 'meeting',
        title: `会議「${newMeeting.title}」をスケジュール`,
        user: 'システム',
        timestamp: new Date().toLocaleString('ja-JP'),
        description: `${newMeeting.date} ${newMeeting.time}`
      };
      const updatedActivities = [activity, ...activities.slice(0, 9)];
      setActivities(updatedActivities);
    }
  };

  // 実際のデータに基づく計算（案件データから自動集計）
  const now = new Date();
  const currentMonthProjects = projects.filter(p => {
    if (p.status === 'completed' && p.completedDate) {
      const date = new Date(p.completedDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return false;
  });
  
  const currentMonthSales = currentMonthProjects.reduce((sum, p) => sum + (p.actualRevenue || p.budget), 0);
  
  const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1);
  const previousMonthProjects = projects.filter(p => {
    if (p.status === 'completed' && p.completedDate) {
      const date = new Date(p.completedDate);
      return date.getMonth() === previousMonth.getMonth() && date.getFullYear() === previousMonth.getFullYear();
    }
    return false;
  });
  const previousMonthSales = previousMonthProjects.reduce((sum, p) => sum + (p.actualRevenue || p.budget), 0);
  const salesGrowth = previousMonthSales > 0 ? ((currentMonthSales - previousMonthSales) / previousMonthSales * 100) : 0;
  
  // タスクデータから実際の数を取得
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((task: any) => task.status === 'in-progress' || task.status === 'on-hold').length;
  const completedTasks = tasks.filter((task: any) => task.status === 'completed').length;
  
  const thisWeekMeetings = meetings.filter(m => {
    const meetingDate = new Date(m.date);
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return meetingDate >= weekAgo && meetingDate <= now;
  }).length;
  
  const completedMeetings = meetings.filter(m => m.status === 'completed').length;
  
  const onlineMembers = teamMembers.filter(m => m.status === 'online').length;

  if (isLoading) {
    return (
      <div className="dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="error-container">
          <p>エラーが発生しました: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 全体ダッシュボード</h1>
        <p className="dashboard-subtitle">チーム全体の統計と進捗状況</p>
        <div className="dashboard-actions">
          <button className="action-btn" onClick={() => setShowMemberModal(true)}>
            <Users size={16} /> メンバー追加
          </button>
          <button className="action-btn" onClick={() => setShowMeetingModal(true)}>
            <Calendar size={16} /> 会議追加
          </button>
        </div>
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>今月の成約金額</h3>
          <p className="stat-value">¥{currentMonthSales.toLocaleString()}</p>
          <p className={`stat-change ${salesGrowth >= 0 ? 'positive' : 'negative'}`}>
            {salesGrowth >= 0 ? '+' : ''}{salesGrowth.toFixed(1)}% 前月比
          </p>
          <p className="stat-hint">※案件管理から自動集計</p>
        </div>
        <div className="stat-card">
          <h3>タスク状況</h3>
          <p className="stat-value">{totalTasks}件</p>
          <p className="stat-detail">進行中: {activeTasks}件 / 完了: {completedTasks}件</p>
        </div>
        <div className="stat-card">
          <h3>今週の会議</h3>
          <p className="stat-value">{thisWeekMeetings}</p>
          <p className="stat-detail">完了: {completedMeetings}件</p>
        </div>
        <div className="stat-card">
          <h3>チームメンバー</h3>
          <p className="stat-value">{teamMembers.length}名</p>
          <p className="stat-detail">全メンバー数</p>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-card">
          <h3>売上推移</h3>
          {salesData.length > 0 || projects.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `¥${(value / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3F51B5" name="実績" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#FF5722" name="目標" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <p>売上データがありません</p>
              <p>「案件管理」で完了した案件のデータが自動で表示されます</p>
            </div>
          )}
        </div>

            <div className="chart-card">
              <h3>チームメンバー一覧</h3>
              {teamMembers.length > 0 ? (
                <div className="team-members-list">
                  {teamMembers.map(member => (
                    <div key={member.id} className="member-item">
                      <div className="member-info">
                        <div className="member-details">
                          <h4>{member.name}</h4>
                          <p>{member.role}</p>
                          <span className={`status-badge ${member.status}`}>
                            {member.status === 'online' ? 'オンライン' : 
                             member.status === 'away' ? '離席中' : 'オフライン'}
                          </span>
                        </div>
                        <div className="member-actions">
                          <button 
                            className="edit-btn" 
                            onClick={() => editMember(member)}
                            title="編集"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="delete-btn" 
                            onClick={() => deleteMember(member.id)}
                            title="削除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-data">
                  <p>チームメンバーが登録されていません</p>
                  <p>「メンバー追加」ボタンからメンバーを追加してください</p>
                </div>
              )}
            </div>

        <div className="chart-card full-width">
          <h3>今週の会議スケジュール</h3>
          {meetings.length > 0 ? (
            <div className="meetings-list">
              {meetings.slice(0, 5).map(meeting => (
                <div key={meeting.id} className="meeting-item">
                  <div className="meeting-info">
                    <h4>{meeting.title}</h4>
                    <p>{meeting.date} {meeting.time}</p>
                    <p>参加者: {meeting.attendees.join(', ')}</p>
                  </div>
                  {meeting.link && (
                    <a href={meeting.link} target="_blank" rel="noopener noreferrer" className="meeting-link">
                      <Link size={16} /> 会議に参加
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-data">
              <p>会議がスケジュールされていません</p>
              <p>「会議追加」ボタンから会議をスケジュールしてください</p>
            </div>
          )}
        </div>
      </div>

      <div className="recent-activities">
        <h3>最近のアクティビティ</h3>
        <ul>
          {activities.length > 0 ? (
            activities.slice(0, 5).map(activity => (
              <li key={activity.id}>
                <span className="activity-time">{activity.timestamp}</span>
                <span className="activity-text">{activity.title}</span>
                {activity.description && (
                  <span className="activity-description">{activity.description}</span>
                )}
              </li>
            ))
          ) : (
            <li>
              <span className="activity-text">まだアクティビティがありません</span>
              <span className="activity-description">データを追加すると、ここに表示されます</span>
            </li>
          )}
        </ul>
      </div>

      {showSalesModal && (
        <div className="modal-overlay" onClick={() => setShowSalesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>売上データを追加</h2>
            <div className="form-group">
              <label>月</label>
              <input
                type="text"
                placeholder="例: 7月"
                value={newSales.month}
                onChange={(e) => setNewSales({ ...newSales, month: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>売上金額</label>
              <input
                type="number"
                placeholder="金額を入力"
                value={newSales.sales}
                onChange={(e) => setNewSales({ ...newSales, sales: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>目標金額</label>
              <input
                type="number"
                placeholder="目標金額を入力"
                value={newSales.target}
                onChange={(e) => setNewSales({ ...newSales, target: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowSalesModal(false)}>キャンセル</button>
              <button className="save-btn" onClick={addSalesData}>保存</button>
            </div>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="modal-overlay" onClick={() => {
          setShowMemberModal(false);
          setEditingMember(null);
          setNewMember({ name: '', role: '', status: 'offline' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingMember ? 'チームメンバーを編集' : 'チームメンバーを追加'}</h2>
            <div className="form-group">
              <label>名前</label>
              <input
                type="text"
                placeholder="例: 田中太郎"
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>役職</label>
              <input
                type="text"
                placeholder="例: 営業部長"
                value={newMember.role}
                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>ステータス</label>
              <select
                value={newMember.status}
                onChange={(e) => setNewMember({ ...newMember, status: e.target.value as 'online' | 'offline' | 'away' })}
              >
                <option value="offline">オフライン</option>
                <option value="online">オンライン</option>
                <option value="away">離席中</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => {
                setShowMemberModal(false);
                setEditingMember(null);
                setNewMember({ name: '', role: '', status: 'offline' });
              }}>キャンセル</button>
              <button className="save-btn" onClick={addTeamMember}>
                {editingMember ? '更新' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMeetingModal && (
        <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>会議をスケジュール</h2>
            <div className="form-group">
              <label>会議名</label>
              <input
                type="text"
                placeholder="例: 週次定例会議"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>日付</label>
                <input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>時間</label>
                <input
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>会議リンク（Zoom、Teams等）</label>
              <input
                type="url"
                placeholder="https://zoom.us/j/..."
                value={newMeeting.link}
                onChange={(e) => setNewMeeting({ ...newMeeting, link: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>参加者（カンマ区切り）</label>
              <input
                type="text"
                placeholder="例: 田中太郎, 山田花子, 佐藤次郎"
                value={newMeeting.attendees}
                onChange={(e) => setNewMeeting({ ...newMeeting, attendees: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowMeetingModal(false)}>キャンセル</button>
              <button className="save-btn" onClick={addMeeting}>スケジュール</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;