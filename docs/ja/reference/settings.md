# VS Code 設定リファレンス

VS Code の `settings.json` を通じて、拡張機能の各種動作やフォールバック設定をカスタマイズできます。

## 設定キー一覧

### プレビューと同期

- `md-tech-pdf.preview.refresh`: プレビュー自動更新の契機（`"onType"`, `"onSave"`, `"manual"`）。
- `md-tech-pdf.preview.debounceDelay`: 入力中自動更新（`onType`）の待機時間ミリ秒（既定値: `500`、最小: `100`、最大: `5000`）。
- `md-tech-pdf.preview.scrollSync.enabled`: 双方向スクロール同期の有効/無効（既定値: `true`）。
- `md-tech-pdf.preview.scrollSync.behavior`: スクロールアニメーション挙動（`"smooth"` または `"instant"`）。
- `md-tech-pdf.preview.scrollSync.delay`: エディタ可視範囲同期のデバウンス時間ミリ秒（既定値: `50`）。
- `md-tech-pdf.preview.zoom`: プレビュー初期表示倍率（`"fit"`, `"50%"`, `"75%"`, `"100%"`, `"125%"`, `"150%"`）。
- `md-tech-pdf.preview.cache.persistent`: ダイアグラムのディスク永続キャッシュ有効化（既定値: `true`）。

### Front Matter 未指定時のデフォルト設定

Front Matter に記述がない場合にフォールバック適用される値です:

- `md-tech-pdf.default.pdf.format`: 用紙サイズ（既定値: `"A4"`）。
- `md-tech-pdf.default.pdf.landscape`: 横向き用紙フラグ（既定値: `false`）。
- `md-tech-pdf.default.pdf.margin.top / bottom / left / right`: 各余白（既定値: `"15mm"`）。
- `md-tech-pdf.default.diagram.width / height`: ダイアグラムの既定幅・高さ（既定値: `""`）。
- `md-tech-pdf.default.diagram.fit`: ダイアグラムのフィット方式（`"contain"` または `"fill"`）。
- `md-tech-pdf.default.diagram.align`: ダイアグラムの配置（`"center"`, `"left"`, `"right"`）。
- `md-tech-pdf.default.style.font.family`: 本文の既定フォントファミリー。
- `md-tech-pdf.default.style.font.codeFamily`: コードブロックの既定フォントファミリー。
- `md-tech-pdf.default.style.font.google.families`: 読み込む Google Fonts オブジェクトの配列。

### エクスポートとツール

- `md-tech-pdf.export.outputDirectory`: PDF 出力先ディレクトリの相対または絶対パス。
- `md-tech-pdf.export.afterExport`: PDF 出力完了後の動作（`"none"`, `"open"`, `"reveal"`）。
- `md-tech-pdf.styles`: ワークスペース全体で共通適用する CSS ファイルパスの配列。
- `md-tech-pdf.plantuml.javaPath`: 独自の `java` バイナリパス。
- `md-tech-pdf.plantuml.jarPath`: 独自の `plantuml.jar` のパス。
