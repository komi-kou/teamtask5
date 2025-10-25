const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');
const { pool, initializeDatabase } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ミドルウェア
app.use(cors());
app.use(express.json());

// メモリ内データベース（テスト用）
let users = [];
let teams = [];
let teamData = {};

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
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'このメールアドレスは既に使用されています' });
    }

    const userId = generateId();
    const teamId = generateId();

    // 個人用チームを自動作成
    teams.push({
      id: teamId,
      name: `${username}のチーム`,
      code: generateTeamCode(),
      ownerId: userId,
      members: [userId],
      createdAt: new Date().toISOString()
    });
    
    teamData[teamId] = {
      tasks: [],
      projects: [],
      sales: [],
      teamMembers: [],
      meetings: [],
      activities: []
    };

    // ユーザー作成
    const user = {
      id: userId,
      username,
      email,
      password, // パスワードを保存
      teamId,
      teamName: `${username}のチーム`,
      role: 'owner',
      createdAt: new Date().toISOString()
    };

    users.push(user);
    console.log('User created:', user);
    console.log('Total users:', users.length);

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
        id: user.id,
        username: user.username,
        email: user.email,
        teamId: user.teamId,
        teamName: user.teamName,
        role: user.role,
        createdAt: user.createdAt
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
    const user = users.find(u => u.email === email);
    console.log('User found:', user);
    console.log('Total users:', users.length);
    
    if (!user) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // パスワード検証（実際のアプリではハッシュ化されたパスワードと比較）
    if (password !== user.password) {
      return res.status(401).json({ message: 'メールアドレスまたはパスワードが正しくありません' });
    }

    // チーム情報取得
    let teamName = null;
    if (user.teamId) {
      const team = teams.find(t => t.id === user.teamId);
      teamName = team ? team.name : null;
    }

    // JWTトークン生成
    const token = jwt.sign(
      { userId: user.id, email: user.email, teamId: user.teamId },
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
        teamId: user.teamId,
        teamName: teamName,
        role: user.role,
        createdAt: user.createdAt
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
    const team = teams.find(t => t.code === teamCode);
    if (!team) {
      return res.status(404).json({ message: 'チームが見つかりません' });
    }

    // ユーザーをチームに追加
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    user.teamId = team.id;
    user.teamName = team.name;
    team.members.push(userId);

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
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({ message: 'ユーザーが見つかりません' });
    }

    // チーム情報取得
    let teamName = null;
    if (user.teamId) {
      const team = teams.find(t => t.id === user.teamId);
      teamName = team ? team.name : null;
    }

    res.json({
      success: true,
      user: {
        ...user,
        teamName
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
    const user = users.find(u => u.id === userId);
    
    if (!user || !user.teamId) {
      return res.json({ data: {} });
    }

    const data = teamData[user.teamId] || {};
    res.json({ data });
  } catch (error) {
    console.error('Get all data error:', error);
    res.status(500).json({ message: 'サーバーエラーが発生しました' });
  }
});

app.get('/api/data/:dataType', authenticateToken, async (req, res) => {
  try {
    const { dataType } = req.params;
    const userId = req.user.userId;
    const user = users.find(u => u.id === userId);
    
    if (!user || !user.teamId) {
      return res.json({ data: [] });
    }

    const data = teamData[user.teamId]?.[dataType] || [];
    res.json({ data });
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
    const user = users.find(u => u.id === userId);
    
    if (!user || !user.teamId) {
      return res.status(400).json({ message: 'チームに所属していません' });
    }

    if (!teamData[user.teamId]) {
      teamData[user.teamId] = {};
    }

    teamData[user.teamId][dataType] = data;

    // Socket.ioでリアルタイム更新を通知
    io.to(user.teamId).emit('data-updated', {
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

// Socket.io接続処理
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-team', (teamId) => {
    socket.join(teamId);
    console.log(`User ${socket.id} joined team ${teamId}`);
  });

  socket.on('data-update', (data) => {
    const { teamId, dataType, data: newData } = data;
    if (teamData[teamId]) {
      teamData[teamId][dataType] = newData;
      socket.to(teamId).emit('data-updated', { dataType, data: newData });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// サーバー起動
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API URL: http://localhost:${PORT}/api`);
  console.log(`Socket URL: http://localhost:${PORT}`);
});

// テスト用データの初期化
const initTestData = () => {
  console.log('Initializing test data...');
  
  // テストユーザーを作成
  const testUserId = generateId();
  const testTeamId = generateId();
  const testTeamCode = generateTeamCode();
  
  users.push({
    id: testUserId,
    username: 'テストユーザー',
    email: 'test@example.com',
    teamId: testTeamId,
    teamName: 'テストチーム',
    role: 'owner',
    createdAt: new Date().toISOString()
  });
  
  teams.push({
    id: testTeamId,
    name: 'テストチーム',
    code: testTeamCode,
    ownerId: testUserId,
    members: [testUserId],
    createdAt: new Date().toISOString()
  });
  
  teamData[testTeamId] = {
    tasks: [],
    projects: [],
    sales: [],
    teamMembers: [],
    meetings: [],
    activities: []
  };
  
  console.log(`Test user created: test@example.com / password`);
  console.log(`Test team code: ${testTeamCode}`);
};

initTestData();
