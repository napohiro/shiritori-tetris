# しりとりテトリス — WORD CHAIN PUZZLE

言葉をつなげて、3語以上のしりとりを消すパズルゲームです。

## 起動方法

```bash
# 依存パッケージをインストール（初回のみ）
npm install

# 開発サーバーを起動（http://localhost:5173）
npm run dev

# プロダクションビルド
npm run build

# ビルド結果をプレビュー
npm run preview
```

スマホでプレイしたい場合は、`npm run dev` 後に表示されるネットワークURLからアクセスしてください。

## ゲームルール

| 項目 | 内容 |
|------|------|
| 盤面 | 横8マス × 縦10マス |
| 操作 | 「↓」ボタンで列を選んでブロックを落とす |
| 消去 | 縦・横・斜めに3語以上のしりとりが成立すると消える |
| 連鎖 | 消えた後にブロックが落ちてさらに成立 → コンボボーナス |
| ゲームオーバー | 全列が最上段まで埋まったとき |

### しりとり判定

- 前の単語の**最後の文字** ＝ 次の単語の**最初の文字** で成立
- 小文字（ゃ・ゅ・ょ・っ等）は大文字扱いで判定
- 長音符「ー」は直前の文字として処理
- 「ん」で終わる単語はその先へ続けられない
- 逆方向から読んでも成立する場合は消去対象

### スコア

```
1消去あたり 100点 × コンボ数
```

## ファイル構成

```
src/
  logic/
    types.ts        型定義・定数
    words.ts        単語データ・カラー管理
    shiritori.ts    しりとり判定ロジック
    gameLogic.ts    ゲーム本体（配置・重力・連鎖）
  components/
    TopScreen.tsx   タイトル画面
    GameScreen.tsx  ゲームメイン
    GameBoard.tsx   盤面グリッド
    ColumnSelector.tsx  列選択ボタン
    NextWordCard.tsx    次の言葉表示
    ScoreBar.tsx    スコア表示
    ComboOverlay.tsx    コンボ演出
    PauseModal.tsx  一時停止モーダル
    GameOverModal.tsx   ゲームオーバー画面
    HowToPlay.tsx   遊び方モーダル
  App.tsx           ルーティング
  main.tsx          エントリーポイント
  index.css         全スタイル
```
