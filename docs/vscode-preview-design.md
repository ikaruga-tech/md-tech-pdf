# md-tech-pdf VS Code Preview 機能設計書

## 概要

本ドキュメントは、md-tech-pdf VS Code Extensionにおいて、Markdownファイルの編集内容をリアルタイムまたは準リアルタイムに確認できるPreview機能の要件定義およびアーキテクチャ設計を定めたものです。
本設計は、PDF出力結果と極めて近いレイアウト（A4用紙模倣・余白・タイポグラフィ・Mermaid/PlantUML図表）を再現し、既存のmd-tech-pdf Core資産を最大限に再利用することを目的としています。

## 1. Goals and Non Goals

### 1.1 Goals

- VS Codeのエディタ横にWebviewPanelを配置し、PDF出力イメージを事前確認できるプレビュー環境を提供する。
- md-tech-pdf CoreのHTML生成処理（HtmlRenderer, buildCompleteHtml）を直接再利用し、レンダリングロジックの二重化を完全に防止する。
- MermaidおよびPlantUMLのベクターSVGレンダリング、Front Matter設定（用紙サイズ・向き・余白・フォント）、タイポグラフィスタイルを忠実に再現する。
- ドキュメント単位の厳格なWebviewPanelライフサイクル管理を行い、メモリリークを防止する。
- 堅牢なContent Security Policy（CSP）を適用し、スクリプト実行を制限した安全なWebviewを実現する。
- 大規模文書や重いダイアグラム（PlantUML等）でもエディタの操作性を損なわない更新・負荷制御戦略を確立する。

### 1.2 Non Goals (v0.3.0)

- Scroll Sync（エディタとプレビューのスクロール位置自動同期）：v0.3.0初期リリースでは必須とせず、将来フェーズでの検討対象とする。
- Custom Editor：Markdownエディタ自体を置き換える実装は行わない。
- プレビュー内でのWYSIWYG編集やダイアグラム直接編集UI。
- プレビュー専用の重厚な独自ツールバーUI（VS Code標準のタイトルバーアイコンやコマンドに委託する）。
- 完全なブラウザ内自動ページ分割エンジン（Paged.js等の重厚な外部ライブラリ導入は行わず、CSSコンテナによる用紙模倣と改ページ境界の視覚的表示に留める）。

## 2. UX and コマンド設計

### 2.1 コマンド体系

以下のコマンドをVS Code Extensionに登録します。

- コマンドID: `md-tech-pdf.openPreview`
- タイトル: `md-tech-pdf: Open Preview`
- 動作:
  - アクティブなMarkdownエディタ、または指定されたMarkdownファイルのプレビューを `ViewColumn.Beside`（エディタの右横）に開く。
  - すでに該当ファイルのプレビューが存在する場合は、新規作成せず既存パネルをアクティブ（reveal）にする。

### 2.2 UIトリガーの配置

ユーザーが直感的にプレビューを呼び出せるよう、以下の3箇所にトリガーを配置します。

1. エディタタイトルバー右上（`editor/title`）:
   - アイコン: `$(open-preview)`
   - グループ: `navigation`
   - 表示条件: `resourceExtname == .md || resourceExtname == .markdown`
2. エクスプローラーコンテキストメニュー（`explorer/context`）:
   - 対象: `.md` および `.markdown` ファイルの右クリック
   - グループ: `navigation@110`（既存のExport to PDFの下）
3. コマンドパレット（`Command Palette`）:
   - すべてのMarkdown編集時に検索・実行可能。

### 2.3 プレビューの画面構成と配置

- 配置: `ViewColumn.Beside` を基本とし、左右分割（左: Markdown Editor, 右: Preview）で表示します。
- タイトル: `Preview: <ファイル名>` とし、タブアイコンにはMarkdownまたはPDFを連想させる標準アイコンを割り当てます。
- ツールバー: VS CodeのWebviewタイトルバーに「Refresh」「Export to PDF」のアクションを追加可能とし、プレビュー内部には余計なボタン群を配置しません。

## 3. Preview表示方式の選定とアーキテクチャ

### 3.1 表示方式の比較検討

| 方式                        | 特徴                                            | 採用可否 | 理由                                                                                                         |
| --------------------------- | ----------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| A: WebviewPanel             | 独立したタブとしてエディタ横に表示              | 採用     | 編集とプレビューの並列表示（Side-by-Side）に最適であり、Coreが生成するHTML/CSS/インラインSVGを完全制御可能。 |
| B: Custom Editor            | ファイルを開くエディタ自体をWebviewで置き換え   | 不採用   | Markdownテキストを編集しながら確認する標準UXに反し、シンタックスハイライト等のエディタ機能を失う。           |
| C: 標準Markdown Preview拡張 | VS Code標準のMarkdownプレビューにプラグイン注入 | 不採用   | 標準プレビューのテーマCSSが強力に干渉し、PDF出力専用のタイポグラフィやA4用紙余白レイアウトが破壊される。     |

### 3.2 採用方式 VS Code WebviewPanel

md-tech-pdfのアイデンティティである「印刷・提出用PDFと高い表示整合性を持ったプレビュー」を達成するため、外部CSS干渉のない隔離された環境を持つ `WebviewPanel` を採用します。

## 4. Coreとの責務分離と再利用戦略

### 4.1 レンダリングパイプラインの共有

Preview機能は、CoreのHTML生成パイプラインを完全に共有します。Preview側でMarkdownパーサー（markdown-it等）を新規にインスタンス化したり、Mermaid/PlantUMLの独自解釈を行うことは厳禁とします。

```text
[Markdown Document]
        │
        ▼
[md-tech-pdf Core]
  ├─ parseFrontMatter()
  ├─ extractDiagramBlocks()
  ├─ HtmlRenderer.render()
  │     ├─ MermaidRenderer (Playwright SVG)
  │     ├─ PlantUmlRenderer (Java/Jar SVG)
  │     └─ MarkdownIt Parser + Token Transform
  └─ buildCompleteHtml()
        │
        ├──────────────────────────┐
        ▼                          ▼
   [WebviewPanel]            [PdfGenerator]
 (target: 'preview')        (target: 'pdf')
```

### 4.2 Core APIの拡張案

既存の `HtmlRenderer.render` および `buildCompleteHtml` に、レンダリングターゲットを指定できるオプションを追加します（既存呼び出しへの後方互換性を維持）。

```ts
export type RenderTarget = 'pdf' | 'preview';

export interface HtmlRenderOptions {
  title?: string;
  customCss?: string;
  documentOptions?: DocumentOptions;
  defaultOptions?: DocumentOptions;
  target?: RenderTarget; // デフォルトは 'pdf'
  cspSource?: string; // Webview CSP生成用
  localResourceRoots?: string[];
}
```

- `target: 'pdf'`: 既存通りの印刷用CSSを出力。
- `target: 'preview'`: 用紙模倣コンテナ（グレー背景、用紙シャドウ）用のCSSクラスおよびスタイル定義を付与。

## 5. Front Matter と PDF用紙模倣プレビュー設計

### 5.1 PDF用紙模倣のUXコンセプト

ブラウザ幅に無秩序に広がる通常のWebプレビューではなく、実際の印刷用紙を机の上に置いたような「用紙模倣プレビュー」を実装します。

- 背景: 薄いグレー（VS Codeのテーマに応じた背景色、例: lightモード時は `#eef0f3`、darkモード時は `#1e1e1e` に適応した中立グレー）。
- 用紙シート:
  - 背景色: 白（`#ffffff`、用紙実寸）。
  - シャドウ: `box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12)` による立体感の演出。
  - 中央揃え（`margin: 24px auto`）。
  - 余白（Padding）: Front Matterで指定された `pdf.margin`（デフォルト20mm）を直接用紙の内側パディングとして適用。

