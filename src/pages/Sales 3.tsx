import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Download, Plus } from 'lucide-react';
import { LocalStorage, STORAGE_KEYS } from '../utils/storage';
import { DataExporter } from '../utils/export';
import './Sales.css';

interface Lead {
  id: number;
  company: string;
  contact: string;
  contactEmail: string;
  contactPhone: string;
  companyUrl: string;
  status: string;
  value: number;
  probability: number;
  nextAction: string;
  lastContact: string;
  meetingDate?: string;
  meetingLink?: string;
  services: Service[];
  notes: string;
  createdAt: string;
}

interface Service {
  id: number;
  name: string;
  category: 'advertising' | 'lp' | 'design' | 'video' | 'development' | 'consulting' | 'other';
  description: string;
  price: number;
  status: 'proposed' | 'accepted' | 'rejected' | 'in-progress' | 'completed';
  deliveryTime?: string;
}

const Sales: React.FC = () => {
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newLead, setNewLead] = useState<Partial<Lead>>({ 
    probability: 50, 
    services: [], 
    notes: '',
    createdAt: new Date().toISOString()
  });
  const [newService, setNewService] = useState<Partial<Service>>({
    status: 'proposed',
    category: 'other'
  });
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const savedLeads = LocalStorage.get<Lead[]>(STORAGE_KEYS.LEADS_DATA);
    if (savedLeads && savedLeads.length > 0) {
      setLeads(savedLeads);
    }
  }, []);

  const addLead = () => {
    if (newLead.company && newLead.contact && newLead.value) {
      const lead: Lead = {
        id: Date.now(),
        company: newLead.company,
        contact: newLead.contact,
        contactEmail: newLead.contactEmail || '',
        contactPhone: newLead.contactPhone || '',
        companyUrl: newLead.companyUrl || '',
        status: newLead.status || 'リード',
        value: newLead.value,
        probability: newLead.probability || 50,
        nextAction: newLead.nextAction || '',
        lastContact: new Date().toISOString().split('T')[0],
        meetingDate: newLead.meetingDate,
        meetingLink: newLead.meetingLink,
        services: newLead.services || [],
        notes: newLead.notes || '',
        createdAt: new Date().toISOString()
      };
      const updatedLeads = [...leads, lead];
      setLeads(updatedLeads);
      LocalStorage.set(STORAGE_KEYS.LEADS_DATA, updatedLeads);
      setNewLead({ 
        probability: 50, 
        services: [], 
        notes: '',
        createdAt: new Date().toISOString()
      });
      setShowLeadModal(false);
    }
  };

  const addService = () => {
    if (newService.name && newService.price && selectedLead) {
      const service: Service = {
        id: Date.now(),
        name: newService.name,
        category: newService.category as Service['category'],
        description: newService.description || '',
        price: newService.price,
        status: newService.status as Service['status'],
        deliveryTime: newService.deliveryTime
      };
      
      const updatedLeads = leads.map(lead => 
        lead.id === selectedLead.id 
          ? { ...lead, services: [...lead.services, service] }
          : lead
      );
      
      setLeads(updatedLeads);
      LocalStorage.set(STORAGE_KEYS.LEADS_DATA, updatedLeads);
      setSelectedLead({ ...selectedLead, services: [...selectedLead.services, service] });
      setNewService({ status: 'proposed', category: 'other' });
      setShowServiceModal(false);
    }
  };

  const exportLeadsToCSV = () => {
    const exportData = leads.map(lead => ({
      '会社名': lead.company,
      '担当者': lead.contact,
      'ステータス': lead.status,
      '予想金額': lead.value,
      '確度': `${lead.probability}%`,
      '次のアクション': lead.nextAction,
      '最終接触': lead.lastContact
    }));
    DataExporter.downloadCSV(exportData, `商談リスト_${new Date().toLocaleDateString('ja-JP')}.csv`);
  };

  // 実際のデータに基づく計算
  const currentMonthRevenue = leads.reduce((sum, lead) => {
    const leadDate = new Date(lead.lastContact);
    const now = new Date();
    const isCurrentMonth = leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear();
    return isCurrentMonth ? sum + (lead.value * lead.probability / 100) : sum;
  }, 0);

  const previousMonthRevenue = leads.reduce((sum, lead) => {
    const leadDate = new Date(lead.lastContact);
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1);
    const isPrevMonth = leadDate.getMonth() === prevMonth.getMonth() && leadDate.getFullYear() === prevMonth.getFullYear();
    return isPrevMonth ? sum + (lead.value * lead.probability / 100) : sum;
  }, 0);

  const revenueGrowth = previousMonthRevenue > 0 ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100) : 0;
  
  const newCustomersThisMonth = leads.filter(lead => {
    const leadDate = new Date(lead.lastContact);
    const now = new Date();
    return leadDate.getMonth() === now.getMonth() && leadDate.getFullYear() === now.getFullYear() && lead.status === '成約';
  }).length;

  const pipelineValue = leads.reduce((sum, lead) => sum + (lead.value * lead.probability / 100), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case '商談中': return '#FF9800';
      case 'ヒアリング': return '#2196F3';
      case '見積提出': return '#4CAF50';
      case '成約': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getServiceCategoryLabel = (category: string) => {
    switch (category) {
      case 'advertising': return '広告運用';
      case 'lp': return 'LP制作';
      case 'design': return 'デザイン';
      case 'video': return '動画編集';
      case 'development': return '開発';
      case 'consulting': return 'コンサルティング';
      case 'other': return 'その他';
      default: return 'その他';
    }
  };

  const getServiceCategoryColor = (category: string) => {
    switch (category) {
      case 'advertising': return '#FF6B6B';
      case 'lp': return '#4ECDC4';
      case 'design': return '#45B7D1';
      case 'video': return '#96CEB4';
      case 'development': return '#6C5CE7';
      case 'consulting': return '#FDA7DF';
      case 'other': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  // サービスカテゴリー別の集計
  const serviceCategoryAnalysis = leads.reduce((acc, lead) => {
    lead.services.forEach(service => {
      const category = service.category || 'other';
      if (!acc[category]) {
        acc[category] = { count: 0, revenue: 0, accepted: 0 };
      }
      acc[category].count++;
      acc[category].revenue += service.price;
      if (service.status === 'accepted' || service.status === 'completed') {
        acc[category].accepted++;
      }
    });
    return acc;
  }, {} as Record<string, { count: number; revenue: number; accepted: number }>);

  return (
    <div className="sales">
      <div className="sales-header">
        <h1>👥 顧客管理</h1>
        <p className="sales-subtitle">顧客情報とサービス提案の管理</p>
        <div className="header-actions">
          <button className="export-btn" onClick={exportLeadsToCSV}>
            <Download size={20} />
            CSVエクスポート
          </button>
          <button className="add-lead-btn" onClick={() => setShowLeadModal(true)}>
            <Plus size={20} />
            新規顧客追加
          </button>
        </div>
      </div>

      <div className="sales-summary">
        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#E3F2FD' }}>
            <DollarSign size={24} color="#3F51B5" />
          </div>
          <div className="summary-content">
            <p className="summary-label">今月の売上</p>
            <p className="summary-value">¥{currentMonthRevenue.toLocaleString()}</p>
            <p className={`summary-change ${revenueGrowth >= 0 ? 'positive' : 'negative'}`}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#E8F5E9' }}>
            <Target size={24} color="#4CAF50" />
          </div>
          <div className="summary-content">
            <p className="summary-label">アクティブリード</p>
            <p className="summary-value">{leads.length}件</p>
            <p className="summary-change">商談中: {leads.filter(l => l.status === '商談中').length}件</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#FFF3E0' }}>
            <Users size={24} color="#FF9800" />
          </div>
          <div className="summary-content">
            <p className="summary-label">今月の新規顧客</p>
            <p className="summary-value">{newCustomersThisMonth}社</p>
            <p className="summary-change">成約済み</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon" style={{ backgroundColor: '#F3E5F5' }}>
            <TrendingUp size={24} color="#9C27B0" />
          </div>
          <div className="summary-content">
            <p className="summary-label">商談見込み金額</p>
            <p className="summary-value">¥{(pipelineValue / 1000000).toFixed(1)}M</p>
            <p className="summary-change">確度を考慮した金額</p>
          </div>
        </div>
      </div>

      <div className="sales-charts">
        <div className="chart-container">
          <h3>ステータス別リード数</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { status: 'リード', count: leads.filter(l => l.status === 'リード').length },
              { status: 'ヒアリング', count: leads.filter(l => l.status === 'ヒアリング').length },
              { status: '商談中', count: leads.filter(l => l.status === '商談中').length },
              { status: '見積提出', count: leads.filter(l => l.status === '見積提出').length },
              { status: '成約', count: leads.filter(l => l.status === '成約').length }
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3F51B5" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>確度別リード分布</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: '高確度(80%+)', count: leads.filter(l => l.probability >= 80).length, color: '#4CAF50' },
                  { name: '中確度(50-79%)', count: leads.filter(l => l.probability >= 50 && l.probability < 80).length, color: '#FFC107' },
                  { name: '低確度(50%未満)', count: leads.filter(l => l.probability < 50).length, color: '#FF9800' }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${entry.count}件`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {[
                  { name: '高確度(80%+)', count: leads.filter(l => l.probability >= 80).length, color: '#4CAF50' },
                  { name: '中確度(50-79%)', count: leads.filter(l => l.probability >= 50 && l.probability < 80).length, color: '#FFC107' },
                  { name: '低確度(50%未満)', count: leads.filter(l => l.probability < 50).length, color: '#FF9800' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pipeline-section">
        <h3>セールスパイプライン</h3>
        <div className="pipeline">
          {[
            { stage: 'リード', count: leads.filter(l => l.status === 'リード').length, value: leads.filter(l => l.status === 'リード').reduce((sum, l) => sum + l.value, 0) },
            { stage: 'ヒアリング', count: leads.filter(l => l.status === 'ヒアリング').length, value: leads.filter(l => l.status === 'ヒアリング').reduce((sum, l) => sum + l.value, 0) },
            { stage: '商談中', count: leads.filter(l => l.status === '商談中').length, value: leads.filter(l => l.status === '商談中').reduce((sum, l) => sum + l.value, 0) },
            { stage: '見積提出', count: leads.filter(l => l.status === '見積提出').length, value: leads.filter(l => l.status === '見積提出').reduce((sum, l) => sum + l.value, 0) },
            { stage: '成約', count: leads.filter(l => l.status === '成約').length, value: leads.filter(l => l.status === '成約').reduce((sum, l) => sum + l.value, 0) }
          ].map((stage, index) => (
            <div key={index} className="pipeline-stage">
              <h4>{stage.stage}</h4>
              <p className="stage-count">{stage.count}件</p>
              <p className="stage-value">¥{(stage.value / 1000000).toFixed(1)}M</p>
              <div className="stage-bar" style={{ width: `${leads.length > 0 ? (stage.count / Math.max(...[
                leads.filter(l => l.status === 'リード').length,
                leads.filter(l => l.status === 'ヒアリング').length,
                leads.filter(l => l.status === '商談中').length,
                leads.filter(l => l.status === '見積提出').length,
                leads.filter(l => l.status === '成約').length
              ])) * 100 : 0}%` }}></div>
            </div>
          ))}
        </div>
      </div>

      <div className="service-analysis-section">
        <h3>サービスカテゴリー別分析</h3>
        <div className="service-analysis-grid">
          {Object.entries(serviceCategoryAnalysis).map(([category, data]) => (
            <div key={category} className="analysis-card">
              <div className="analysis-header">
                <span 
                  className="category-badge" 
                  style={{ backgroundColor: getServiceCategoryColor(category) }}
                >
                  {getServiceCategoryLabel(category)}
                </span>
              </div>
              <div className="analysis-stats">
                <div className="stat-item">
                  <span className="stat-label">提案数</span>
                  <span className="stat-value">{data.count}件</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">受注数</span>
                  <span className="stat-value">{data.accepted}件</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">受注率</span>
                  <span className="stat-value">
                    {data.count > 0 ? Math.round((data.accepted / data.count) * 100) : 0}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">売上見込</span>
                  <span className="stat-value">¥{data.revenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="leads-section">
        <h3>顧客・商談一覧</h3>
        <div className="leads-table">
          <table>
            <thead>
              <tr>
                <th>会社名</th>
                <th>担当者</th>
                <th>連絡先</th>
                <th>ステータス</th>
                <th>金額</th>
                <th>確度</th>
                <th>打ち合わせ</th>
                <th>サービス</th>
                <th>アクション</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id}>
                  <td className="company-name">
                    <div>
                      <strong>{lead.company}</strong>
                      {lead.companyUrl && (
                        <a href={lead.companyUrl} target="_blank" rel="noopener noreferrer" className="company-url">
                          🌐
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <div>
                      <div>{lead.contact}</div>
                      {lead.contactEmail && <div className="contact-info">{lead.contactEmail}</div>}
                      {lead.contactPhone && <div className="contact-info">{lead.contactPhone}</div>}
                    </div>
                  </td>
                  <td>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(lead.status) }}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="amount">¥{lead.value.toLocaleString()}</td>
                  <td>
                    <div className="probability">
                      <div className="probability-bar">
                        <div className="probability-fill" style={{ width: `${lead.probability}%` }}></div>
                      </div>
                      <span>{lead.probability}%</span>
                    </div>
                  </td>
                  <td>
                    {lead.meetingDate && (
                      <div className="meeting-info">
                        <div>{lead.meetingDate}</div>
                        {lead.meetingLink && (
                          <a href={lead.meetingLink} target="_blank" rel="noopener noreferrer" className="meeting-link">
                            📹 会議
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="services-list">
                      {lead.services.slice(0, 2).map(service => (
                        <span key={service.id} className="service-tag">
                          {service.name}
                        </span>
                      ))}
                      {lead.services.length > 2 && (
                        <span className="service-more">+{lead.services.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <button 
                      className="action-btn"
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowServiceModal(true);
                      }}
                    >
                      サービス追加
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showLeadModal && (
        <div className="modal-overlay" onClick={() => setShowLeadModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <h2>新規顧客追加</h2>
            <div className="form-row">
              <div className="form-group">
                <label>会社名 *</label>
                <input
                  type="text"
                  value={newLead.company || ''}
                  onChange={(e) => setNewLead({ ...newLead, company: e.target.value })}
                  placeholder="株式会社サンプル"
                />
              </div>
              <div className="form-group">
                <label>会社URL</label>
                <input
                  type="url"
                  value={newLead.companyUrl || ''}
                  onChange={(e) => setNewLead({ ...newLead, companyUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>担当者名 *</label>
                <input
                  type="text"
                  value={newLead.contact || ''}
                  onChange={(e) => setNewLead({ ...newLead, contact: e.target.value })}
                  placeholder="田中太郎"
                />
              </div>
              <div className="form-group">
                <label>メールアドレス</label>
                <input
                  type="email"
                  value={newLead.contactEmail || ''}
                  onChange={(e) => setNewLead({ ...newLead, contactEmail: e.target.value })}
                  placeholder="tanaka@example.com"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>電話番号</label>
                <input
                  type="tel"
                  value={newLead.contactPhone || ''}
                  onChange={(e) => setNewLead({ ...newLead, contactPhone: e.target.value })}
                  placeholder="03-1234-5678"
                />
              </div>
              <div className="form-group">
                <label>ステータス</label>
                <select
                  value={newLead.status || 'リード'}
                  onChange={(e) => setNewLead({ ...newLead, status: e.target.value })}
                >
                  <option value="リード">リード</option>
                  <option value="ヒアリング">ヒアリング</option>
                  <option value="商談中">商談中</option>
                  <option value="見積提出">見積提出</option>
                  <option value="成約">成約</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>金額 *</label>
                <input
                  type="number"
                  value={newLead.value || ''}
                  onChange={(e) => setNewLead({ ...newLead, value: parseInt(e.target.value) || 0 })}
                  placeholder="1000000"
                />
              </div>
              <div className="form-group">
                <label>確度 (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newLead.probability || 50}
                  onChange={(e) => setNewLead({ ...newLead, probability: parseInt(e.target.value) || 50 })}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>打ち合わせ日</label>
                <input
                  type="date"
                  value={newLead.meetingDate || ''}
                  onChange={(e) => setNewLead({ ...newLead, meetingDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>会議リンク</label>
                <input
                  type="url"
                  value={newLead.meetingLink || ''}
                  onChange={(e) => setNewLead({ ...newLead, meetingLink: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                />
              </div>
            </div>
            <div className="form-group">
              <label>次のアクション</label>
              <input
                type="text"
                value={newLead.nextAction || ''}
                onChange={(e) => setNewLead({ ...newLead, nextAction: e.target.value })}
                placeholder="見積書の提出"
              />
            </div>
            <div className="form-group">
              <label>メモ・備考</label>
              <textarea
                value={newLead.notes || ''}
                onChange={(e) => setNewLead({ ...newLead, notes: e.target.value })}
                rows={3}
                placeholder="顧客の詳細情報や注意事項"
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowLeadModal(false)}>キャンセル</button>
              <button className="save-btn" onClick={addLead}>顧客を追加</button>
            </div>
          </div>
        </div>
      )}

      {showServiceModal && selectedLead && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>サービス追加 - {selectedLead.company}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>サービスカテゴリー *</label>
                <select
                  value={newService.category || 'other'}
                  onChange={(e) => setNewService({ ...newService, category: e.target.value as Service['category'] })}
                >
                  <option value="advertising">広告運用</option>
                  <option value="lp">LP制作</option>
                  <option value="design">デザイン</option>
                  <option value="video">動画編集</option>
                  <option value="development">開発</option>
                  <option value="consulting">コンサルティング</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="form-group">
                <label>サービス名 *</label>
                <input
                  type="text"
                  value={newService.name || ''}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="例: Google広告運用、LP制作など"
                />
              </div>
            </div>
            <div className="form-group">
              <label>サービス説明</label>
              <textarea
                value={newService.description || ''}
                onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                rows={3}
                placeholder="サービスの詳細説明"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>価格 *</label>
                <input
                  type="number"
                  value={newService.price || ''}
                  onChange={(e) => setNewService({ ...newService, price: parseInt(e.target.value) || 0 })}
                  placeholder="500000"
                />
              </div>
              <div className="form-group">
                <label>納期目安</label>
                <input
                  type="text"
                  value={newService.deliveryTime || ''}
                  onChange={(e) => setNewService({ ...newService, deliveryTime: e.target.value })}
                  placeholder="例: 2週間、1ヶ月など"
                />
              </div>
            </div>
            <div className="form-group">
              <label>ステータス</label>
              <select
                value={newService.status || 'proposed'}
                onChange={(e) => setNewService({ ...newService, status: e.target.value as Service['status'] })}
              >
                <option value="proposed">提案中</option>
                <option value="accepted">受諾</option>
                <option value="rejected">却下</option>
                <option value="in-progress">進行中</option>
                <option value="completed">完了</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowServiceModal(false)}>キャンセル</button>
              <button className="save-btn" onClick={addService}>サービスを追加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;