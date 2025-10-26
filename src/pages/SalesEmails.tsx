import React, { useState } from 'react';
import { Plus, Mail, Download, Search, Calendar, User, ExternalLink, Edit2, Trash2 } from 'lucide-react';
import { STORAGE_KEYS } from '../utils/storage';
import { useDataSync } from '../hooks/useDataSync';
import './SalesEmails.css';

interface SalesEmail {
  id: number;
  subject: string;
  content: string;
  client: string;
  contactPerson: string;
  emailType: 'inquiry' | 'proposal' | 'follow-up' | 'contract' | 'other';
  sentDate: string;
  receivedDate: string;
  status: 'sent' | 'received' | 'replied' | 'no-reply';
  attachments: string[];
  tags: string[];
  notes: string;
  createdAt: string;
}

const SalesEmails: React.FC = () => {
  const { data: emails, setData: setEmails, isLoading, error } = useDataSync<SalesEmail[]>({
    storageKey: STORAGE_KEYS.SALES_EMAILS,
    defaultValue: []
  });
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<SalesEmail | null>(null);
  const [editingEmail, setEditingEmail] = useState<SalesEmail | null>(null);
  const [newEmail, setNewEmail] = useState<Partial<SalesEmail>>({
    emailType: 'inquiry',
    status: 'sent',
    attachments: [],
    tags: [],
    createdAt: new Date().toISOString()
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');


  const addEmail = () => {
    if (newEmail.subject && newEmail.client) {
      let updatedEmails;
      
      if (editingEmail) {
        // 編集モード
        updatedEmails = emails.map(email => 
          email.id === editingEmail.id 
            ? {
                ...editingEmail,
                subject: newEmail.subject,
                content: newEmail.content || '',
                client: newEmail.client,
                contactPerson: newEmail.contactPerson || '',
                emailType: newEmail.emailType as SalesEmail['emailType'],
                sentDate: newEmail.sentDate || '',
                receivedDate: newEmail.receivedDate || '',
                status: newEmail.status as SalesEmail['status'],
                attachments: newEmail.attachments || [],
                tags: newEmail.tags || [],
                notes: newEmail.notes || ''
              }
            : email
        );
        setEditingEmail(null);
      } else {
        // 新規追加モード
        const email: SalesEmail = {
          id: Date.now(),
          subject: newEmail.subject,
          content: newEmail.content || '',
          client: newEmail.client,
          contactPerson: newEmail.contactPerson || '',
          emailType: newEmail.emailType as SalesEmail['emailType'],
          sentDate: newEmail.sentDate || '',
          receivedDate: newEmail.receivedDate || '',
          status: newEmail.status as SalesEmail['status'],
          attachments: newEmail.attachments || [],
          tags: newEmail.tags || [],
          notes: newEmail.notes || '',
          createdAt: new Date().toISOString()
        };
        updatedEmails = [...emails, email];
      }
      
      setEmails(updatedEmails);
      
      setNewEmail({
        emailType: 'inquiry',
        status: 'sent',
        attachments: [],
        tags: [],
        createdAt: new Date().toISOString()
      });
      setShowEmailModal(false);
    }
  };

  const addTag = () => {
    const tag = prompt('タグを入力してください:');
    if (tag) {
      setNewEmail({
        ...newEmail,
        tags: [...(newEmail.tags || []), tag]
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewEmail({
      ...newEmail,
      tags: newEmail.tags?.filter(tag => tag !== tagToRemove) || []
    });
  };

  const editEmail = (email: SalesEmail) => {
    setEditingEmail(email);
    setNewEmail({
      subject: email.subject,
      content: email.content,
      client: email.client,
      contactPerson: email.contactPerson,
      emailType: email.emailType,
      sentDate: email.sentDate,
      receivedDate: email.receivedDate,
      status: email.status,
      attachments: email.attachments,
      tags: email.tags,
      notes: email.notes,
      createdAt: email.createdAt
    });
    setShowEmailModal(true);
  };

  const deleteEmail = (emailId: number) => {
    const email = emails.find(e => e.id === emailId);
    if (email && window.confirm(`「${email.subject}」のメールを削除してもよろしいですか？`)) {
      const updatedEmails = emails.filter(e => e.id !== emailId);
      setEmails(updatedEmails);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'inquiry': return '#2196F3';
      case 'proposal': return '#4CAF50';
      case 'follow-up': return '#FF9800';
      case 'contract': return '#9C27B0';
      case 'other': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#2196F3';
      case 'received': return '#4CAF50';
      case 'replied': return '#FF9800';
      case 'no-reply': return '#FF5722';
      default: return '#9E9E9E';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'inquiry': return '問い合わせ';
      case 'proposal': return '提案';
      case 'follow-up': return 'フォローアップ';
      case 'contract': return '契約関連';
      case 'other': return 'その他';
      default: return type;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'sent': return '送信済み';
      case 'received': return '受信済み';
      case 'replied': return '返信済み';
      case 'no-reply': return '未返信';
      default: return status;
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          email.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || email.emailType === filterType;
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="sales-emails">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sales-emails">
        <div className="error-container">
          <p>エラーが発生しました: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sales-emails">
      <div className="emails-header">
        <h1>📧 営業メール管理</h1>
        <p className="emails-subtitle">受注につながった営業メールの保存・管理</p>
        <div className="header-actions">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="メールを検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="filter-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">すべてのタイプ</option>
            <option value="inquiry">問い合わせ</option>
            <option value="proposal">提案</option>
            <option value="follow-up">フォローアップ</option>
            <option value="contract">契約関連</option>
            <option value="other">その他</option>
          </select>
          <select
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">すべてのステータス</option>
            <option value="sent">送信済み</option>
            <option value="received">受信済み</option>
            <option value="replied">返信済み</option>
            <option value="no-reply">未返信</option>
          </select>
          <button className="add-email-btn" onClick={() => setShowEmailModal(true)}>
            <Plus size={20} />
            メール追加
          </button>
        </div>
      </div>

      <div className="emails-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Mail size={24} color="#2196F3" />
          </div>
          <div className="stat-content">
            <p className="stat-label">総メール数</p>
            <p className="stat-value">{emails.length}件</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Calendar size={24} color="#4CAF50" />
          </div>
          <div className="stat-content">
            <p className="stat-label">今月のメール</p>
            <p className="stat-value">{emails.filter(e => {
              const emailDate = new Date(e.createdAt);
              const now = new Date();
              return emailDate.getMonth() === now.getMonth() && emailDate.getFullYear() === now.getFullYear();
            }).length}件</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <User size={24} color="#FF9800" />
          </div>
          <div className="stat-content">
            <p className="stat-label">返信済み</p>
            <p className="stat-value">{emails.filter(e => e.status === 'replied').length}件</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <ExternalLink size={24} color="#9C27B0" />
          </div>
          <div className="stat-content">
            <p className="stat-label">提案メール</p>
            <p className="stat-value">{emails.filter(e => e.emailType === 'proposal').length}件</p>
          </div>
        </div>
      </div>

      {emails.length === 0 && (
        <div className="no-emails">
          <h3>メールがありません</h3>
          <p>「メール追加」ボタンから営業メールを追加してください</p>
        </div>
      )}

      <div className="emails-list">
        {filteredEmails.map(email => (
          <div key={email.id} className="email-card" onClick={() => setSelectedEmail(email)}>
            <div className="email-header">
              <h3>{email.subject}</h3>
              <div className="email-badges">
                <span className="type-badge" style={{ backgroundColor: getTypeColor(email.emailType) }}>
                  {getTypeLabel(email.emailType)}
                </span>
                <span className="status-badge" style={{ backgroundColor: getStatusColor(email.status) }}>
                  {getStatusLabel(email.status)}
                </span>
              </div>
            </div>
            
            <div className="email-info">
              <p><strong>クライアント:</strong> {email.client}</p>
              {email.contactPerson && <p><strong>担当者:</strong> {email.contactPerson}</p>}
              <p><strong>送信日:</strong> {email.sentDate}</p>
              {email.receivedDate && <p><strong>受信日:</strong> {email.receivedDate}</p>}
            </div>

            <div className="email-content">
              <p>{email.content.length > 100 ? email.content.substring(0, 100) + '...' : email.content}</p>
            </div>

            {email.tags.length > 0 && (
              <div className="email-tags">
                {email.tags.map(tag => (
                  <span key={tag} className="tag">#{tag}</span>
                ))}
              </div>
            )}

            {email.attachments.length > 0 && (
              <div className="email-attachments">
                <span className="attachment-count">📎 {email.attachments.length}個の添付ファイル</span>
              </div>
            )}
            
            <div className="email-actions">
              <button 
                className="edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  editEmail(email);
                }}
                title="編集"
              >
                <Edit2 size={16} />
              </button>
              <button 
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEmail(email.id);
                }}
                title="削除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showEmailModal && (
        <div className="modal-overlay" onClick={() => {
          setShowEmailModal(false);
          setEditingEmail(null);
          setNewEmail({
            emailType: 'inquiry',
            status: 'sent',
            attachments: [],
            tags: [],
            createdAt: new Date().toISOString()
          });
        }}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingEmail ? '営業メール編集' : '営業メール追加'}</h2>
            <div className="form-group">
              <label>件名 *</label>
              <input
                type="text"
                value={newEmail.subject || ''}
                onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                placeholder="Webサイト制作のご提案について"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>クライアント *</label>
                <input
                  type="text"
                  value={newEmail.client || ''}
                  onChange={(e) => setNewEmail({ ...newEmail, client: e.target.value })}
                  placeholder="株式会社サンプル"
                />
              </div>
              <div className="form-group">
                <label>担当者</label>
                <input
                  type="text"
                  value={newEmail.contactPerson || ''}
                  onChange={(e) => setNewEmail({ ...newEmail, contactPerson: e.target.value })}
                  placeholder="田中太郎"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>メールタイプ</label>
                <select
                  value={newEmail.emailType}
                  onChange={(e) => setNewEmail({ ...newEmail, emailType: e.target.value as SalesEmail['emailType'] })}
                >
                  <option value="inquiry">問い合わせ</option>
                  <option value="proposal">提案</option>
                  <option value="follow-up">フォローアップ</option>
                  <option value="contract">契約関連</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="form-group">
                <label>ステータス</label>
                <select
                  value={newEmail.status}
                  onChange={(e) => setNewEmail({ ...newEmail, status: e.target.value as SalesEmail['status'] })}
                >
                  <option value="sent">送信済み</option>
                  <option value="received">受信済み</option>
                  <option value="replied">返信済み</option>
                  <option value="no-reply">未返信</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>送信日</label>
                <input
                  type="date"
                  value={newEmail.sentDate || ''}
                  onChange={(e) => setNewEmail({ ...newEmail, sentDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>受信日</label>
                <input
                  type="date"
                  value={newEmail.receivedDate || ''}
                  onChange={(e) => setNewEmail({ ...newEmail, receivedDate: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>メール内容</label>
              <textarea
                value={newEmail.content || ''}
                onChange={(e) => setNewEmail({ ...newEmail, content: e.target.value })}
                rows={6}
                placeholder="メールの内容を入力してください"
              />
            </div>
            <div className="form-group">
              <label>タグ</label>
              <div className="tags-section">
                <div className="tags-list">
                  {newEmail.tags?.map(tag => (
                    <span key={tag} className="tag-input">
                      #{tag}
                      <button onClick={() => removeTag(tag)}>×</button>
                    </span>
                  ))}
                </div>
                <button type="button" onClick={addTag} className="add-tag-btn">
                  + タグを追加
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>メモ・備考</label>
              <textarea
                value={newEmail.notes || ''}
                onChange={(e) => setNewEmail({ ...newEmail, notes: e.target.value })}
                rows={3}
                placeholder="メールに関する追加情報や注意事項"
              />
            </div>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => {
                setShowEmailModal(false);
                setEditingEmail(null);
                setNewEmail({
                  emailType: 'inquiry',
                  status: 'sent',
                  attachments: [],
                  tags: [],
                  createdAt: new Date().toISOString()
                });
              }}>キャンセル</button>
              <button className="save-btn" onClick={addEmail}>
                {editingEmail ? 'メールを更新' : 'メールを追加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedEmail && (
        <div className="modal-overlay" onClick={() => setSelectedEmail(null)}>
          <div className="modal-content email-detail-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedEmail.subject}</h2>
            <div className="email-detail-content">
              <div className="detail-section">
                <h3>基本情報</h3>
                <p><strong>クライアント:</strong> {selectedEmail.client}</p>
                {selectedEmail.contactPerson && <p><strong>担当者:</strong> {selectedEmail.contactPerson}</p>}
                <p><strong>メールタイプ:</strong>
                  <span className="type-badge" style={{ backgroundColor: getTypeColor(selectedEmail.emailType) }}>
                    {getTypeLabel(selectedEmail.emailType)}
                  </span>
                </p>
                <p><strong>ステータス:</strong>
                  <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedEmail.status) }}>
                    {getStatusLabel(selectedEmail.status)}
                  </span>
                </p>
                <p><strong>送信日:</strong> {selectedEmail.sentDate}</p>
                {selectedEmail.receivedDate && <p><strong>受信日:</strong> {selectedEmail.receivedDate}</p>}
              </div>

              <div className="detail-section">
                <h3>メール内容</h3>
                <div className="email-content-full">
                  {selectedEmail.content}
                </div>
              </div>

              {selectedEmail.tags.length > 0 && (
                <div className="detail-section">
                  <h3>タグ</h3>
                  <div className="tags-list">
                    {selectedEmail.tags.map(tag => (
                      <span key={tag} className="tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedEmail.notes && (
                <div className="detail-section">
                  <h3>メモ・備考</h3>
                  <p>{selectedEmail.notes}</p>
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="edit-btn"
                onClick={() => {
                  editEmail(selectedEmail);
                  setSelectedEmail(null);
                }}
              >
                編集
              </button>
              <button 
                className="delete-btn"
                onClick={() => {
                  deleteEmail(selectedEmail.id);
                  setSelectedEmail(null);
                }}
              >
                削除
              </button>
              <button className="cancel-btn" onClick={() => setSelectedEmail(null)}>閉じる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesEmails;