### 5.2 Front Matterパラメータの反映仕様

| Front Matter項目                        | プレビューへの反映方法                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `pdf.format` (A4, A3, Letter等)         | 用紙コンテナの幅（例: A4縦なら 210mm、Letterなら 8.5in）として反映。                |
| `pdf.landscape` (true / false)          | 横向き指定時、用紙コンテナの幅と最小高さを反転（A4横なら 幅297mm、最小高さ210mm）。 |
| `pdf.margin` (top, right, bottom, left) | 用紙コンテナの `padding` にマッピング。                                             |
| `style.font` (family, codeFamily)       | プレビュー本文およびコードブロックのフォントファミリーに直接適用。                  |
| `style.font.google`                     | Google Fontsの読み込みリンクを生成し適用。                                          |
| `mermaid.theme`                         | Mermaidの描画テーマ（default, neutral, dark等）に反映。                             |

### 5.3 改ページ境界の視覚的表現

完全な自動改ページ計算は負荷が過大となるため、v0.3.0では以下の軽量ハイブリッド方式を採用します。

- 見出しタグ（H1〜H3）や明示的な改ページ指定（`page-break-before: always` や `hr`）の直前に、薄い破線インジケータ（`-- Page Break --`）を表示可能とするCSSスタイルを提供。
- これにより、どこで物理的な改ページが発生するかをプレビュー上で直感的に把握可能とします。

## 6. Mermaid 対応方針

### 6.1 Coreレンダラーの完全再利用

- 既存の `MermaidRenderer` / `MermaidExecutor` をそのまま利用します。
- Core側でPlaywright経由によりベクターSVGへ事前レンダリングされ、インライン `<svg>` としてHTMLに埋め込まれます。

### 6.2 メリットと整合性

- Webview内部で `mermaid.js` を実行する必要が一切ありません。
- Webviewのスクリプト実行を完全に禁止（`enableScripts: false`）でき、CSPが極めて堅牢になります。
- PDFとPreviewは同じCore生成SVGを利用するため、高い表示整合性を確保します。ただし、WebviewとChromium PDF rendering間のDPI・zoom・親CSS解釈等の差により微細な差異が生じる可能性があることに留意します。

## 7. PlantUML 対応方針

### 7.1 Coreレンダラーの完全再利用

- 既存の `PlantUmlRenderer` / `PlantUmlExecutor` をそのまま利用します。
- ローカル環境のJava実行バイナリおよびPlantUML JARパスは、VS Code設定（`md-tech-pdf.plantuml.javaPath`, `md-tech-pdf.plantuml.jarPath`）からCoreへと透過的に引き渡されます。

### 7.2 エラーハンドリングUX

PlantUML未インストールやダイアグラム構文エラー発生時のUXを以下のように定義します。

- 部分的エラー表示（Non-Fatal）:
  - ドキュメント全体のプレビュー描画を中断してはなりません。
  - 該当するコードブロックの位置に、赤い破線枠で囲まれた「PlantUML Rendering Error」コンテナを表示し、エラー詳細と行番号を埋め込みます。
- VS Code通知およびログ:
  - 出力チャンネル（`OutputChannel: md-tech-pdf`）に詳細なJava実行ログおよびスタックトレースを出力します。
  - ウィンドウ右下に「PlantUMLの描画でエラーが発生しました（詳細はOutputを参照）」とトースト通知（Warning）を表示します。

## 8. Font 対応方針

### 8.1 Google Fonts の対応

- Front Matterに `style.font.google` が指定されている場合、Coreの `buildGoogleFontsUrl` を利用してURLを構築します。
- WebviewのCSPにおいて、`https://fonts.googleapis.com`（スタイルシート取得）および `https://fonts.gstatic.com`（フォントファイル取得）を明示的に許可します。
- ネットワークオフライン時は、フォールバックのシステムフォント（`-apple-system`, `Yu Gothic`, `Noto Sans JP` 等）が適用されます。

### 8.2 Local Fonts の対応

- ローカルOSにインストールされたフォント名（例: `"Hiragino Sans"`, `"Meiryo"`）の指定は、CSSの `font-family` 宣言を通じてWebview内でそのまま機能します。
- ワークスペース内のフォントファイル（`.ttf`, `.woff2` 等）を参照する場合は、VS Codeのセキュリティ機構に基づき `panel.webview.asWebviewUri()` を介したURI変換が必要です。
- v0.3.0では、まずはOSインストール済みフォントおよびGoogle Fontsを完全サポートし、ローカルフォントファイル直接指定についてはCoreにURI解決フックを設けて対応します。

## 9. Security と Content Security Policy (CSP)

### 9.1 原則 スクリプト実行の抑制

WebviewPanelは原則として `enableScripts: false` で動作させます。
md-tech-pdfのプレビューは、Coreが生成した完成版HTML（静的DOMおよびインラインSVG）を描画する構成であり、クライアントサイドJavaScriptを必要としません。
JavaScript実行は `enableScripts: false` およびCSPにより強力に抑制されます。ただし、CoreのMarkdownパーサーが `html: true` として動作しraw HTMLを許容しているため、外部リソース読み込みやHTML要素固有の挙動については追加検証・制限が必要です。

### 9.2 CSPポリシーとリモート画像方針

Webviewの `<head>` 内に以下のCSPメタタグを注入します。

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'none';
  img-src ${webview.cspSource} data: https:;
  style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
  font-src ${webview.cspSource} data: https://fonts.gstatic.com;
