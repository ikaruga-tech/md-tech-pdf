# PlantUML レンダリング検証テスト

本ドキュメントは、Markdown文書内のPlantUMLダイアグラム（シーケンス図、クラス図、アクティビティ図）がローカルのJavaプロセスおよび `plantuml.jar` を介してSVGへ変換され、HTMLおよびPDFへ正常に統合されることを検証するためのテスト文書です。

## 1. シーケンス図（属性指定あり: 幅・高さ・中央揃え）

ユーザー認証とデータ取得を行うシーケンス図です。日本語ラベルとレイアウト属性の反映を確認します。

```plantuml {width=150mm height=90mm fit=contain align=center}
@startuml

actor ユーザー
participant "Webアプリ" as Web
participant "認証API" as Auth
database "データベース" as DB

ユーザー -> Web: ログイン要求
Web -> Auth: トークン発行要求
Auth -> DB: ユーザー情報照会
DB --> Auth: ユーザーデータ
Auth --> Web: 認証トークン返却
Web --> ユーザー: ログイン成功通知

@enduml
```

## 2. クラス図（属性指定なし: 自然幅・デフォルト設定）

ユーザー管理および注文システムのクラス図です。属性指定を行わない場合のデフォルトレンダリングを確認します。

```plantuml
@startuml

class User {
  +id: string
  +name: string
  +email: string
  +authenticate(): boolean
}

class Order {
  +id: string
  +createdAt: Date
  +calculateTotal(): number
}

class OrderItem {
  +productId: string
  +quantity: number
  +price: number
}

User "1" --> "*" Order: 所持
Order "1" *-- "*" OrderItem: 構成

@enduml
```

## 3. アクティビティ図（属性指定あり: 幅指定・左揃え）

業務プロセスの条件分岐とループを表現したアクティビティ図です。

```plantuml {width=120mm align=left}
@startuml

start

:リクエストを受信;

if (バリデーションチェック) then (成功)
  :データを整形;
  :DBへ永続化;
  :成功レスポンスを生成;
else (失敗)
  :エラーログを記録;
  :400 Bad Requestを返却;
endif

stop

@enduml
```
