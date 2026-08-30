# 自学サポート

小学3〜6年生が「何を・なぜ・どうやって学ぶか」を自分で決め、紙のノートで家庭学習を進めるためのWebアプリです。

最終ゴールは、このアプリを使い続けることではありません。子どもがアプリを見なくても、自分で自学を決め、確かめ、振り返れるようになることです。

## 学習の流れ

`決める → めあてをもつ → ノートで学ぶ → 確かめる → 振り返る`

- 今日の気持ち・時間・教科から3候補を提案
- 224件の自学メニューを教科・型・時間で検索
- 4つの型（解く／まとめる／調べる／覚える）からノート上の手順を生成
- テスト予定に応じた穏やかな提案
- 学習資料・既存Learning Portal教材への案内
- 日付・教科・メニューID・時間目安・完了だけを端末内に記録

ランキング、連続日数、ページ数評価、アカウント、通信、AI APIはありません。

## ファイル

- `index.html` — アプリの入口
- `style.css` — あたたかい教室・ノート調のレスポンシブUI
- `app.js` — 画面、推薦、予定、記録、localStorage連携
- `data/menus.js` — 224件の自学メニューと4型テンプレート

## メニュー数

| 教科 | 数 |
| --- | ---: |
| 国語 | 45 |
| 算数 | 56 |
| 理科 | 44 |
| 社会 | 44 |
| 英語 | 15 |
| 教科横断 | 20 |
| 合計 | 224 |

各メニューは `id / subject / title / type / grades / difficulty / minutes / purposes / whenToUse / materials / goalExample / instruction / customSteps / reflectionPrompts / testRecommended / relatedResources` を持ちます。

## 技術

HTML / CSS / Vanilla JavaScriptのみ。ビルド不要でGitHub Pagesから動作します。保存には `edu-components` の `StorageManager` をローカル同梱して使い、`edu:jigaku-coach-v1:*` のnamespaceに集約しています。

Web画像は `navi-character-` の実在する軽量WebPを参照し、画像が読み込めない場合も学習導線は止まりません。

## 設計基準

[TT-sensei/edu-kit](https://github.com/TT-sensei/edu-kit) の設計原則、開発プロトコル、ナビキャラ利用原則、タブレット最適化、最終点検に準拠しています。
