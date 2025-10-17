# Reflex Board Frontend

ラズベリーパイ上で動作する反射神経トレーニング用デバイスのための Next.js 製ダッシュボードです。物理ボードのボタン配置をブラウザ上で再現し、Python バックエンドから送られてくるアクティブなボタン情報をリアルタイムに表示します。

## プロジェクト概要
- Next.js 15 + React 19 によるシングルページアプリケーション
- Tailwind CSS v4 ベースのスタイルと shadcn/ui コンポーネント
- `config/default-button-layout.json` によるボタンレイアウト設定と `/editor` GUI での編集
- Server-Sent Events (SSE) による低遅延なボタン状態同期 (`/api/active-buttons/stream`)
- Biome + lefthook による自動整形・静的解析ワークフロー

## 動作要件
- Git
- [Volta](https://volta.sh/) （Node.js / pnpm のバージョン固定に使用）
- プロジェクトが要求する Node.js 22.18.0 / pnpm 10.15.0（Volta 経由で自動指定）

## 環境構築
1. Volta をインストール
   ```bash
   curl https://get.volta.sh | bash
   exec $SHELL
   ```
2. 要求されるランタイムを Volta で導入（グローバル）
   ```bash
   volta install node@22.18.0 pnpm@10.15.0 corepack
   ```
   プロジェクト内の `package.json` にも Volta 設定があるため、リポジトリに入ると自動的に同じバージョンが利用されます。
3. 依存関係をインストール
   ```bash
   pnpm install
   ```
4. 開発サーバーを起動
   ```bash
   pnpm dev
   ```
   既定では `http://localhost:3000` で動作します。Python バックエンドからは `http://127.0.0.1:3000` に対してリクエストを送ってください。
5. （任意）Git フックを有効化
   ```bash
   pnpm lefthook install
   ```

## よく使うコマンド
- `pnpm dev` : Turbopack で開発サーバーを起動
- `pnpm build` : 本番ビルドを作成
- `pnpm start` : 本番ビルドをローカルで確認
- `pnpm lint` : Biome で静的解析
- `pnpm format` : Biome で整形

## ボタンレイアウト設定
`config/default-button-layout.json` が画面のボタン配置を定義します。例：
```json
{
  "name": "default",
  "width": 320,
  "height": 180,
  "buttons": [
    { "id": "1", "label": "1", "position": { "x": 160, "y": 28 }, "diameter": 40 },
    { "id": "2", "label": "2", "position": { "x": 248, "y": 36 }, "diameter": 40 }
  ],
  "player": { "position": { "x": 160, "y": 90 }, "iconSize": 48, "color": "#57534e" }
}
```
主なフィールド
- `width` / `height` : 仮想キャンバスのサイズ。座標系はこの値に合わせて正規化されます。
- `buttons[].position` : ボタン中心の座標。`diameter` は同じ座標系で指定します（未指定時は 32）。
- `inactiveColor` / `activeColor` : Tailwind テーマの代わりに個別色を使いたい場合のオプション。
- `player` : 任意。表示したい場合は位置・アイコンサイズ・色を設定します。

GUI で編集したい場合は `pnpm dev` 実行中にブラウザで `/editor` を開き、レイアウトを調整して生成された JSON をコピーし、このファイルを更新してください。

## フロントエンド API
| メソッド | パス | 内容 |
|----------|------|------|
| GET | `/api/button-layout` | 現在のレイアウトを JSON で返却します。
| GET | `/api/active-buttons` | `{ activeButtonIds, updatedAt }` のスナップショットを返却します。
| POST | `/api/active-buttons` | `{ "activeButtonIds": ["id", ...] }` を受け取り、状態を更新します。
| GET | `/api/active-buttons/stream` | SSE ストリームを開始し、状態変更を即時配信します。

Python から状態を更新する例：
```python
import requests

payload = {"activeButtonIds": ["1", "3", "5"]}
requests.post("http://127.0.0.1:3000/api/active-buttons", json=payload, timeout=1)
```

## 運用メモ
- ボタン状態は Next.js サーバー内にのみ保持され、永続化は行いません。複数端末で共有したい場合は別途データストアを追加してください。
- 複数台のラズベリーパイで利用する場合はインスタンスを分けるか、エンドポイントを拡張して名前空間管理を検討してください。
- レイアウト JSON は静的アセットとして配信されます。デプロイごとに最適なファイルを同梱してください。
