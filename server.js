const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const { pool, initializeDatabase } = require('./database');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key';

// CORS設定
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://teamtask5.onrender.com']
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ミドルウェア
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// JWT認証ミドルウェア
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'アクセストークンが必要です' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '無効なトークンです' });
    }
    req.user = user;
    next();
  });
};

// ユニークID生成
const generateId = () => Math.random().toString(36).substr(2, 9);

// チームコード生成
const generateTeamCode = () => Math.random().toString(36).substr(2, 8).toUpperCase();

// 認証ルート
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log('Registration attempt:', { username, email });

    // バリデーション
    if (!username || !email || !password) {
      return res.status(400).json({ message: '必須フィールドが不足しています' });
    }

    // メール重複チェック
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
    }

    const userId = generateId();
    const teamId = generateId();
    const teamCode = generateTeamCode();

    // 個人用チームを自動作成
    await pool.query(
      'INSERT INTO teams (id, name, code, owner_id, members) VALUES ($1, $2, $3, $4, $5)',
      [teamId, `${username}のチーム`, teamCode, userId, [userId]]
    );
    
    // チームデータ初期化
    await pool.query(
      'INSERT INTO team_data (team_id, tasks, projects, sales, team_members, meetings, activities, documents, meeting_minutes, leads, service_materials) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
      [teamId, '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]', '[]']
    );

    // ユーザー作成
    await pool.query(
      'INSERT INTO users (id, username, email, password, team_id, team_name, role) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, username, email, password, teamId, `${username}のチーム`, 'owner']
    );

    console.log('User created:', { id: userId, username, email });

    // JWTトークン生成
    const token = jwt.sign(
      { userId, email, teamId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: userId,
        username,
        email,
        teamId,
        teamName: `${username}のチーム`,
        role: 'owner',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', { email });

    // バリデーション
    if (!email || !password) {
      return res.status(400).json({ message: 'メールアドレスとパスワードが必要です' });
    }

    // ユーザー検索
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    const user = userResult.rows[0];
    console.log('User found:', { id: user.id, email: user.email });

    // パスワード検証（実際のアプリではハッシュ化されたパスワードと比較）
    if (password !== user.password) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // チーム情報取得
    let teamName = user.team_name || null;

    // JWTトークン生成
    const token = jwt.sign(
      { userId: user.id, email: user.email, teamId: user.team_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful:', { userId: user.id, email: user.email });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        teamId: user.team_id,
        teamName: teamName,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

app.post('/api/auth/join-team', authenticateToken, async (req, res) => {
  try {
    const { teamCode } = req.body;
    const userId = req.user.userId;

    // チーム検索
    const teamResult = await pool.query('SELECT * FROM teams WHERE code = $1', [teamCode]);
    if (teamResult.rows.length === 0) {
      return res.status(404).json({ message: 'チームが見つかりません' });
    }

    const team = teamResult.rows[0];

    // ユーザーをチームに追加
    await pool.query(
      'UPDATE users SET team_id = $1, team_name = $2 WHERE id = $3',
      [team.id, team.name, userId]
    );

    // チームメンバーを更新
    const members = team.members || [];
    if (!members.includes(userId)) {
      members.push(userId);
      await pool.query('UPDATE teams SET members = $1 WHERE id = $2', [members, team.id]);
    }

    res.json({
      success: true,
      message: 'チームに参加しました',
      team: {
        id: team.id,
        name: team.name,
        code: team.code
      }
    });
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        teamId: user.team_id,
        teamName: user.team_name,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// データAPI
app.get('/api/data/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0 || !userResult.rows[0].team_id) {
      return res.json({ data: {} });
    }

    const teamId = userResult.rows[0].team_id;
    const dataResult = await pool.query('SELECT * FROM team_data WHERE team_id = $1', [teamId]);
    
    if (dataResult.rows.length === 0) {
      return res.json({ data: {} });
    }

    const data = dataResult.rows[0];
    
    // JSONBデータをパース（文字列の場合のみ）
    const parseJsonb = (value) => {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch (e) {
          return [];
        }
      }
      return value || [];
    };
    
    res.json({ 
      data: {
        tasks: parseJsonb(data.tasks),
        projects: parseJsonb(data.projects),
        sales: parseJsonb(data.sales),
        team_members: parseJsonb(data.team_members),
        meetings: parseJsonb(data.meetings),
        activities: parseJsonb(data.activities)
      }
    });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

app.get('/api/data/:dataType', authenticateToken, async (req, res) => {
  try {
    const { dataType } = req.params;
    const userId = req.user.userId;
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0 || !userResult.rows[0].team_id) {
      return res.json({ data: [] });
    }

    const teamId = userResult.rows[0].team_id;
    const dataResult = await pool.query('SELECT * FROM team_data WHERE team_id = $1', [teamId]);
    
    if (dataResult.rows.length === 0) {
      return res.json({ data: [] });
    }

    const data = dataResult.rows[0];
    const fieldMap = {
      'tasks': 'tasks',
      'tasksData': 'tasks',
      'projects': 'projects',
      'projectsData': 'projects',
      'sales': 'sales',
      'salesData': 'sales',
      'teamMembers': 'team_members',
      'meetings': 'meetings',
      'activities': 'activities',
      'documentsData': 'documents',
      'meetingMinutes': 'meeting_minutes',
      'leadsData': 'leads',
      'serviceMaterials': 'service_materials'
    };

    const fieldName = fieldMap[dataType] || dataType;
    const rawResult = data[fieldName];
    
    // JSONBデータをパース（文字列の場合のみ）
    let result;
    if (typeof rawResult === 'string') {
      try {
        result = JSON.parse(rawResult);
      } catch (e) {
        result = [];
      }
    } else {
      result = rawResult || [];
    }
    
    res.json({ data: result });
  } catch (error) {
    console.error('Get data error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

app.post('/api/data/:dataType', authenticateToken, async (req, res) => {
  try {
    const { dataType } = req.params;
    const data = req.body;
    const userId = req.user.userId;
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0 || !userResult.rows[0].team_id) {
      return res.status(400).json({ message: 'チームに所属していません' });
    }

    const teamId = userResult.rows[0].team_id;
    
    const fieldMap = {
      'tasks': 'tasks',
      'tasksData': 'tasks',
      'projects': 'projects',
      'projectsData': 'projects',
      'sales': 'sales',
      'salesData': 'sales',
      'teamMembers': 'team_members',
      'meetings': 'meetings',
      'activities': 'activities',
      'documentsData': 'documents',
      'meetingMinutes': 'meeting_minutes',
      'leadsData': 'leads',
      'serviceMaterials': 'service_materials'
    };

    const fieldName = fieldMap[dataType] || dataType;
    
    // データをJSON文字列として保存
    const jsonData = JSON.stringify(data);
    
    // 既存のteam_dataレコードを取得
    const existingData = await pool.query('SELECT * FROM team_data WHERE team_id = $1', [teamId]);
    
    let updateValues;
    if (existingData.rows.length > 0) {
      // 既存レコードがある場合：既存値を保持して対象フィールドだけ更新
      const existing = existingData.rows[0];
      updateValues = {
        tasks: existing.tasks || '[]',
        projects: existing.projects || '[]',
        sales: existing.sales || '[]',
        team_members: existing.team_members || '[]',
        meetings: existing.meetings || '[]',
        activities: existing.activities || '[]',
        documents: existing.documents || '[]',
        meeting_minutes: existing.meeting_minutes || '[]',
        leads: existing.leads || '[]',
        service_materials: existing.service_materials || '[]'
      };
      updateValues[fieldName] = jsonData;
    } else {
      // 既存レコードがない場合：デフォルト値で初期化して対象フィールドを設定
      updateValues = {
        tasks: '[]',
        projects: '[]',
        sales: '[]',
        team_members: '[]',
        meetings: '[]',
        activities: '[]',
        documents: '[]',
        meeting_minutes: '[]',
        leads: '[]',
        service_materials: '[]'
      };
      updateValues[fieldName] = jsonData;
    }
    
    // UPSERT（存在すればUPDATE、なければINSERT）
    await pool.query(
      `INSERT INTO team_data (team_id, tasks, projects, sales, team_members, meetings, activities, documents, meeting_minutes, leads, service_materials)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (team_id)
      DO UPDATE SET tasks = EXCLUDED.tasks, projects = EXCLUDED.projects, sales = EXCLUDED.sales,
                     team_members = EXCLUDED.team_members, meetings = EXCLUDED.meetings, activities = EXCLUDED.activities,
                     documents = EXCLUDED.documents, meeting_minutes = EXCLUDED.meeting_minutes,
                     leads = EXCLUDED.leads, service_materials = EXCLUDED.service_materials`,
      [teamId, updateValues.tasks, updateValues.projects, updateValues.sales, 
       updateValues.team_members, updateValues.meetings, updateValues.activities,
       updateValues.documents, updateValues.meeting_minutes, updateValues.leads, updateValues.service_materials]
    );

    // Socket.ioでリアルタイム更新を通知
    io.to(teamId).emit('data-updated', {
      dataType,
      data,
      userId
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Save data error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

// ヘルスチェック
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// 本番環境での静的ファイル配信（フロントエンド）
if (process.env.NODE_ENV === 'production') {
  // Reactのビルド成果物を静的ファイルとして配信
  app.use(express.static(path.join(__dirname, 'build')));
  
  // すべてのルートをindex.htmlにフォールバック（React Router対応）
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Socket.io接続処理
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-team', (teamId) => {
    socket.join(teamId);
    console.log(`User ${socket.id} joined team ${teamId}`);
  });

  socket.on('data-update', async (data) => {
    const { teamId, dataType, data: newData } = data;
    const fieldMap = {
      'tasks': 'tasks',
      'tasksData': 'tasks',
      'projects': 'projects',
      'projectsData': 'projects',
      'sales': 'sales',
      'salesData': 'sales',
      'teamMembers': 'team_members',
      'meetings': 'meetings',
      'activities': 'activities',
      'documentsData': 'documents',
      'meetingMinutes': 'meeting_minutes',
      'leadsData': 'leads',
      'serviceMaterials': 'service_materials'
    };
    
    const fieldName = fieldMap[dataType] || dataType;
    const jsonData = JSON.stringify(newData);
    
    try {
      // 既存のteam_dataレコードを取得
      const existingData = await pool.query('SELECT * FROM team_data WHERE team_id = $1', [teamId]);
      
      let updateValues;
      if (existingData.rows.length > 0) {
        // 既存レコードがある場合：既存値を保持して対象フィールドだけ更新
        const existing = existingData.rows[0];
        updateValues = {
          tasks: existing.tasks || '[]',
          projects: existing.projects || '[]',
          sales: existing.sales || '[]',
          team_members: existing.team_members || '[]',
          meetings: existing.meetings || '[]',
          activities: existing.activities || '[]',
          documents: existing.documents || '[]',
          meeting_minutes: existing.meeting_minutes || '[]',
          leads: existing.leads || '[]',
          service_materials: existing.service_materials || '[]'
        };
        updateValues[fieldName] = jsonData;
      } else {
        // 既存レコードがない場合：デフォルト値で初期化して対象フィールドを設定
        updateValues = {
          tasks: '[]',
          projects: '[]',
          sales: '[]',
          team_members: '[]',
          meetings: '[]',
          activities: '[]',
          documents: '[]',
          meeting_minutes: '[]',
          leads: '[]',
          service_materials: '[]'
        };
        updateValues[fieldName] = jsonData;
      }
      
      // UPSERT（存在すればUPDATE、なければINSERT）
      await pool.query(
        `INSERT INTO team_data (team_id, tasks, projects, sales, team_members, meetings, activities, documents, meeting_minutes, leads, service_materials)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (team_id)
        DO UPDATE SET tasks = EXCLUDED.tasks, projects = EXCLUDED.projects, sales = EXCLUDED.sales,
                       team_members = EXCLUDED.team_members, meetings = EXCLUDED.meetings, activities = EXCLUDED.activities,
                       documents = EXCLUDED.documents, meeting_minutes = EXCLUDED.meeting_minutes,
                       leads = EXCLUDED.leads, service_materials = EXCLUDED.service_materials`,
        [teamId, updateValues.tasks, updateValues.projects, updateValues.sales, 
         updateValues.team_members, updateValues.meetings, updateValues.activities,
         updateValues.documents, updateValues.meeting_minutes, updateValues.leads, updateValues.service_materials]
      );
      socket.to(teamId).emit('data-updated', { dataType, data: newData });
    } catch (error) {
      console.error('Socket data update error:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// サーバー起動
const startServer = async () => {
  try {
    // データベース初期化
    await initializeDatabase();
    console.log('データベース初期化完了');
    
    // サーバー起動
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`Socket URL: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('サーバー起動エラー:', error);
    process.exit(1);
  }
};

startServer();