"
/>
```

- `default-src 'none'`: 未許可のリソースへのアクセスを全遮断。
- `script-src`: 宣言しない（スクリプト実行完全不可）。
- `img-src ${webview.cspSource} data: https:`:
  - リモートHTTPS画像（`https:`）を正式サポートする方針（方針A）を採用。
  - 理由: 技術設計書において、GitHubバッジ、クラウドアーキテクチャ図、外部SaaSスクリーンショット等の外部HTTPS画像を参照するケースが標準的であり、PDF生成（Playwright）との表示整合性を保つため。
  - セキュリティ上の仕様と留意点:
    - プレビューを開いた際に外部サーバーとのHTTPS通信が発生すること。
    - リモートリソース取得に伴い、クライアントのIPアドレス等のメタデータが外部画像ホストへ送信され得ること（トラッキングピクセル等への留意が必要）。
    - Google Fontsは `style-src` および `font-src` で取得されるため、`img-src` とは独立しています。
    - MermaidおよびPlantUMLはCore側で事前変換されたインラインSVGまたはdata URIを使用するため、ダイアグラム描画自体には外部HTTPS画像権限は不要です。
- `style-src`: 組み込みCSSのための `'unsafe-inline'` および Google Fonts の読み込みを許可。
- `font-src`: Google Fonts配信サーバーおよびローカルフォントリソースを許可。

### 9.3 Raw HTML Security Limitation

CoreのMarkdownパーサーは `html: true` であるため、ユーザーが入力したraw HTMLがそのまま展開されます。各HTML要素について実際の挙動とセキュリティ評価は以下の通りです。

- `<script>`: `enableScripts: false` およびCSP（`script-src` 未宣言、`default-src 'none'`）により、ブラウザエンジンレベルで実行が完全に遮断されます。
- `<img onerror="...">` 等のインラインイベントハンドラ: 同様にCSPおよび `enableScripts: false` により実行遮断されます。
- `<iframe>`, `<object>`, `<embed>`: `frame-src`, `object-src` が未宣言（`default-src 'none'`）のため、外部フレーム読み込みやプラグイン実行はブロックされます。
- `<form>`, `<input>`: `form-action` が `default-src 'none'` によりブロックされ、外部送信は遮断されます。ただしinput要素のUI自体は描画されます。
- `<meta http-equiv="refresh">`: リダイレクト挙動はWebviewのサンドボックスおよびCSPによって抑止されますが、body内に展開された場合のブラウザ挙動の差異に留意が必要です。
- `<a href="...">`: Webview内での直接ページ遷移は抑止され、VS Codeの外部リンク処理機構に委ねられます。
- `<video>`, `<audio>`: `media-src` が未定義（`default-src 'none'`）のため、外部メディア読み込みはブロックされます。
- 結論: Phase 12.1時点では完全なHTML Sanitizerの導入は行わず、Phase 17に向けて危険タグの除去・サニタイズ（DOMPurify等）の導入を継続課題とします。

### 9.4 localResourceRoots ポリシー

最小権限の原則（Least Privilege）に基づき、ローカルファイルへのアクセス範囲を以下のように設計します。

- 許可範囲: Markdownファイルが配置されている親ディレクトリ（`[vscode.Uri.file(path.dirname(documentUri.fsPath))]`）のみに厳格に制限。
- Workspace Root除外の理由:
  - Phase 12時点では画像URIのローカル変換機構（`asWebviewUri`）を未導入であり、Webviewがワークスペース全体を探索する必要がないため。
  - プロジェクトルート直下の不要なファイル（設定ファイル、機密ファイル）へのアクセス権限をWebviewに不用意に与えないため。
  - 将来、`assets/`, `images/`, `fonts/` 等のワークスペース共通リソースへの相対参照対応が必要になった段階で、必要最小限の範囲を追加定義する設計を優先します。

## 10. Auto Refresh 戦略

Phase 16での実装に向け、Phase 11ではUXとアーキテクチャ方針を策定します。

### 10.1 課題認識

PlantUMLのJavaプロセス起動やMermaidのPlaywright処理は、数百ミリ秒から1秒程度のオーバーヘッドを伴う場合があります。キー入力ごとに愚直に全体再レンダリングを実行すると、CPU負荷が増大し、タイピング体験を著しく損なう危険があります。

### 10.2 更新トリガーの設計

以下の設定（`md-tech-pdf.preview.autoRefresh`）を提供します。

1. `onSave` (デフォルト推奨):
   - ファイル保存時（`onDidSaveTextDocument`）にプレビューを再生成。
   - 負荷が最も低く、確実に意図したタイミングで最新状態を確認できる。
2. `onType`:
   - エディタ変更時（`onDidChangeTextDocument`）に動作。
   - 400〜500msのdebounceタイマーを適用し、タイピング停止後に再生成。
3. `manual`:
   - コマンドまたはツールバーの「Refresh」実行時のみ更新。

### 10.3 パフォーマンス最適化境界（ダイアグラムキャッシュ）

将来的な `onType` の快適性確保のため、CoreとExtensionの間に「ダイアグラムキャッシュ境界」を設計します。
Markdown内の各ダイアグラムブロックの内容ハッシュ（SHA-256）を保持し、変更のないダイアグラムは前回の生成済みSVGを再利用することで、入力追従性を劇的に向上させます。

## 11. Preview 状態管理とライフサイクル

### 11.1 PreviewManager の責務

プレビューの生成、再利用、破棄を一元管理する `PreviewManager` クラスを設けます。

```ts
export class PreviewManager {
  private readonly panels = new Map<string, PreviewPanelInstance>();

  // ドキュメントURIをキーにして単一のWebviewPanelを保証
  async openPreview(documentUri: vscode.Uri, viewColumn: vscode.ViewColumn): Promise<void>;

  // ドキュメント変更・保存時の更新
  async refreshPreview(documentUri: vscode.Uri): Promise<void>;

  // クリーンアップ
  dispose(): void;
}
```

### 11.2 メモリリーク防止の徹底

- `Map<string, PreviewPanelInstance>` のキーには `document.uri.toString()` を使用。
- WebviewPanelがユーザーによって閉じられた際（`panel.onDidDispose`）、必ずMapから該当エントリを削除し、関連する購読（disposables）をすべて解放します。
- エディタ側でMarkdownファイルが閉じられた際（`onDidCloseTextDocument`）は、パネルを維持するか破棄するかを設定で選択可能とします（デフォルトは維持）。
- エクステンション非アクティブ化時（`deactivate`）には、管理下の全パネルを一括破棄します。

## 12. エラーハンドリング方針

エラーを致命的エラーと部分的エラーに分類し、適切なUXを提供します。

### 12.1 致命的エラー（Fatal Error）

- 対象: Markdownファイル自体の読み込み失敗、深刻な内部例外など。
- UX:
  - プレビュー内部にフレンドリーなエラーコンテナ（アイコン、エラーメッセージ、再試行ボタン）を表示。
  - VS Codeウィンドウ右下にエラー通知（Error Notification）を表示。

### 12.2 部分的エラー（Non-Fatal Error）

- 対象: Mermaid構文エラー、PlantUML構文エラー/Java未検出、Google Fontsの通信タイムアウトなど。
- UX:
  - ドキュメント全体の表示は維持。
  - 失敗したブロック要素のみエラープレースホルダーを表示。
  - Output Channel（`md-tech-pdf`）に詳細ログを出力し、ステータスバーまたは警告通知で穏やかに通知。

## 13. Performance 考慮事項

- WebviewPanelの再利用:
  - 内容更新時に毎回 `createWebviewPanel` を呼び出すのではなく、既存パネルの `panel.webview.html = newHtml` を更新することで瞬時切り替えを実現します。
- 不要な再描画の抑制:
  - プレビューパネルがバックグラウンドに隠れている場合（`panel.visible === false`）、再描画を保留し、再度アクティブになった際に更新します。
- 画像・リソースのローカル解決:
  - ワークスペース内の相対パス画像は `asWebviewUri` により効率的に読み込まれます。

## 14. Phase 17 に向けたテスト方針

Phase 17で実装・拡充するテストの構成案を策定します。

### 14.1 Unit Test

- `PreviewManager` のライフサイクル制御（単一性、再利用、dispose、Map登録解除）。
- CSPメタタグ生成ロジックの正当性検証。
- Preview用HTMLラッパー変換および用紙スタイル注入の検証。
- 相対パス画像およびフォントURIの `asWebviewUri` 変換処理。

### 14.2 Integration Test

- コマンド `md-tech-pdf.openPreview` 実行時のWebviewPanel生成テスト。
- Markdownドキュメント編集・保存イベントに伴うHTML更新テスト。
- MermaidブロックおよびPlantUMLブロックを含むMarkdownのプレビュー生成テスト。
- エラーハンドリング（PlantUML失敗時のフォールバックHTML生成）テスト。

### 14.3 Manual Test

- 日本語長文技術文書（`examples/real-world/system-design.md` 等）のレイアウト検証。
- 大規模テーブル、ネストしたリスト、長行コードブロックの折り返し・スクロール検証。
- Google Fontsおよびローカルフォントの表示確認。
- Light / Dark テーマ切り替え時の用紙外観視認性確認。

## 15. Phase 12 実装対象ファイル一覧

Phase 12（VS Code Preview機能の基礎実装）において作成・修正を予定するファイル群は以下の通りです。

### 15.1 vscode-extension 側

- [NEW] `src/preview/preview-manager.ts`: プレビューパネルのライフサイクル・状態管理。
- [NEW] `src/preview/preview-panel.ts`: 個別のWebviewPanelラッパー、HTML反映処理。
- [NEW] `src/preview/preview-style.ts`: 用紙模倣スタイル（用紙シャドウ・中央揃え・余白）のCSS定義。
- [NEW] `src/preview/csp-builder.ts`: セキュアなCSPメタタグ生成。
- [NEW] `src/commands/open-preview.ts`: `md-tech-pdf.openPreview` コマンドハンドラー。
- [MODIFY] `src/extension.ts`: コマンド登録および `PreviewManager` のライフサイクル統合。
- [MODIFY] `package.json`: コマンド定義、メニュー（エディタタイトルバー・コンテキストメニュー）登録、プレビュー関連設定の追加。

### 15.2 Core 側（必要に応じた最小限の拡張）

- [MODIFY] `src/html/html-renderer.ts` / `src/html/html-builder.ts`: `target: 'preview'` オプションおよびプレビュー用スタイルの受け入れ機構。
- [MODIFY] `src/index.ts`: 必要となるプレビュー補助型の公開。

## 16. Phase 13 実装仕様・表示品質および Core/PDF 整合性

Phase 13における品質検証およびCore/PDF整合性確立の成果と設計仕様を以下に規定します。

### 16.1 CSS・タイポグラフィの共通化方針

- Coreの `DEFAULT_DOCUMENT_STYLE`（`src/html/default-style.ts`）をプレビューでもそのまま全適用します。
- これにより、Pattern Dタイポグラフィ（本文 10.5pt / 行送り 1.7、H1 20pt/700、H2 16pt/700、H3 13pt/700、H4 11.5pt/400、表ヘッダー背景 `#f0f3f6`、コードブロック 9pt / 行送り 1.5）がPreviewとPDF出力で完全に同一のCSS規則として共有されます。
- `preview-style.ts` ではタイポグラフィ規則を重複定義せず、キャンバス背景色およびA4用紙シートのコンテナ装飾（余白、シャドウ、幅・高さ）のみを付与する責務分離を維持します。

