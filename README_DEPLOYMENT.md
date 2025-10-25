# デプロイメントガイド

このアプリケーションをデプロイして、チーム全員で共通のデータを使用できるようにするための手順です。

## 必要な要件

- Node.js 18+ 
- MongoDB データベース（MongoDB Atlas推奨）
- デプロイ先（Vercel, Railway, Render.com など）

## セットアップ手順

### 1. MongoDB Atlas の設定

1. [MongoDB Atlas](https://www.mongodb.com/atlas) でアカウントを作成
2. 新しいクラスターを作成（無料プランで十分）
3. データベースユーザーを作成
4. ネットワークアクセスで「0.0.0.0/0」を許可（全IPからのアクセスを許可）
5. 接続文字列を取得

### 2. 環境変数の設定

`server/.env` ファイルを作成：

```env
# MongoDB Atlas の接続文字列
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/team_management

# JWT シークレット（ランダムな文字列を生成）
JWT_SECRET=your-super-secret-jwt-key-change-this

# サーバーポート
PORT=5000

# フロントエンドURL（本番環境用）
CLIENT_URL=https://your-frontend-url.vercel.app

# Node環境
NODE_ENV=production
```

### 3. デプロイオプション

#### オプション A: Render.com（推奨）

**バックエンド：**
1. [Render.com](https://render.com) でアカウント作成
2. 新しいWeb Serviceを作成
3. GitHubリポジトリを接続
4. 設定：
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && npm start`
5. 環境変数を設定

**フロントエンド：**
1. Render.comで新しいStatic Siteを作成
2. 設定：
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
3. 環境変数を追加：
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend.onrender.com
   ```

#### オプション B: Vercel + Railway

**バックエンド（Railway）：**
1. [Railway](https://railway.app) でプロジェクト作成
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ

**フロントエンド（Vercel）：**
1. [Vercel](https://vercel.com) でプロジェクト作成
2. GitHubリポジトリを接続
3. 環境変数を設定：
   ```
   REACT_APP_API_URL=https://your-backend.railway.app/api
   REACT_APP_SOCKET_URL=https://your-backend.railway.app
   ```

### 4. フロントエンドの環境変数

`.env.production` ファイルを作成：

```env
REACT_APP_API_URL=https://your-backend-url/api
REACT_APP_SOCKET_URL=https://your-backend-url
```

### 5. デプロイ後の初期設定

1. ブラウザでアプリケーションにアクセス
2. 最初のユーザーを登録（自動的に管理者になります）
3. チームコードを他のメンバーに共有
4. 他のメンバーはチームコードで参加

## データの永続化

- **MongoDB Atlas** を使用することで、データは永続的に保存されます
- 全てのチームメンバーが同じデータを共有
- リアルタイムで更新が同期されます

## セキュリティ設定

1. **JWT_SECRET** は必ず強力なランダム文字列に変更
2. **CORS設定** で本番環境のURLのみ許可
3. **MongoDB** のネットワークアクセスを必要に応じて制限

## トラブルシューティング

### 接続エラーの場合
- MongoDB URIが正しいか確認
- 環境変数が正しく設定されているか確認
- CORSエラーの場合は、CLIENT_URLが正しいか確認

### データが同期されない場合
- WebSocket接続を確認
- ブラウザのコンソールでエラーを確認
- サーバーログを確認

## 推奨構成

- **フロントエンド**: Vercel または Netlify
- **バックエンド**: Render.com または Railway
- **データベース**: MongoDB Atlas（無料プラン）

この構成により、月額無料でチーム管理ツールを運用できます。