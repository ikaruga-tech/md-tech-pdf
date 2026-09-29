export type Locale = 'ja' | 'en';

const en = {
  'action.runDoctor': 'Run Doctor',
  'action.downloadPlantUml': 'Download PlantUML Jar',
  'action.openSettings': 'Open Settings',

  'errorCard.title.mermaid': 'Mermaid diagram could not be rendered',
  'errorCard.title.plantuml': 'PlantUML diagram could not be rendered',
  'errorCard.details': 'Error details',

  'guidance.browserNotFound':
    'Could not find a supported browser (Google Chrome or Microsoft Edge) required to render Mermaid diagrams.',
  'guidance.plantumlJarNotConfigured':
    'PlantUML jar path is not configured. You can download it automatically via command or set the path in Settings.',
  'guidance.plantumlJarNotFound':
    'The configured PlantUML jar file was not found. Check the path in Settings or download it again via command.',
  'guidance.javaNotFound':
    'Java runtime environment (JRE/JDK) was not found. Java is required to execute PlantUML.',
  'guidance.exportBrowserNotFound':
    'Could not find a supported browser (Google Chrome or Microsoft Edge) required to export PDF.',

  'preview.rendering': 'Rendering preview...',
  'preview.failedTitle': 'Preview generation failed',
  'preview.diagramErrorToast':
    'md-tech-pdf: Some diagrams could not be rendered. Run the environment doctor to find the cause.',
  'preview.openDoctor': 'Open Doctor',

  'download.progressTitle': 'md-tech-pdf: Downloading PlantUML jar...',
  'download.progressBytes': '{received} MB / {total} MB',
  'download.progressBytesUnknown': '{received} MB',
  'download.completed': 'md-tech-pdf: PlantUML jar downloaded to {path}',
  'download.completedButOverridden':
    'md-tech-pdf: PlantUML jar downloaded to {path}. It is not used while md-tech-pdf.plantuml.jarPath is set.',
  'download.cancelled': 'md-tech-pdf: PlantUML jar download was cancelled.',
  'download.failed': 'md-tech-pdf: Failed to download PlantUML jar: {message}',

  'doctor.title': 'md-tech-pdf Environment Doctor',
  'doctor.runningAt': 'Checked at: {time}',
  'doctor.allReady': 'All systems are ready!',
  'doctor.issuesFound': '{count} item(s) need attention. See the hints above.',
  'doctor.label.path': 'Path',
  'doctor.label.version': 'Version',
  'doctor.label.source': 'Source',
  'doctor.label.hint': 'Hint',
  'doctor.source.setting': 'Settings ({key})',
  'doctor.source.auto': 'Auto-detected',
  'doctor.source.managed': 'Downloaded by md-tech-pdf',
  'doctor.versionUnknown': 'unknown',
  'doctor.browser.configuredMissing': 'The configured browser path does not exist: {path}',
  'doctor.browser.notFound': 'No supported browser (Chrome / Edge / Brave / Chromium) was found.',
  'doctor.browser.hint':
    'Install Google Chrome or Microsoft Edge, or set the browser executable path in md-tech-pdf.browser.executablePath (command: "md-tech-pdf: Run Doctor" to re-check).',
  'doctor.java.notFound': 'Java could not be executed ({path}).',
  'doctor.java.hint':
    'Install a JRE/JDK (e.g. https://adoptium.net/) or set the java path in md-tech-pdf.plantuml.javaPath.',
  'doctor.jar.notConfigured': 'PlantUML jar is not configured.',
  'doctor.jar.missing': 'PlantUML jar was not found: {path}',
  'doctor.jar.versionFailed':
    'The jar exists, but its version could not be checked (Java is required).',
  'doctor.jar.hint':
    'Run the command "md-tech-pdf: Download PlantUML Jar" or set md-tech-pdf.plantuml.jarPath.',
  'doctor.mermaid.ok': 'Rendered a test diagram successfully.',
  'doctor.pdf.ok': 'Generated a test PDF successfully.',
  'doctor.probeFailed': 'Test run failed: {message}',
  'doctor.bundledBrowser': 'No system browser was resolved; the bundled Chromium was used.',
  'doctor.probe.hint':
    'Make sure a supported browser is installed and md-tech-pdf.browser.executablePath points to it.',

  'export.failed': 'md-tech-pdf: {message}',
};

export type MessageKey = keyof typeof en;

