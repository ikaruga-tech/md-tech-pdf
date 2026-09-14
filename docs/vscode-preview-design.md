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

| 方式 | 特徴 | 採用可否 | 理由 |
| --- | --- | --- | --- |
| A: WebviewPanel | 独立したタブとしてエディタ横に表示 | 採用 | 編集とプレビューの並列表示（Side-by-Side）に最適であり、Coreが生成するHTML/CSS/インラインSVGを完全制御可能。 |
| B: Custom Editor | ファイルを開くエディタ自体をWebviewで置き換え | 不採用 | Markdownテキストを編集しながら確認する標準UXに反し、シンタックスハイライト等のエディタ機能を失う。 |
| C: 標準Markdown Preview拡張 | VS Code標準のMarkdownプレビューにプラグイン注入 | 不採用 | 標準プレビューのテーマCSSが強力に干渉し、PDF出力専用のタイポグラフィやA4用紙余白レイアウトが破壊される。 |

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
  cspSource?: string;     // Webview CSP生成用
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

| Front Matter項目 | プレビューへの反映方法 |
| --- | --- |
| `pdf.format` (A4, A3, Letter等) | 用紙コンテナの幅（例: A4縦なら 210mm、Letterなら 8.5in）として反映。 |
| `pdf.landscape` (true / false) | 横向き指定時、用紙コンテナの幅と最小高さを反転（A4横なら 幅297mm、最小高さ210mm）。 |
| `pdf.margin` (top, right, bottom, left) | 用紙コンテナの `padding` にマッピング。 |
| `style.font` (family, codeFamily) | プレビュー本文およびコードブロックのフォントファミリーに直接適用。 |
| `style.font.google` | Google Fontsの読み込みリンクを生成し適用。 |
| `mermaid.theme` | Mermaidの描画テーマ（default, neutral, dark等）に反映。 |

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
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  img-src ${webview.cspSource} data: https:;
  style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
  font-src ${webview.cspSource} data: https://fonts.gstatic.com;
">
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

- 課題: VS Codeのエディタ分割幅がA4用紙幅（210mm ≒ 約794px）より狭い場合、Flexboxの標準挙動により用紙シートが潰れる、または用紙の右側がクリップされる問題が生じます。
- 対策仕様:
  - キャンバスコンテナ（`.md-tech-pdf-preview-canvas`）に `overflow-x: auto` を指定。
  - 用紙シートコンテナ（`.md-tech-pdf-preview-page`）に `flex-shrink: 0` を指定。
  - これにより、エディタ幅が狭い場合でも用紙のアスペクト比や組版崩れを防ぎ、横スクロールによる完全な用紙閲覧を保証します。

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

| 項目 | VS Code プレビュー | PDF 出力 (Playwright) |
| --- | --- | --- |
| 描画エンジン | VS Code Webview (Electron Chromium) | Playwright Chromium Headless |
| 改ページ | 連続スクロール（1つの長い用紙シート） | 物理的なページ分割（A4複数ページ） |
| ヘッダー・フッター | 非表示（Phase 13時点） | PDF生成オプションにより付与可能 |
| ローカル画像パス | 相対パスはPhase 15まで未解決 | ローカルパスを直接読み込み表示 |
| フォント取得 | Webview CSP制限下でGoogle Fonts / ローカルフォント | システムフォント / Webフォント読み込み |

### 16.6 パフォーマンスベースライン計測結果

`tools/benchmark-preview.ts` を用いたレンダリング処理時間（HTML生成、5回実行平均）の計測値は以下の通りです。

- 小型文書（`examples/preview/markdown-elements.md`、ダイアグラムなし）: 平均 1.42ms
- 中型文書（`README.md`、表・リスト等の標準要素）: 平均 1.07ms
- 実世界大規模文書（`examples/real-world/system-design.md`、Mermaid 1件・PlantUML 3件を含む約28KB）: 平均 12,166ms (約12.1秒)

分析と考察:
ダイアグラムを含まない純粋なMarkdownレンダリングは1〜2msと極めて高速であり、UIブロッキングの懸念はありません。一方で、複数のダイアグラムを含む文書ではPlaywrightおよびJava起動の累積コストにより約12秒を要します。このため、Phase 16で実装予定の「保存時のみの更新（`onSave`）」や「ダイアグラムキャッシュ」が快適なプレビュー体験のために極めて重要であることが確認されました。