### 16.2 ナロービューポート対応方針

- 課題:
  - VS Codeのエディタ分割幅がA4用紙幅（210mm ≒ 約794px）より狭い場合、Flexboxの標準挙動により用紙シートが潰れる問題が生じます。
  - さらに、親のFlexコンテナに `justify-content: center` を指定すると、用紙幅がビューポートを超えた際に中央揃え基準で左右均等にオーバーフローし、左側領域がスクロール不可領域（Unreachable left overflow）となって見出しや段落の左端が見切れる現象が発生します。
- 対策仕様:
  - キャンバスコンテナ（`.md-tech-pdf-preview-canvas`）に `overflow-x: auto` を指定。
  - キャンバスコンテナの配置に `justify-content: safe center` を指定。
    - 幅が十分ある場合（Wide viewport）: `center` として機能し、用紙シートを中央揃えで美麗に表示。
    - 幅が不足している場合（Narrow viewport）: `safe` キーワードにより自動的に `start` 配置へフォールバックし、用紙シートの左端（padding 16px分）をスクロール原点（`scrollLeft = 0`）に保持。
  - 用紙シートコンテナ（`.md-tech-pdf-preview-page`）に `flex-shrink: 0` を指定（用紙幅の維持）。
  - これにより、用紙サイズ（A4 210mm / 297mm）を完全に維持したまま、左端から右端までの全領域への横スクロール到達性を保証します。

### 16.3 用紙フォーマットと余白の整合性

- デフォルト余白の統一:
  - Coreの `DEFAULT_PDF_OPTIONS.margin` は `15mm` で統一されています。
  - `preview-style.ts` のデフォルトフォールバック余白を従来の `20mm` から `15mm` へ改定し、Front Matter未指定時におけるPDF出力との余白寸法の完全一致を達成しました。
- 用紙寸法の共有:
  - Coreの `src/config/document-options.ts` に `PAGE_FORMAT_DIMENSIONS`（A4: 幅210mm、高さ297mm）を定義・エクスポートし、Extension側と整合させています。

### 16.4 画像・リンクの表示仕様と差異

- リモートHTTPS画像:
  - CSP（`img-src https: data:`）により、GitHubバッジ等の外部HTTPS画像はプレビューとPDFの双方で表示可能です。
- ローカル相対パス画像:
  - 現時点（Phase 13）では、Webview内のローカル相対パス画像はVS Codeセキュリティ制限のため未表示となります（Phase 15にて `asWebviewUri` 変換機構を導入予定）。
  - 一方、PDF生成時はChromiumがローカルファイルシステムから直接読み込むため表示されます。
- 外部リンク:
  - プレビュー内の `<a>` タグはWebview内の直接画面遷移を行わず、VS Code既定の安全な外部ブラウザオープンに委ねられます。

### 16.5 プレビューとPDFの既知の相違点

| 項目               | VS Code プレビュー                                 | PDF 出力 (Playwright)                  |
| ------------------ | -------------------------------------------------- | -------------------------------------- |
| 描画エンジン       | VS Code Webview (Electron Chromium)                | Playwright Chromium Headless           |
| 改ページ           | 連続スクロール（1つの長い用紙シート）              | 物理的なページ分割（A4複数ページ）     |
| ヘッダー・フッター | 非表示（Phase 13時点）                             | PDF生成オプションにより付与可能        |
| ローカル画像パス   | 相対パスはPhase 15まで未解決                       | ローカルパスを直接読み込み表示         |
| フォント取得       | Webview CSP制限下でGoogle Fonts / ローカルフォント | システムフォント / Webフォント読み込み |

### 16.6 パフォーマンスベースライン計測結果

`tools/benchmark-preview.ts` を用いたレンダリング処理時間（HTML生成、5回実行平均）の計測値は以下の通りです。

- 小型文書（`examples/preview/markdown-elements.md`、ダイアグラムなし）: 平均 1.42ms
- 中型文書（`README.md`、表・リスト等の標準要素）: 平均 1.07ms
- 実世界大規模文書（`examples/real-world/system-design.md`、Mermaid 1件・PlantUML 3件を含む約28KB）: 平均 12,166ms (約12.1秒)

分析と考察:
ダイアグラムを含まない純粋なMarkdownレンダリングは1〜2msと極めて高速であり、UIブロッキングの懸念はありません。一方で、複数のダイアグラムを含む文書ではPlaywrightおよびJava起動の累積コストにより約12秒を要します。このため、Phase 16で実装予定の「保存時のみの更新（`onSave`）」や「ダイアグラムキャッシュ」が快適なプレビュー体験のために極めて重要であることが確認されました。

## 17. Phase 14 実装仕様・Diagram Preview 統合とエラー UX の確立

Phase 14におけるダイアグラム描画統合、エラー回復設計、および将来のキャッシュ境界仕様を以下に規定します。

### 17.1 ダイアグラムレンダリングアーキテクチャ

- Markdown内のフェンスブロック（`mermaid`, `plantuml`）は、Coreの `HtmlRenderer` によって検出され、既存の `MermaidRenderer` / `PlantUmlRenderer` を再利用してベクターSVGへ事前変換されます。
- Webview側でJavaScriptを実行せず、完成したインライン `<svg>` をHTMLボディに埋め込むことで、堅牢なCSP（`enableScripts: false`）とPDF出力との完全なレンダリング整合性を維持します。

### 17.2 部分エラー回復ポリシー（Preview vs PDF）

- Previewモード（`target: 'preview'`）:
  - 1つのダイアグラムで構文エラーやプロセス実行失敗が発生しても、文書全体のプレビュー生成を中断しません。
  - 失敗したダイアグラムの位置に、赤系破線枠で囲まれた `md-tech-diagram-error` コンテナを生成・配置します。
  - エラーボックス内には、HTMLエスケープ処理を施した簡潔なメッセージ（1行目）のみを表示し、スタックトレースや内部一時ファイルパスの露出を防止します。
  - 前後の段落、見出し、および他の正常なダイアグラムは完全な状態で維持されます。