const ja: Record<MessageKey, string> = {
  'action.runDoctor': '環境診断を実行',
  'action.downloadPlantUml': 'PlantUML jar をダウンロード',
  'action.openSettings': '設定を開く',

  'errorCard.title.mermaid': 'Mermaid ダイアグラムを描画できませんでした',
  'errorCard.title.plantuml': 'PlantUML ダイアグラムを描画できませんでした',
  'errorCard.details': 'エラー詳細',

  'guidance.browserNotFound':
    'Mermaid ダイアグラムの描画に必要なブラウザ環境（Chrome / Edge）が見つかりません。',
  'guidance.plantumlJarNotConfigured':
    'PlantUML の jar ファイルが設定されていません。コマンドから自動ダウンロードするか、設定でパスを指定してください。',
  'guidance.plantumlJarNotFound':
    '設定された PlantUML の jar ファイルが見つかりません。設定のパスを確認するか、コマンドから再ダウンロードしてください。',
  'guidance.javaNotFound':
    'Java 実行環境（JRE/JDK）が検出されませんでした。PlantUML の実行には Java が必要です。',
  'guidance.exportBrowserNotFound':
    'PDF 出力に必要なブラウザ環境（Chrome / Edge）が見つかりません。',

  'preview.rendering': 'プレビューを生成しています...',
  'preview.failedTitle': 'プレビューを生成できませんでした',
  'preview.diagramErrorToast':
    'md-tech-pdf: 一部のダイアグラムを描画できませんでした。環境診断で原因を確認できます。',
  'preview.openDoctor': '環境診断を開く',

  'download.progressTitle': 'md-tech-pdf: PlantUML jar をダウンロードしています...',
  'download.progressBytes': '{received} MB / {total} MB',
  'download.progressBytesUnknown': '{received} MB',
  'download.completed': 'md-tech-pdf: PlantUML jar をダウンロードしました（{path}）',
  'download.completedButOverridden':
    'md-tech-pdf: PlantUML jar をダウンロードしました（{path}）。設定 md-tech-pdf.plantuml.jarPath が指定されている間は使用されません。',
  'download.cancelled': 'md-tech-pdf: PlantUML jar のダウンロードをキャンセルしました。',
  'download.failed': 'md-tech-pdf: PlantUML jar のダウンロードに失敗しました: {message}',

  'doctor.title': 'md-tech-pdf 環境診断',
  'doctor.runningAt': '診断日時: {time}',
  'doctor.allReady': 'All systems are ready! すべての環境が整っています。',
  'doctor.issuesFound': '{count} 件の項目に対応が必要です。上記のヒントを確認してください。',
  'doctor.label.path': 'パス',
  'doctor.label.version': 'バージョン',
  'doctor.label.source': '検出方法',
  'doctor.label.hint': '解決方法',
  'doctor.source.setting': '設定（{key}）',
  'doctor.source.auto': '自動検出',
  'doctor.source.managed': 'md-tech-pdf によるダウンロード',
  'doctor.versionUnknown': '不明',
  'doctor.browser.configuredMissing': '設定されたブラウザのパスが存在しません: {path}',
  'doctor.browser.notFound':
    '対応ブラウザ（Chrome / Edge / Brave / Chromium）が見つかりませんでした。',
  'doctor.browser.hint':
    'Google Chrome または Microsoft Edge をインストールするか、設定 md-tech-pdf.browser.executablePath にブラウザの実行ファイルのパスを指定してください（再確認はコマンド「md-tech-pdf: Run Doctor」）。',
  'doctor.java.notFound': 'Java を実行できませんでした（{path}）。',
  'doctor.java.hint':
    'JRE/JDK（例: https://adoptium.net/）をインストールするか、設定 md-tech-pdf.plantuml.javaPath に java のパスを指定してください。',
  'doctor.jar.notConfigured': 'PlantUML jar が設定されていません。',
  'doctor.jar.missing': 'PlantUML jar が見つかりません: {path}',
  'doctor.jar.versionFailed':
    'jar は存在しますが、バージョンを確認できませんでした（Java が必要です）。',
  'doctor.jar.hint':
    'コマンド「md-tech-pdf: Download PlantUML Jar」を実行するか、設定 md-tech-pdf.plantuml.jarPath を指定してください。',
  'doctor.mermaid.ok': 'テスト用ダイアグラムを描画できました。',
  'doctor.pdf.ok': 'テスト用 PDF を生成できました。',
  'doctor.probeFailed': 'テスト実行に失敗しました: {message}',
  'doctor.bundledBrowser':
    'システムブラウザが特定できなかったため、同梱の Chromium を使用しました。',
  'doctor.probe.hint':
    '対応ブラウザがインストールされていること、設定 md-tech-pdf.browser.executablePath が正しいことを確認してください。',

  'export.failed': 'md-tech-pdf: {message}',
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, ja };
