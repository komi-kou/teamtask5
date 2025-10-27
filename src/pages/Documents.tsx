import React, { useState, useEffect } from 'react';
import { FileText, MessageSquare, Search, Calendar, Plus, Users, Clock, Edit2, Trash2 } from 'lucide-react';
import { LocalStorage, STORAGE_KEYS } from '../utils/storage';
import ApiService from '../services/api';
import './Documents.css';

interface Document {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  uploadedBy: string;
  category: string;
  comments: Comment[];
  meetingDate?: string;
  attendees?: string[];
  actionItems?: ActionItem[];
}

interface Comment {
  id: number;
  author: string;
  text: string;
  timestamp: string;
}

interface ActionItem {
  id: number;
  task: string;
  assignee: string;
  dueDate: string;
  status: 'pending' | 'completed';
}

interface MeetingMinutes {
  id: number;
  title: string;
  date: string;
  time: string;
  attendees: string[];
  meetingLink?: string;
  meetingType: 'zoom' | 'teams' | 'google-meet' | 'other';
  agenda: string[];
  decisions: string[];
  actionItems: ActionItem[];
  notes: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes[]>([]);
  const [teamMembers, setTeamMembers] = useState<{id: number, name: string, role: string}[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showMinutesModal, setShowMinutesModal] = useState(false);
  const [editingMinutes, setEditingMinutes] = useState<MeetingMinutes | null>(null);
  const [newMinutes, setNewMinutes] = useState<Partial<MeetingMinutes>>({
    attendees: [],
    agenda: [],
    decisions: [],
    actionItems: [],
    meetingType: 'zoom',
    status: 'scheduled'
  });
  const [newComment, setNewComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // データをサーバーから取得
  const loadDataFromServer = async () => {
    try {
      const [docsResponse, minutesResponse, membersResponse] = await Promise.all([
        ApiService.getData(STORAGE_KEYS.DOCUMENTS_DATA),
        ApiService.getData(STORAGE_KEYS.MEETING_MINUTES),
        ApiService.getData(STORAGE_KEYS.TEAM_MEMBERS)
      ]);
      
      // サーバーのデータを優先的に使用（常に最新の状態を保持）
      if (docsResponse.data && Array.isArray(docsResponse.data)) {
        console.log('サーバーからの資料データを適用:', docsResponse.data.length, '件');
        setDocuments(docsResponse.data);
        LocalStorage.set(STORAGE_KEYS.DOCUMENTS_DATA, docsResponse.data);
      }
      if (minutesResponse.data && Array.isArray(minutesResponse.data)) {
        console.log('サーバーからの議事録データを適用:', minutesResponse.data.length, '件');
        setMeetingMinutes(minutesResponse.data);
        LocalStorage.set(STORAGE_KEYS.MEETING_MINUTES, minutesResponse.data);
      }
      if (membersResponse.data && Array.isArray(membersResponse.data)) {
        console.log('サーバーからのチームメンバーデータを適用:', membersResponse.data.length, '件');
        setTeamMembers(membersResponse.data);
        LocalStorage.set(STORAGE_KEYS.TEAM_MEMBERS, membersResponse.data);
      }
    } catch (error) {
      console.error('サーバーからのデータ取得エラー:', error);
    }
  };

  useEffect(() => {
    const savedDocs = LocalStorage.get<Document[]>(STORAGE_KEYS.DOCUMENTS_DATA);
    const savedMinutes = LocalStorage.get<MeetingMinutes[]>(STORAGE_KEYS.MEETING_MINUTES);
    const savedMembers = LocalStorage.get<{id: number, name: string, role: string}[]>(STORAGE_KEYS.TEAM_MEMBERS);
    
    if (savedDocs && savedDocs.length > 0) {
      setDocuments(savedDocs);
    }
    if (savedMinutes && savedMinutes.length > 0) {
      setMeetingMinutes(savedMinutes);
    }
    if (savedMembers && savedMembers.length > 0) {
      setTeamMembers(savedMembers);
    }
    
    // サーバーからも取得を試みる
    loadDataFromServer();
  }, []);


  const addMeetingMinutes = () => {
    if (newMinutes.title && newMinutes.date && newMinutes.attendees && newMinutes.attendees.length > 0) {
      let updatedMinutes;
      let updatedDocs;
      
      if (editingMinutes) {
        // 編集モード
        const minutes: MeetingMinutes = {
          ...editingMinutes,
          title: newMinutes.title,
          date: newMinutes.date,
          time: newMinutes.time || '',
          attendees: newMinutes.attendees,
          meetingLink: newMinutes.meetingLink,
          meetingType: newMinutes.meetingType || 'zoom',
          agenda: newMinutes.agenda || [],
          decisions: newMinutes.decisions || [],
          actionItems: newMinutes.actionItems || [],
          notes: newMinutes.notes || '',
          status: newMinutes.status || 'scheduled'
        };
        
        updatedMinutes = meetingMinutes.map(m => 
          m.id === editingMinutes.id ? minutes : m
        );
        
        // 対応するドキュメントも更新（IDで特定）
        const docName = `${minutes.title}_議事録`;
        // editingMinutesのIDをベースにドキュメント名を構築して検索
        const editingDocName = `${editingMinutes.title}_議事録`;
        updatedDocs = documents.map(doc => {
          // 編集対象の議事録ドキュメントをIDベースで特定
          if (doc.type === '議事録' && doc.name === editingDocName) {
            return {
              ...doc,
              name: docName,
              uploadDate: minutes.date,
              meetingDate: minutes.date,
              attendees: minutes.attendees,
              actionItems: minutes.actionItems
            };
          }
          return doc;
        });
        
        setEditingMinutes(null);
      } else {
        // 新規追加モード
        const newId = Date.now();
        const minutes: MeetingMinutes = {
          id: newId,
          title: newMinutes.title,
          date: newMinutes.date,
          time: newMinutes.time || '',
          attendees: newMinutes.attendees,
          meetingLink: newMinutes.meetingLink,
          meetingType: newMinutes.meetingType || 'zoom',
          agenda: newMinutes.agenda || [],
          decisions: newMinutes.decisions || [],
          actionItems: newMinutes.actionItems || [],
          notes: newMinutes.notes || '',
          status: newMinutes.status || 'scheduled'
        };
        
        updatedMinutes = [...meetingMinutes, minutes];
        
        // ドキュメントとしても追加
        const doc: Document = {
          id: newId, // 議事録IDと同じIDを使用
          name: `${minutes.title}_議事録`,
          type: '議事録',
          size: '1.2 KB',
          uploadDate: minutes.date,
          uploadedBy: 'システム',
          category: '会議',
          comments: [],
          meetingDate: minutes.date,
          attendees: minutes.attendees,
          actionItems: minutes.actionItems
        };
        
        updatedDocs = [...documents, doc];
      }
      
      setMeetingMinutes(updatedMinutes);
      LocalStorage.set(STORAGE_KEYS.MEETING_MINUTES, updatedMinutes);
      
      setDocuments(updatedDocs);
      LocalStorage.set(STORAGE_KEYS.DOCUMENTS_DATA, updatedDocs);
      
      setNewMinutes({ 
        attendees: [], 
        agenda: [], 
        decisions: [], 
        actionItems: [],
        meetingType: 'zoom',
        status: 'scheduled'
      });
      setShowMinutesModal(false);
    }
  };

  const addAgendaItem = () => {
    const item = prompt('アジェンダ項目を入力してください:');
    if (item) {
      setNewMinutes({
        ...newMinutes,
        agenda: [...(newMinutes.agenda || []), item]
      });
    }
  };

  const addDecision = () => {
    const decision = prompt('決定事項を入力してください:');
    if (decision) {
      setNewMinutes({
        ...newMinutes,
        decisions: [...(newMinutes.decisions || []), decision]
      });
    }
  };

  const addActionItem = () => {
    const task = prompt('アクションアイテムを入力してください:');
    const assignee = prompt('担当者を入力してください:');
    const dueDate = prompt('期限を入力してください (YYYY-MM-DD):');
    
    if (task && assignee && dueDate) {
      const actionItem: ActionItem = {
        id: Date.now(),
        task,
        assignee,
        dueDate,
        status: 'pending'
      };
      
      setNewMinutes({
        ...newMinutes,
        actionItems: [...(newMinutes.actionItems || []), actionItem]
      });
    }
  };

  const addComment = () => {
    if (selectedDoc && newComment.trim()) {
      const updatedDocs = documents.map(doc => {
        if (doc.id === selectedDoc.id) {
          return {
            ...doc,
            comments: [
              ...doc.comments,
              {
                id: doc.comments.length + 1,
                author: '現在のユーザー',
                text: newComment,
                timestamp: new Date().toLocaleString('ja-JP')
              }
            ]
          };
        }
        return doc;
      });
      setDocuments(updatedDocs);
      LocalStorage.set(STORAGE_KEYS.DOCUMENTS_DATA, updatedDocs);
      setSelectedDoc(updatedDocs.find(d => d.id === selectedDoc.id) || null);
      setNewComment('');
    }
  };

  const editMeetingMinutes = (docName: string) => {
    // docNameからドキュメントIDを抽出
    const doc = documents.find(d => d.name === docName && d.type === '議事録');
    if (doc) {
      // ドキュメントIDと同じIDを持つ議事録を検索
      const minutes = meetingMinutes.find(m => m.id === doc.id);
      if (minutes) {
        setEditingMinutes(minutes);
        setNewMinutes({
          title: minutes.title,
          date: minutes.date,
          time: minutes.time,
          attendees: minutes.attendees,
          meetingLink: minutes.meetingLink,
          meetingType: minutes.meetingType,
          agenda: minutes.agenda,
          decisions: minutes.decisions,
          actionItems: minutes.actionItems,
          notes: minutes.notes,
          status: minutes.status
        });
        setShowMinutesModal(true);
      }
    }
  };

  const deleteDocument = (docId: number) => {
    const doc = documents.find(d => d.id === docId);
    if (doc && window.confirm(`「${doc.name}」を削除してもよろしいですか？`)) {
      const updatedDocs = documents.filter(d => d.id !== docId);
      setDocuments(updatedDocs);
      LocalStorage.set(STORAGE_KEYS.DOCUMENTS_DATA, updatedDocs);
      
      // 議事録の場合は会議録も削除（IDで特定）
      if (doc.type === '議事録') {
        const updatedMinutes = meetingMinutes.filter(m => m.id !== docId);
        setMeetingMinutes(updatedMinutes);
        LocalStorage.set(STORAGE_KEYS.MEETING_MINUTES, updatedMinutes);
      }
      
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="documents">
      <div className="documents-header">
        <h1>議事録・打ち合わせ管理</h1>
        <div className="header-actions">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="議事録・会議を検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="category-filter"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">すべての会議</option>
            <option value="定例会議">定例会議</option>
            <option value="営業会議">営業会議</option>
            <option value="顧客打ち合わせ">顧客打ち合わせ</option>
            <option value="プロジェクト会議">プロジェクト会議</option>
            <option value="その他">その他</option>
          </select>
          <button className="upload-button" onClick={() => setShowMinutesModal(true)}>
            <Plus size={20} />
            議事録作成
          </button>
        </div>
      </div>

      <div className="documents-content">
        <div className="documents-list">
          <h3>議事録・会議一覧 ({filteredDocuments.length}件)</h3>
          <div className="documents-grid">
            {filteredDocuments.map(doc => (
              <div 
                key={doc.id} 
                className={`document-card ${selectedDoc?.id === doc.id ? 'selected' : ''}`}
                onClick={() => setSelectedDoc(doc)}
              >
                <div className="document-icon">
                  <FileText size={40} />
                </div>
                <div className="document-info">
                  <h4>{doc.name}</h4>
                  <p className="document-meta">
                    <span className="doc-type">{doc.type}</span>
                    <span>{doc.size}</span>
                    <span>{doc.uploadDate}</span>
                  </p>
                  <p className="document-uploader">アップロード: {doc.uploadedBy}</p>
                  {doc.comments.length > 0 && (
                    <p className="comment-count">
                      <MessageSquare size={14} /> {doc.comments.length} コメント
                    </p>
                  )}
                </div>
                <div className="document-actions">
                  {doc.type === '議事録' && (
                    <button 
                      className="edit-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        editMeetingMinutes(doc.name);
                      }}
                      title="編集"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                  <button 
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDocument(doc.id);
                    }}
                    title="削除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {selectedDoc && (
          <div className="document-detail">
            <h3>ドキュメント詳細</h3>
            <div className="detail-header">
              <h4>{selectedDoc.name}</h4>
              <p className="detail-meta">
                <Calendar size={14} /> {selectedDoc.uploadDate}
                <span className="separator">|</span>
                {selectedDoc.uploadedBy}
              </p>
            </div>

            <div className="comments-section">
              <h4>コメント・フィードバック</h4>
              <div className="comments-list">
                {selectedDoc.comments.length === 0 ? (
                  <p className="no-comments">まだコメントはありません</p>
                ) : (
                  selectedDoc.comments.map(comment => (
                    <div key={comment.id} className="comment">
                      <div className="comment-header">
                        <strong>{comment.author}</strong>
                        <span className="comment-time">{comment.timestamp}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="comment-input">
                <textarea
                  placeholder="コメントを入力..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <button onClick={addComment} className="submit-comment">
                  コメントを投稿
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showMinutesModal && (
        <div className="modal-overlay" onClick={() => {
          setShowMinutesModal(false);
          setEditingMinutes(null);
          setNewMinutes({ 
            attendees: [], 
            agenda: [], 
            decisions: [], 
            actionItems: [],
            meetingType: 'zoom',
            status: 'scheduled'
          });
        }}>
          <div className="modal-content minutes-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingMinutes ? '議事録編集' : '議事録作成'}</h2>
            <div className="form-group">
              <label>会議名</label>
              <input
                type="text"
                placeholder="例: 週次定例会議"
                value={newMinutes.title || ''}
                onChange={(e) => setNewMinutes({ ...newMinutes, title: e.target.value })}
              />
            </div>
                <div className="form-group">
                  <label>日付</label>
                  <input
                    type="date"
                    value={newMinutes.date || ''}
                    onChange={(e) => setNewMinutes({ ...newMinutes, date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>時間</label>
                  <input
                    type="time"
                    value={newMinutes.time || ''}
                    onChange={(e) => setNewMinutes({ ...newMinutes, time: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>会議ツール</label>
                  <select
                    value={newMinutes.meetingType || 'zoom'}
                    onChange={(e) => setNewMinutes({ ...newMinutes, meetingType: e.target.value as MeetingMinutes['meetingType'] })}
                  >
                    <option value="zoom">Zoom</option>
                    <option value="teams">Microsoft Teams</option>
                    <option value="google-meet">Google Meet</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>会議リンク</label>
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/..."
                    value={newMinutes.meetingLink || ''}
                    onChange={(e) => setNewMinutes({ ...newMinutes, meetingLink: e.target.value })}
                  />
                </div>
            <div className="form-group">
              <label>参加者</label>
              <div className="attendees-list">
                {teamMembers.map(member => (
                  <label key={member.id} className="attendee-checkbox">
                    <input
                      type="checkbox"
                      checked={newMinutes.attendees?.includes(member.name) || false}
                      onChange={(e) => {
                        const attendees = newMinutes.attendees || [];
                        if (e.target.checked) {
                          setNewMinutes({ ...newMinutes, attendees: [...attendees, member.name] });
                        } else {
                          setNewMinutes({ ...newMinutes, attendees: attendees.filter(name => name !== member.name) });
                        }
                      }}
                    />
                    {member.name} ({member.role})
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group">
              <label>アジェンダ</label>
              <div className="list-section">
                {(newMinutes.agenda || []).map((item, index) => (
                  <div key={index} className="list-item">
                    <span>{index + 1}. {item}</span>
                  </div>
                ))}
                <button type="button" onClick={addAgendaItem} className="add-item-btn">
                  <Plus size={16} /> アジェンダ項目を追加
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>決定事項</label>
              <div className="list-section">
                {(newMinutes.decisions || []).map((decision, index) => (
                  <div key={index} className="list-item">
                    <span>• {decision}</span>
                  </div>
                ))}
                <button type="button" onClick={addDecision} className="add-item-btn">
                  <Plus size={16} /> 決定事項を追加
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>アクションアイテム</label>
              <div className="list-section">
                {(newMinutes.actionItems || []).map((item, index) => (
                  <div key={index} className="action-item">
                    <span>• {item.task}</span>
                    <span className="assignee">担当: {item.assignee}</span>
                    <span className="due-date">期限: {item.dueDate}</span>
                  </div>
                ))}
                <button type="button" onClick={addActionItem} className="add-item-btn">
                  <Plus size={16} /> アクションアイテムを追加
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>メモ・備考</label>
              <textarea
                value={newMinutes.notes || ''}
                onChange={(e) => setNewMinutes({ ...newMinutes, notes: e.target.value })}
                rows={4}
                placeholder="会議の詳細なメモや備考を入力してください"
              />
            </div>
            
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => {
                setShowMinutesModal(false);
                setEditingMinutes(null);
                setNewMinutes({ 
                  attendees: [], 
                  agenda: [], 
                  decisions: [], 
                  actionItems: [],
                  meetingType: 'zoom',
                  status: 'scheduled'
                });
              }}>キャンセル</button>
              <button className="save-btn" onClick={addMeetingMinutes}>
                {editingMinutes ? '議事録を更新' : '議事録を作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;