- PDFモード（`target: 'pdf'`、既定）:
  - 成果物の厳密性を担保するため、ダイアグラム描画失敗時は従来通り `DiagramRenderError` をスローし、不完全なPDF出力を抑止します（v0.2.0既存動作の完全維持）。

### 17.3 Output Channel 連携と通知制御

- VS Code拡張側に `OutputChannel`（`md-tech-pdf`）を導入。
- `HtmlRenderer` の `onDiagramError` コールバックを購読し、エラー発生時に以下の構造化ログを出力します：

```text
[Mermaid] Document: system-design.md (line 57)
Diagram #1 rendering error:
Parse error on line 3: ...
----------------------------------------
```

- ダイアグラム毎のトースト通知（スパム）は避け、プレビュー表示後に控えめな警告通知を1度だけ表示します。

### 17.4 将来のキャッシュ境界（Phase 16 設計方針）

- ダイアグラム実行（Playwright / Java起動）は1回あたり数百ms〜数秒を要するため、Phase 16での高速化に向けて以下のキー設計を想定します：
  - キー構造: `SHA-256(diagram_type + diagram_source + normalized_options)`
  - 入力ソースとオプションが同一である限り、前回の生成済みSVGを再利用するキャッシュ境界を `HtmlRenderer` または各Rendererの直前に配置可能な構造として整理しました。

### 17.5 Phase 14 パフォーマンス再計測結果

`examples/real-world/system-design.md` におけるレンダリング処理時間（5回実行平均）:

- Phase 13 ベースライン: 12,166ms
- Phase 14 計測値: 12,448ms

パフォーマンスの大幅な劣化はなく、同等水準を維持していることを確認しました。

## 18. Phase 15 実装仕様・Local Image / Asset Preview 統合と Resource Resolution の確立

Phase 15におけるローカル画像プレビュー統合、リソース解決アーキテクチャ、およびセキュリティ境界仕様を以下に規定します。

### 18.1 Resource Resolution アーキテクチャと責務分離

VS Code Webview ではセキュリティ上の制約により、ローカルファイルを直接 `file://` 等で参照することはできず、`webview.asWebviewUri()` による変換が必須となります。一方で Core（`md-tech-pdf`）の可搬性と PDF 生成機能を維持するため、以下の責務分離を徹底しました：

- Core 側の責務:
  - Markdown AST（`inline` 配下の `image` トークン）および raw HTML（`<img src="...">`）内の画像参照を検出します。
  - `HtmlRenderOptions` に新設された汎用コールバック `resourceUrlTransformer?: (url: string) => string` を適用し、URL 文字列の抽象的な書き換えのみを実行します。
  - Core 内部には `vscode.Uri` や `asWebviewUri` などの VS Code 固有 API を一切導入しません。
- Extension 側の責務:
  - 専用モジュール `vscode-extension/src/preview/resource-resolver.ts` を配置。
  - Markdown ドキュメント URI と Webview インスタンスを元に、URL 判定、セキュリティ境界検証、および `webview.asWebviewUri()` への変換を一元管理します。

```text
Markdown image / raw HTML img
       ↓
Core HtmlRenderer (AST token traversal)
       ↓
generic resourceUrlTransformer hook
       ↓
Extension Resource Resolver
       ↓
Security boundary check & path resolution
       ↓
webview.asWebviewUri(...)
       ↓
Webview-safe URI in HTML
```

### 18.2 URL スキーム分類と解決ポリシー

Resource Resolver における URL スキームのハンドリング方針は以下の通りです：

- `https:`, `data:`:
  - リモート HTTPS 画像（バッジ、CDN アセット等）およびインライン Data URI 画像は一切変換せず、元の文字列を維持します。
  - Webview の CSP（`img-src ${webview.cspSource} data: https:`）により安全に描画されます。
- `javascript:`, `vbscript:`:
  - スクリプト注入等の脆弱性を防ぐため、空文字を返却して無害化（拒否）します。
- `http:`, `vscode-webview:`, `vscode-resource:`:
  - 外部非暗号化通信または既に Webview URI 化された参照は、ローカルファイル解決を試みずそのまま維持します。
- 相対パス (`./...`, `../...`) および `file:` スキーム:
  - ドキュメント基準ディレクトリから絶対パスを算出し、後述のセキュリティ境界に基づいて検証・変換します。

### 18.3 ワークスペース境界（Workspace Boundary）とスタンドアロン方針

パストラバーサル（`../../../../etc/passwd` 等）による不正なファイル読み取りを防止するため、以下の二層のセキュリティ境界を定義しました：

1. ワークスペース内 Markdown ドキュメント:
   - `vscode.workspace.getWorkspaceFolder(documentUri)` によりドキュメントが属するワークスペースフォルダを特定。
   - 許可ルートは「ワークスペースフォルダのルートディレクトリ配下」とします。
   - これにより、技術文書で一般的に利用される親ディレクトリ参照（例: `../images/architecture.png`）を安全に許可しつつ、ワークスペース外への逸脱を厳格に遮断します。
2. ワークスペース外（スタンドアロン）Markdown ドキュメント:
   - 許可ルートを「Markdown ドキュメントの親ディレクトリ配下」に限定します。
   - 親ディレクトリ外（`../`）への参照はセキュリティ違反として拒否されます。
3. セキュリティ境界外へのアクセス拒否:
   - 境界外への参照を検知した場合、変換を行わず元の文字列のまま残します（Webview 側でアクセスが拒否され安全）。
   - `OutputChannel`（`md-tech-pdf`）に警告ログを記録します。この際、ユーザー名等の機微情報漏洩を防ぐため、ドキュメント名と指定リソース名のみを出力します。

### 18.4 localResourceRoots 再設計（Least Privilege の堅持）

WebviewPanel 作成時の `localResourceRoots` は、最小権限（Least Privilege）方針を維持しながら親アセット参照を許容するよう再設計しました：

- ワークスペース内ドキュメント: `[vscode.Uri.file(docDir), workspaceFolder.uri]` を指定。
- スタンドアロン・ドキュメント: `[vscode.Uri.file(docDir)]` のみを指定。
- ワークスペース外の任意ディレクトリへのアクセスは許可しません。

### 18.5 クエリ・フラグメント・日本語ファイル名対応

- クエリパラメータ（`?v=1`）およびフラグメント（`#icon`）:
  - パス解決前に `splitQueryAndFragment` により分離し、`webview.asWebviewUri()` で変換された URI の末尾に再結合して返却します。
- 日本語ファイル名および空白文字:
  - `decodeURIComponent` によりパーセントエンコーディング（`%20` 等）を安全に復元した上でファイルパス解決を行います。

### 18.6 インライン SVG・Missing 画像・Untitled の安全性

- インライン SVG の保護:
  - Mermaid および PlantUML のダイアグラム SVG は、Core のパース直後のトークン走査（AST）で画像 URL 変換を行うため、後から注入されるダイアグラム SVG の内部構造を一切破壊しません。
- Missing 画像（存在しないファイル）:
  - 存在しない相対パスが指定された場合でも、プレビュー生成全体を中断させず、ブラウザ標準の broken image として表示します。
- 未保存（`untitled:`）ドキュメント:
  - 基準となるファイルシステム上のディレクトリが存在しないため、相対パス解決を安全にバイパス（未解決のまま維持）し、プレビュー表示そのものは継続します。

### 18.7 既知の制約と今後の拡張課題

