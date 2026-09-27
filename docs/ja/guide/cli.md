# CLI の使い方

`md-tech-pdf` コマンドラインツールは、Markdown ドキュメントを高品質な PDF へ変換するための高速な CLI です。

## コマンド構文

```bash
md-tech-pdf <入力ファイル> [オプション]
```

## オプション一覧

| オプション              | 短縮形 | 説明                                                              |
| :---------------------- | :----- | :---------------------------------------------------------------- |
| `--output <path>`       | `-o`   | 出力ファイルパスまたは出力先ディレクトリを指定します。            |
| `--style <path...>`     | `-s`   | 外部 CSS ファイルを指定してスタイルを注入します（複数指定可能）。 |
| `--java-path <path>`    |        | PlantUML 実行用の `java` バイナリパスを指定します。               |
| `--plantuml-jar <path>` |        | 独自の `plantuml.jar` のパスを指定します。                        |
| `--no-cache`            |        | ダイアグラムのレンダリングキャッシュを無効化します。              |
| `--version`             | `-v`   | バージョン番号を表示します。                                      |
| `--help`                | `-h`   | ヘルプとオプション一覧を表示します。                              |

## 使用例

### 基本的な変換

```bash
md-tech-pdf design.md
# 出力: design.pdf
```

### 出力先の指定

```bash
md-tech-pdf design.md -o dist/architecture-spec.pdf
```

### カスタム CSS の適用

```bash
md-tech-pdf design.md -s styles/corporate.css -s styles/print.css
```
