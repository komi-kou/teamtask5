const { Pool } = require('pg');

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/teamtask',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// データベース初期化
const initializeDatabase = async () => {
  try {
    console.log('データベース接続を確認中...');
    
    // テーブル作成
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        team_id VARCHAR(50),
        team_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) UNIQUE NOT NULL,
        owner_id VARCHAR(50) NOT NULL,
        members TEXT[] DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS team_data (
        team_id VARCHAR(50) PRIMARY KEY,
        tasks JSONB DEFAULT '[]',
        projects JSONB DEFAULT '[]',
        sales JSONB DEFAULT '[]',
        team_members JSONB DEFAULT '[]',
        meetings JSONB DEFAULT '[]',
        activities JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('データベーステーブルが正常に作成されました');
    
    // テストユーザーの作成
    const testUserExists = await pool.query('SELECT id FROM users WHERE email = $1', ['test@example.com']);
    if (testUserExists.rows.length === 0) {
      const testUserId = Math.random().toString(36).substr(2, 9);
      const testTeamId = Math.random().toString(36).substr(2, 9);
      const testTeamCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      // テストチーム作成
      await pool.query(`
        INSERT INTO teams (id, name, code, owner_id, members)
        VALUES ($1, $2, $3, $4, $5)
      `, [testTeamId, 'テストチーム', testTeamCode, testUserId, [testUserId]]);

      // テストユーザー作成
      await pool.query(`
        INSERT INTO users (id, username, email, password, team_id, team_name, role)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [testUserId, 'テストユーザー', 'test@example.com', 'password', testTeamId, 'テストチーム', 'owner']);

      // テストデータ作成
      await pool.query(`
        INSERT INTO team_data (team_id, tasks, projects, sales)
        VALUES ($1, $2, $3, $4)
      `, [
        testTeamId,
        JSON.stringify([
          { id: Math.random().toString(36).substr(2, 9), title: 'テストタスク1', description: 'これはテストタスク1です。', status: 'todo', assignedTo: testUserId, dueDate: '2025-12-01' },
          { id: Math.random().toString(36).substr(2, 9), title: 'テストタスク2', description: 'これはテストタスク2です。', status: 'in-progress', assignedTo: testUserId, dueDate: '2025-12-05' }
        ]),
        JSON.stringify([
          { id: Math.random().toString(36).substr(2, 9), name: 'テストプロジェクトA', description: 'プロジェクトAの説明', status: 'active', startDate: '2025-10-01', endDate: '2026-03-31', members: [testUserId] }
        ]),
        JSON.stringify([
          { id: Math.random().toString(36).substr(2, 9), customerName: 'テスト顧客X', amount: 100000, status: 'pending', contactDate: '2025-10-15' }
        ])
      ]);

      console.log('テストユーザー作成: test@example.com / password');
      console.log('テストチームコード: ' + testTeamCode);
    }

  } catch (error) {
    console.error('データベース初期化エラー:', error);
    throw error;
  }
};

module.exports = { pool, initializeDatabase };