- Local Font File:
  - 現在の Front Matter（`DocumentOptions.style.font`）にはローカルフォントファイル参照（`.ttf`, `.woff2` 等）のスキーマおよび解決機能は存在しません（OS インストールフォントおよび Google Fonts のみ対応）。本機能は将来の拡張課題とします。
- CSS `url(...)`:
  - ユーザー定義の外部 CSS やカスタムスタイルにおける相対 `url(...)` の Webview URI 変換は Phase 15 のスコープ外とし、Markdown 内の画像 `src`（および raw HTML の `<img src="...">`）を対象とします。

## 19. Auto Refresh と Diagram Cache による Preview 高速化（Phase 16）

### 19.1 Auto Refresh アーキテクチャと更新モード

エディタ編集と連動したプレビュー体験を向上させるため、自動更新（Auto Refresh）機構を導入しました。
設定項目 `md-tech-pdf.preview.refresh` により以下の3つの動作モードを選択可能です：

- `manual`:
  - ファイル保存や編集による自動再描画を行いません。ユーザーが明示的にコマンドを実行したときのみ描画します。
- `onSave`（デフォルト）:
  - ドキュメント保存イベント（`vscode.workspace.onDidSaveTextDocument`）を検知し、対象ドキュメントのプレビューを即座に再描画します。
- `onType`:
  - ドキュメント編集イベント（`vscode.workspace.onDidChangeTextDocument`）を検知し、タイピング中の過度な再描画を抑制するため 500ms のディバウンス（Debounce）処理を経て自動再描画します。

プレビュー管理モジュール（`PreviewManager`）において、開いているドキュメント URI ごとにディバウンスタイマーを独立管理し、複数ドキュメントを同時に編集しても干渉しません。また、パネル破棄時（`dispose`）には該当ドキュメントのタイマーが確実に破棄されます。

### 19.2 レースコンディション制御と世代管理（Stale Render Protection）

非同期のダイアグラムレンダリングやファイル読み込み中に新たな編集が発生した場合、古い処理結果が後から完了して最新のプレビューを上書きしてしまう問題（Stale Render）を防ぐため、世代カウンター（`renderGeneration`）による追跡機構を導入しました：

- 各再描画リクエストの開始時に `renderGeneration` をインクリメントします。
- 非同期処理の節目（ファイル読み込み完了後、ダイアグラム描画完了後、エラー捕捉時）で、現在の世代番号が最新の `renderGeneration` と一致するかを検証します。
- 新しいリクエストが既に開始されている場合は、完了した古い描画結果を静かに破棄します。
- バックグラウンド再描画（`isBackgroundRefresh: true`）時は全画面ローディング表示を抑止し、タイピング中や保存時の画面チラつき（Flicker）を防止します。

### 19.3 Diagram Cache アーキテクチャ

ダイアグラム（Mermaid / PlantUML）の再描画プロセス起動コストを削減するため、インメモリ SVG キャッシュ機構を構築しました：

- Core と Extension の疎結合性:
  - Core 側に VS Code API に非依存の `IDiagramRenderCache` インターフェースおよび `DiagramRenderCache` 実装を提供。
  - Extension 側では `ExtensionDiagramCache` を保持し、`HtmlRenderer.render(..., { diagramCache })` へ注入します。
- キャッシュキーの設計（`computeDiagramCacheKey`）:
  - ダイアグラム種別（`mermaid` または `plantuml`）
  - ソースコード文字列
  - SVG 出力に影響を与えるオプション（Mermaid の場合は `theme`、PlantUML の場合は `javaPath`, `jarPath`, `jarMtime`）
  - レイアウト属性（`width`, `height`, `fit`, `align`）は外側のコンテナ `<div>` のインラインスタイルや CSS クラスとして処理され SVG 本文には影響しないため、キャッシュキーから意図的に除外しています。これにより、サイズや配置の微調整による不要なキャッシュミスを防ぎます。
- エラー結果の非キャッシュ方針:
  - 描画に失敗したダイアグラム（構文エラーやプロセス障害）はキャッシュに登録しません。文法修正後に即座に再レンダリングが行われます。
- ライフサイクルと永続化方針:
  - キャッシュはメモリ上（`Map<string, string>`）にのみ保持され、ディスクには永続化しません。VS Code 終了時またはマネージャー破棄時に全件クリアされます。

### 19.4 ベンチマーク実測値（`system-design.md`）

8件のダイアグラム（Mermaid 5件、PlantUML 3件）を含む複合技術文書（`examples/real-world/system-design.md`）を用いたベンチマーク再測定結果（Core 単体処理時間）は以下の通りです：

- Cold render（空キャッシュ・3回測定平均）: 13.20 秒（約 13,202 ms）
- Warm render（全8件ダイアグラムキャッシュヒット）: 10.11 ミリ秒（初回比 約 1,300 倍高速化）
- Paragraph-only edit（本文段落のみ編集・全8件キャッシュヒット）: 8.15 ミリ秒
- Mermaid 1件編集（Mermaid 1件のみ再生成、残り7件キャッシュヒット）: 0.64 秒（約 640 ms、初回比 約 20 倍高速化）
- PlantUML 1件編集（PlantUML 1件のみ再生成、残り7件キャッシュヒット）: 3.92 秒（約 3,920 ms、初回比 約 3.4 倍高速化）

なお、上記は特定の開発検証環境（Apple Silicon、Node.js v24）における Core `HtmlRenderer.render()` 単体のベンチマーク測定例であり、ハードウェアスペックやダイアグラムの規模・実行環境によって変動します。製品としての性能保証値ではありません。VS Code 拡張機能の End-to-End（ファイル読み込み、Webview URI 変換、Webview HTML 更新）ではさらに約 5〜10 ms 程度が付加されますが、Warm 時は End-to-End でも約 15〜20 ms 程度で即座に反映されます。

### 19.5 スクロール位置に関する制約（Scroll Position Limitation）

Phase 16 における再描画では Webview 内の HTML を丸ごと置換するため、再描画時にスクロール位置がトップへ巻き戻る制約が存在します。エディタ側カーソル位置との双方向スクロール同期（Scroll Sync）および Webview スクロール位置の永続維持は Phase 17 以降の課題とします。

### 19.6 Phase 15 URL スキーム補足（`http:` および `vscode-webview:`）

- `http:` スキーム:
  - 外部非暗号化 HTTP 通信は Webview の CSP（`https:` のみ許可）によりブロックされる場合がありますが、ローカルファイル解決を誤って行わないよう判定し、そのまま維持します。
- `vscode-webview:` スキーム:
  - 既に拡張機能によって Webview 用に変換済みの URI については、再変換を行わず安全に維持します。

## 20. Preview Quality, Security Hardening & Cache Strategy (Phase 17)

### 20.1 セキュリティ多層防御アーキテクチャ (Multi-Layered Defense)

VS Code プレビューにおけるセキュリティは、単一のフィルターに依存せず、以下の多層防御によって既知の主要なリスクを抑制しています。

1. **スクリプト実行の抑制 (`enableScripts: false`)**:
   - Webview 作成時のオプションで `enableScripts: false` を設定し、CSP でも script source を一切許可しないことで、万が一 HTML 内にスクリプトタグが含まれていた場合でも JavaScript の実行をブラウザエンジン層で抑制します。
2. **厳格な Content-Security-Policy (CSP)**:
   - 実装コード（`buildPreviewCsp`）に準拠した以下のディレクティブを適用します。
   - `default-src 'none';`
   - `img-src ${cspSource} data: https:;`
   - `style-src ${cspSource} 'unsafe-inline' https://fonts.googleapis.com;`
   - `font-src ${cspSource} data: https://fonts.gstatic.com;`
   - スクリプト実行権限 (`script-src`) は定義せず、外部スクリプトの取得や実行をブラウザレベルで拒絶します。
