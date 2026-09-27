# Front Matter 設定リファレンス

Markdown ドキュメント先頭の YAML Front Matter を用いて、用紙サイズ、余白、フォント、ダイアグラムの既定挙動を設定できます。

## YAML スキーマ完全版

```yaml
---
pdf:
  format: A4 # 用紙サイズ（現在 "A4" のみ、既定値: "A4"）
  landscape: false # true（横） | false（縦）（既定値: false）
  margin:
    top: 15mm # 上余白（既定値: "15mm"）
    bottom: 15mm # 下余白（既定値: "15mm"）
    left: 15mm # 左余白（既定値: "15mm"）
    right: 15mm # 右余白（既定値: "15mm"）

diagram:
  width: '' # 例: "140mm", "80%"（既定値: ""）
  height: '' # 例: "90mm", "400px"（既定値: ""）
  fit: contain # "contain"（縦横比維持） | "fill"（領域一杯）（既定値: "contain"）
  align: center # "center" | "left" | "right"（既定値: "center"）

style:
  font:
    family: "'LINE Seed JP', sans-serif"
    codeFamily: "'Fira Code', monospace"
    google:
      families:
        - name: 'LINE Seed JP'
          weights: [400, 700, 800]
        - name: 'Fira Code'
          weights: [400, 500]
  css: 'styles/custom.css' # 外部 CSS ファイルパス（単一文字列または配列）
  customCss: | # インライン直接記述 CSS
    table th { background: #f0f4f8; }
---
```

## 優先順位（カスケード解決）

各設定は以下の優先順位に従って安全にマージ・解決されます:

1. コードブロック個別属性（`{width="100mm" align="center"}` 等）
2. ドキュメント先頭の Front Matter 記述
3. VS Code Settings（`md-tech-pdf.default.*`）
4. システム組み込み既定値
