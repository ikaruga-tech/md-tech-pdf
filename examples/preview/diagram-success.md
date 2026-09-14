---
pdf:
  format: A4
  landscape: false
  margin:
    top: 15mm
    right: 15mm
    bottom: 15mm
    left: 15mm
diagram:
  fit: contain
  align: center
---

# Diagram Preview Test Specification (Success Cases)

This document verifies normal rendering and attribute alignment of Mermaid and PlantUML diagrams.

## Mermaid Flowchart

```mermaid {width=150mm height=60mm fit=contain align=center}
flowchart TD
  Start([Start]) --> Process[Execute Core Engine]
  Process --> Check{Valid?}
  Check -- Yes --> Complete([Success])
  Check -- No --> Error([Error Handling])
```

## Mermaid Sequence Diagram

```mermaid {width=160mm align=center}
sequenceDiagram
  autonumber
  actor User
  participant VSCode as VS Code Extension
  participant Core as Core HtmlRenderer
  participant Engine as Mermaid CLI

  User->>VSCode: Open Preview
  VSCode->>Core: render(source, target='preview')
  Core->>Engine: executeMermaidCli(diagram)
  Engine-->>Core: Vector SVG
  Core-->>VSCode: Complete HTML with inline SVG
  VSCode-->>User: Display Webview
```

## PlantUML Sequence Diagram

```plantuml {width=140mm height=60mm align=center}
@startuml
skinparam monochrome true
actor Client
participant "API Gateway" as GW
database Aurora

Client -> GW: POST /orders
GW -> Aurora: INSERT order
Aurora --> GW: OK (id=123)
GW --> Client: 201 Created
@enduml
```

## PlantUML Class Diagram

```plantuml {width=150mm align=center}
@startuml
skinparam classAttributeIconSize 0

interface DiagramRenderer {
  +render(source: string): Promise<string>
}

class MermaidRenderer implements DiagramRenderer {
  +render(source: string): Promise<string>
}

class PlantUmlRenderer implements DiagramRenderer {
  +render(source: string): Promise<string>
}
@enduml
```