3. **ローカルリソースアクセスの物理的制限 (`localResourceRoots`)**:
   - VS Code Webview がファイルシステムから読み込みを許可するディレクトリを、ワークスペースルート（または単体ドキュメントの親ディレクトリ）に限定します。
4. **リソースリゾルバによるパス境界検証 (`ResourceUrlTransformer`)**:
   - Markdown 内で指定された相対パスおよびローカルパスについて、境界外へのトラバーサル（`../` や `%2e%2e/`、シンボリックリンク）を検知して遮断します。

### 20.2 HTML サニタイズに関する方針 (HTML Sanitization Policy)

v0.3.0 においては、`DOMPurify` や `sanitize-html` などのサードパーティ HTML サニタイザーは意図して導入していません。

- **未導入の理由**:
  - 技術文書（Markdown）では、`<details>`, `<summary>`, `<table>`, `<sup>`, `<sub>`, `<kbd>`, `<mark>`, `<abbr>` などの標準 HTML タグや、インラインスタイル、インライン `<svg>` が頻繁に使用されます。過剰なサニタイズを行うと、これら技術文書の正当な表現力が損なわれるリスクがあります。
  - 前述の多層防御（`enableScripts: false`、厳格な CSP、`localResourceRoots`、Resource Resolver）により、スクリプト実行や境界外ファイルへのアクセスリスクに対して多層の防御線を構築しているため、v0.3.0 としては十分な安全境界が成立しています。
- **将来（将来バージョン）導入時の Allowlist 候補**:
  - タグ: `h1`〜`h6`, `p`, `div`, `span`, `ul`, `ol`, `li`, `blockquote`, `pre`, `code`, `table`, `thead`, `tbody`, `tr`, `th`, `td`, `a`, `img`, `hr`, `br`, `details`, `summary`, `sup`, `sub`, `kbd`, `mark`, `abbr`, `svg`, `path`, `g`, `circle`, `rect`, `line`, `polygon`, `text`
  - 属性: `class`, `id`, `style`, `src`, `href`, `alt`, `title`, `width`, `height`, `align`, `viewBox`, `xmlns`, `fill`, `stroke`
  - 拒否タグ: `script`, `iframe`, `object`, `embed`, `base`, `form`, `input`, `button`

### 20.3 URL スキームの包括的ハンドリング方針 (URL Scheme Handling)

Markdown 内の画像やリンク等で使用されるスキームは、以下の方針で統一的に処理されます。

| スキーム / 形式        | 処理方針           | 理由・セキュリティ動作                                                                                                                    |
| ---------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `https:`               | そのまま維持       | CSP の `img-src https:` により外部安全通信として許可。                                                                                    |
| `data:`                | そのまま維持       | インライン SVG や base64 画像として許可。                                                                                                 |
| 相対パス (`./`, `../`) | Webview URI に変換 | 境界ディレクトリ配下であることを検証後に `asWebviewUri` へ変換。                                                                          |
| `file:`                | Webview URI に変換 | 境界ディレクトリ配下であることを検証後に `asWebviewUri` へ変換。                                                                          |
| `http:`                | そのまま維持       | ローカル解決は行わない。CSP の `img-src` で許可されないためプレビューでは読み込めません（未サポート）。                                   |
| `javascript:`          | 空文字 `''` に置換 | スクリプト実行スキームのため拒絶。                                                                                                        |
| `vbscript:`            | 空文字 `''` に置換 | スクリプト実行スキームのため拒絶。                                                                                                        |
| `vscode-webview:`      | 空文字 `''` に置換 | ユーザー Markdown 内からの内部スキーム偽装・悪用を防止するため拒絶（拡張機能自身が `asWebviewUri` で生成する URI は正常に処理されます）。 |
| `vscode-resource:`     | 空文字 `''` に置換 | レガシー内部スキームの悪用を防止するため拒絶。                                                                                            |

### 20.4 シンボリックリンクとパストラバーサル防御方針

- 相対パスのトラバーサル（`../` や URL エンコードされた `%2e%2e/`）は、URL デコードを行った上で `path.resolve()` により解決され、境界ディレクトリとの相対関係を比較検証します。
- シンボリックリンクを経由した境界外ファイル参照を防ぐため、対象ファイルがローカルファイルシステム上に実在する場合（`fs.existsSync()` が真の場合）は `fs.realpathSync()` によりファイルシステム上の真の絶対パス（実体パス）を取得し、実体パスが許可境界ディレクトリ配下に含まれているかを検証します。境界外を指すシンボリックリンクは拒否され、アクセスは許可されません。対象ファイルが存在しない場合は、レキシカルな相対パス検証のみが行われます。

### 20.5 キャッシュメモリ管理戦略 (Cache Memory Management)

プレビュー機能で使用されるインメモリ・ダイアグラムキャッシュ（`DiagramCache`）のメモリ設計方針は以下の通りです。

- **キャッシュキー生成**:
  - ダイアグラム種別、ソースコード、および描画出力に影響するオプション（Mermaid テーマ、PlantUML jarPath/jarMtime 等）を結合し、確定的かつ安全な **SHA-256** ハッシュを計算してキャッシュキーとします。
- **メモリ使用量の実態（観測値に基づく概算）**:
  - 生成される SVG 1件あたりのサイズは典型的な観測値として約 5〜20 KB（平均約 10 KB）です。
  - 大規模な技術文書で 1,000 件のダイアグラムがレンダリングされた場合でも、合計メモリ消費量は約 10 MB 程度にとどまります（ダイアグラムの規模や複雑度によって変動します）。
- **管理方針**:
  - 現代のエディタメモリ環境において 10 MB 程度の消費は軽微であり、複雑な LRU（Least Recently Used）キャッシュアルゴリズムや最大サイズ制限を導入することは、不要なバグやオーバーヘッドを生む原因となります。
  - したがって、シンプルな `Map<string, string>` による管理とし、プレビューパネルの破棄（`dispose()`）または拡張機能の終了時にキャッシュを全開放するセッションライフサイクル管理を採用しています。

### 20.6 エラー UX と情報漏洩防止 (Error UX & Leak Prevention)

- **ダイアグラム構文エラーと HTML エスケープ**:
  - 構文エラー発生時は、プレビュー全体をクラッシュさせず、該当ダイアグラムの位置にインラインのエラーカードを表示してプレビュー表示を継続します。
  - エラーカード内に埋め込まれるエラーメッセージ文字列は、専用の `escapeHtml()` 関数により確実に HTML エスケープ処理され、メッセージ起因の HTML 崩れや XSS を防ぎます（これはエラーメッセージに対するエスケープであり、ドキュメント全体の raw HTML セキュリティとは役割が異なります）。
- **UI 通知メッセージのサニタイズ**:
  - `showErrorMessage` などの VS Code 通知ポップアップにスタックトレースや内部ファイルパスがそのまま漏洩しないよう、`getErrorMessage()` においてエラーメッセージの先頭行のみをクリーンに抽出し、安全で簡潔な通知を提供します。詳細ログは専用の OutputChannel（`md-tech-pdf`）に集約されます。

### 20.7 v0.3.0 における既知の制限事項 (Known Limitations)

1. **Auto Refresh の onType debounce 固定値**:
   - `onType` 自動更新時の debounce 遅延時間は 500ms 固定で実装されており、v0.3.0 ではユーザー設定による変更はサポートしていません。
2. **スクロール位置の同期と保持**:
   - ドキュメント更新時に Webview 内の HTML を再構築するため、プレビューのスクロール位置がトップに巻き戻る場合があります。エディタ側カーソル行との双方向スクロール同期（Scroll Sync）は、将来バージョンでの改善課題とします。
