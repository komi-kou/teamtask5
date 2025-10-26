const { Pool } = require('pg');

// インメモリデータストア（開発環境のフォールバック用）
let inMemoryStore = {
  users: new Map(),
  teams: new Map(),
  teamData: new Map()
};

// データベース接続設定
let pool;
let useInMemory = false;

// 本番環境またはDATABASE_URLが設定されている場合はPostgreSQLを使用
if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/teamtask',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  // 開発環境でPostgreSQLが利用できない場合はインメモリストアを使用
  console.log('⚠️ PostgreSQLが利用できません。インメモリストアを使用します（データは永続化されません）');
  useInMemory = true;
  
  // Poolのモック
  pool = {
    query: async (query, params) => {
      // 簡易的なSQLパーサー（主要なクエリのみ対応）
      const queryLower = query.toLowerCase();
      
      if (queryLower.includes('create table')) {
        return { rows: [] };
      }
      
      if (queryLower.includes('select') && queryLower.includes('from users')) {
        const email = params?.[0];
        const user = Array.from(inMemoryStore.users.values()).find(u => u.email === email);
        return { rows: user ? [user] : [] };
      }
      
      if (queryLower.includes('select') && queryLower.includes('from teams')) {
        const code = params?.[0];
        const team = Array.from(inMemoryStore.teams.values()).find(t => t.code === code);
        return { rows: team ? [team] : [] };
      }
      
      if (queryLower.includes('select') && queryLower.includes('from team_data')) {
        const teamId = params?.[0];
        const data = inMemoryStore.teamData.get(teamId);
        return { rows: data ? [data] : [] };
      }
      
      if (queryLower.includes('insert into users')) {
        const [id, username, email, password, team_id, team_name, role] = params;
        const user = { id, username, email, password, team_id, team_name, role, created_at: new Date() };
        inMemoryStore.users.set(id, user);
        return { rows: [user] };
      }
      
      if (queryLower.includes('insert into teams')) {
        const [id, name, code, owner_id, members] = params;
        const team = { id, name, code, owner_id, members, created_at: new Date() };
        inMemoryStore.teams.set(id, team);
        return { rows: [team] };
      }
      
      if (queryLower.includes('insert into team_data')) {
        const teamId = params[0];
        const data = {
          team_id: teamId,
          tasks: params[1] || '[]',
          projects: params[2] || '[]',
          sales: params[3] || '[]',
          team_members: params[4] || '[]',
          meetings: params[5] || '[]',
          activities: params[6] || '[]',
          documents: params[7] || '[]',
          meeting_minutes: params[8] || '[]',
          leads: params[9] || '[]',
          service_materials: params[10] || '[]',
          updated_at: new Date()
        };
        
        // UPSERT処理
        if (queryLower.includes('on conflict')) {
          inMemoryStore.teamData.set(teamId, data);
        } else if (!inMemoryStore.teamData.has(teamId)) {
          inMemoryStore.teamData.set(teamId, data);
        }
        return { rows: [data] };
      }
      
      if (queryLower.includes('update users')) {
        // 簡易的なUPDATE処理
        const teamId = params[0];
        const teamName = params[1];
        const userId = params[2];
        const user = inMemoryStore.users.get(userId);
        if (user) {
          user.team_id = teamId;
          user.team_name = teamName;
        }
        return { rows: [] };
      }
      
      if (queryLower.includes('update teams')) {
        // 簡易的なUPDATE処理（メンバー追加）
        const members = params[0];
        const teamId = params[1];
        const team = inMemoryStore.teams.get(teamId);
        if (team) {
          team.members = members;
        }
        return { rows: [] };
      }
      
      return { rows: [] };
    }
  };
}

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
        documents JSONB DEFAULT '[]',
        meeting_minutes JSONB DEFAULT '[]',
        leads JSONB DEFAULT '[]',
        service_materials JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('データベーステーブルが正常に作成されました');
    
    // 既存のテーブルに新しいカラムを追加（既存のデータベース対応）
    try {
      // documentsカラムの追加
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_data' AND column_name = 'documents'
          ) THEN
            ALTER TABLE team_data ADD COLUMN documents JSONB DEFAULT '[]';
          END IF;
        END $$;
      `);
      
      // meeting_minutesカラムの追加
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_data' AND column_name = 'meeting_minutes'
          ) THEN
            ALTER TABLE team_data ADD COLUMN meeting_minutes JSONB DEFAULT '[]';
          END IF;
        END $$;
      `);
      
      // leadsカラムの追加
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_data' AND column_name = 'leads'
          ) THEN
            ALTER TABLE team_data ADD COLUMN leads JSONB DEFAULT '[]';
          END IF;
        END $$;
      `);
      
      // service_materialsカラムの追加
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'team_data' AND column_name = 'service_materials'
          ) THEN
            ALTER TABLE team_data ADD COLUMN service_materials JSONB DEFAULT '[]';
          END IF;
        END $$;
      `);
      
      console.log('既存テーブルへの新しいカラム追加を確認しました');
    } catch (error) {
      console.log('新しいカラムの追加チェック中:', error.message);
    }
    
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
