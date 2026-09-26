/**
 * Benchmark document fixture generators for md-tech-pdf.
 */

export function generateSmallDocument(): string {
  return `---
title: Small Benchmark Document
pdf:
  format: A4
  margin:
    top: 15mm
    bottom: 15mm
    left: 15mm
    right: 15mm
---

# Microservice Architecture Overview

This is a lightweight document designed to measure baseline rendering latency.

## Architecture

Below is the service interaction diagram:

\`\`\`mermaid {width=140mm align=center}
graph LR
  Client[Web Client] --> Gateway[API Gateway]
  Gateway --> Auth[Auth Service]
  Gateway --> Core[Core API]
  Core --> DB[(PostgreSQL)]
\`\`\`

## Data Flow

1. Client sends request with JWT token to API Gateway.
2. Gateway verifies authentication with Auth Service.
3. Gateway forwards request to Core API.
4. Core API reads/writes from PostgreSQL.
`;
}

export function generateMediumDocument(): string {
  const sections: string[] = [
    `---
title: Medium Benchmark Document
pdf:
  format: A4
  margin:
    top: 20mm
    bottom: 20mm
    left: 20mm
    right: 20mm
diagram:
  width: 130mm
  align: center
style:
  font:
    family: 'Noto Sans JP'
    google:
      families:
        - name: 'Noto Sans JP'
          weights: [400, 700]
---

# Enterprise Platform Technical Specification

Detailed breakdown of subcomponents and data pipelines.
`,
  ];

  for (let i = 1; i <= 10; i++) {
    sections.push(`
## Section ${i}: Subsystem ${String.fromCharCode(64 + i)}

Detailed technical specifications for subsystem ${String.fromCharCode(64 + i)}.
This subsystem handles domain events, message processing, and transaction isolation.

### Component Diagram ${i}

\`\`\`mermaid {fit=contain}
graph TD
  Producer${i}[Event Producer ${i}] --> Queue${i}{Kafka Topic ${i}}
  Queue${i} --> ConsumerA${i}[Worker Node A]
  Queue${i} --> ConsumerB${i}[Worker Node B]
  ConsumerA${i} --> Cache${i}[(Redis Cache ${i})]
  ConsumerB${i} --> Storage${i}[(S3 Storage ${i})]
\`\`\`

### Protocol Definition

- Protocol: gRPC / Protocol Buffers v3
- Latency target: p99 < 15ms
- Concurrency limit: 2500 req/sec
`);
  }

  return sections.join('\n');
}

export function generateLargeDocument(): string {
  const sections: string[] = [
    `---
title: Large Scale Technical Benchmark
pdf:
  format: A4
  landscape: false
  margin:
    top: 20mm
    bottom: 20mm
    left: 20mm
    right: 20mm
diagram:
  width: 140mm
  height: 80mm
  fit: contain
  align: center
style:
  font:
    family: 'Noto Sans JP'
---

# Global Distributed Cloud Architecture

Comprehensive reference document containing extensive diagrams and content blocks.
`,
  ];

  // 30 diagram sections with substantial text content
  for (let i = 1; i <= 30; i++) {
    sections.push(`
## Module ${i}: Distributed Cluster Node ${i}

Node ${i} participates in quorum-based consensus using the Raft algorithm.
State machine replication guarantees linearizable reads and writes across all geographic regions.

### Node ${i} State Diagram

\`\`\`mermaid
stateDiagram-v2
  [*] --> Follower
  Follower --> Candidate: Election Timeout
  Candidate --> Leader: Quorum Votes Received
  Candidate --> Follower: Discovered Current Leader
  Leader --> Follower: Higher Term Seen
\`\`\`

### Data Flow for Region ${i}

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor User as End User ${i}
  participant Edge as Edge CDN
  participant App as Compute Pod ${i}
  participant DB as Distributed Shard ${i}

  User->>Edge: HTTPS GET /api/v1/cluster/${i}
  Edge->>App: Forward (Cache Miss)
  App->>DB: Query Quorum Read
  DB-->>App: Return Snapshot
  App-->>Edge: Cacheable Response
  Edge-->>User: 200 OK (gzipped)
\`\`\`

### Configuration Matrix ${i}

| Parameter | Default Value | Recommended Max | Notes |
|:---|:---:|:---:|:---|
| max_connections | 1000 | 5000 | Tuned for kernel ephemeral ports |
| keepalive_timeout | 65s | 120s | Matches ALB idle timeout |
| buffer_pool_size | 4GB | 32GB | 70% of available physical memory |
| replication_factor | 3 | 5 | Multi-AZ redundancy |
`);
  }

  return sections.join('\n');
}