3. **外部スタイルのカスタマイズ性**:
   - 現在のプレビューは組み込みの用紙寸法・デフォルトスタイルをベースとしており、ユーザー独自のカスタム CSS ファイルを動的に注入する機能は将来の拡張対象となります。

## 21. Phase 20 設計仕様・プレビュー UX 改善とスクロール同期

Phase 20 では、v0.3.0 で既知の制限事項とされていたスクロール位置のリセットを解消し、長文技術文書の執筆効率を飛躍的に向上させるためのアーキテクチャ刷新を行います。

### 21.1 セキュリティモデルの進化（Nonce ベースの厳格 CSP）

スクロール位置の追跡・復元やエディタ間通信を行うため、Webview 内で最小限のクライアントスクリプト（`preview-client.js`）を実行する方式へ移行します。
v0.3.0 の堅牢な安全境界を損なうことなく安全にスクリプトを導入するため、VS Code 公式推奨の **Nonce ベースの動的 CSP** を採用します。

1. **WebviewPanel オプションの移行**:
   - `enableScripts: true` を設定します。
   - ただし、スクリプト実行権限は拡張機能自身の内部スクリプトに限定し、Markdown コンテンツ由来の任意のスクリプト実行は CSP 層で完全に遮断します。
2. **Nonce（暗号論的乱数）の生成とディレクティブ**:
   - レンダリングごとに 128 ビットの暗号論的乱数（`crypto.randomBytes(16).toString('base64')`）を生成します。
   - 改訂 CSP ディレクティブ:
     ```text
     default-src 'none';
     img-src ${cspSource} data: https:;
     style-src ${cspSource} 'unsafe-inline' https://fonts.googleapis.com;
     font-src ${cspSource} data: https://fonts.gstatic.com;
     script-src 'nonce-${nonce}';
     ```
3. **クライアントスクリプトのロード**:
   - 内部スクリプトは `dist/preview/preview-client.js` としてビルドし、`<script nonce="${nonce}" src="${clientScriptUri}"></script>` 経由で読み込みます。
   - ユーザーの Markdown ドキュメント内に悪意ある `<script>` タグやインラインイベント属性（`onload`, `onerror` 等）が含まれていた場合でも、ブラウザのセキュリティエンジンによって実行が遮断されます。

### 21.2 スクロール位置保持メカニズム（Scroll Position Preservation）

自動更新（onSave / onType）による HTML 全置換時、およびエディタタブ切り替え時にスクロール位置を維持する仕様を規定します。

1. **スクロールイベントのトラッキング**:
   - Webview 側で `window.addEventListener('scroll', ...)` をリッスンし、100ms の debounce 処理により最新の垂直スクロール座標（`scrollY`）および進行比率（`scrollRatio`）を計算します。
   - VS Code Webview State API を使用して `vscode.setState({ scrollY, scrollRatio })` に保存し、タブの非表示・再表示時にも復元可能とします。
   - 同時に、ホスト拡張機能側へ `vscode.postMessage({ type: 'didScroll', scrollY, scrollRatio })` を送信し、ホスト側の `PreviewPanel` インスタンスでも最新座標を追跡します。
2. **再描画時のスクロール復元フロー**:
   - 新しい HTML が設定された直後、Webview の DOMContentLoaded イベントで直前の `scrollY` へ `window.scrollTo({ top: scrollY, behavior: 'instant' })` を実行します。
   - さらに、画像やダイアグラム（SVG）等の非同期アセット読み込みによるレイアウトシフト（Cumulative Layout Shift: CLS）を補正するため、`window.addEventListener('load', ...)` のタイミングでも微調整スクロールを実行します。

### 21.3 エディタ / プレビュー スクロール同期（Scroll Sync）

Markdown エディタのスクロール位置・カーソル位置とプレビューの表示領域をリアルタイムに連動させるアーキテクチャを策定します。

1. **同期方式の比較と採否**:
   - **方式 A: 単純比率同期（Percentage-based）**:
     - エディタの行比率（行番号 / 総行数）と Webview の高さ比率を連動。
     - 評価: 実装は容易だが、長大なダイアグラムや数式、表が含まれる技術文書ではエディタ行数とレンダリング高さが大きく乖離し、視認位置が大幅にずれるため不採用。
   - **方式 B: 行マッピング・アンカー同期（Heading & Block Anchor-based）［採用］**:
     - Markdown 解析時に、見出し（`h1`〜`h6`）、コードブロック、ダイアグラムコンテナ、段落等の主要ブロック要素にソース行番号属性（`data-line="${lineNumber}"`）を付与。
     - エディタ側の表示範囲変更イベント（`vscode.window.onDidChangeTextEditorVisibleRanges`）を監視し、エディタの最上部可視行を取得。
     - ホストから Webview へ `{ type: 'scrollToLine', line: topVisibleLine }` を送信。
     - Webview 側は該当行番号（または直近の過去行）を持つ `[data-line]` 要素をバイナリサーチまたはトラバースで探索し、`element.scrollIntoView({ behavior: 'smooth', block: 'start' })` を実行。
2. **スクロールループ（Ping-Pong 現象）の防止**:
   - エディタ発の同期スクロール指令を実行している間、Webview 側は `isSyncing = true` フラグをセットし、プレビュー側スクロールイベントによるホストへの通知を 300ms 間ミュートします。

### 21.4 プレビューツールバー / アクション UI

プレビューパネルの上部に、控えめで洗練されたスティッキーツールバー（Toolbar）を配置し、作業効率を向上させます。

1. **提供機能と UI 構成**:
   - **更新ボタン（Reload）**: ダイアグラムキャッシュをバイパスして即座に強制再レンダリングを実行。
   - **表示倍率（Zoom）**: 50%, 75%, 100%, 125%, 幅に合わせる（Fit Width）をドロップダウンまたはボタングループで切り替え。
   - **PDF エクスポート（Export PDF）**: ツールバーのボタンをクリックすると、Webview からホストへ `{ type: 'exportPdf' }` を送信し、エクスポートコマンド（`md-tech-pdf.exportPdf`）をワンクリックで実行。
2. **印刷・PDF エクスポートとの干渉防止**:
   - ツールバーコンテナには専用クラス（`.preview-toolbar`）を付与し、印刷用メディアクエリにおいて `display: none !important;` を指定します。
   - これにより、プレビュー画面上のみに表示され、実際の PDF 生成出力には一切混入しません。

### 21.5 Phase 20.1 実装タスクと対象ファイル一覧

次フェーズ（Phase 20.1: 実装工程）におけるタスク分割と修正対象ファイル群は以下の通りです。

1. **Core レイヤー (`src/`)**:
   - `src/renderer/html-renderer.ts`: プレビューターゲット時にブロック要素への `data-line` 属性付与オプションを実装。
2. **Extension レイヤー (`vscode-extension/`)**:
   - `src/preview/csp-builder.ts`: `buildPreviewCsp(cspSource, nonce)` への Nonce 引数追加。
   - `src/preview/client/preview-client.ts`（新規）: Webview 内で動作するスクロール管理・通信クライアントロジック。
   - `src/preview/preview-panel.ts`: `enableScripts: true` への変更、Nonce 生成、postMessage 受信ハンドラ実装。
   - `src/preview/preview-manager.ts`: エディタ可視範囲変更イベントの監視とスクロール同期メッセージの送信。
   - `src/preview/preview-style.ts`: スティッキーツールバー用のスタイルおよび印刷除外スタイルの定義。
3. **テスト**:
   - Nonce 付与 CSP の生成テスト（Unit）
   - スクロールメッセージ受信および同期コマンドのハンドリングテスト（Unit）
