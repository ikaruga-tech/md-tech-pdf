# Contributing to md-tech-pdf

Thank you for your interest in contributing to md-tech-pdf! We welcome contributions, bug reports, feature requests, and documentation improvements.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](file:///Users/nana/Develop/Markdown4TechnicalDocument/md-tech-pdf/CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Development Setup

### Prerequisites

- Node.js >= 22.13.0
- pnpm >= 11.0.0
- Java Runtime Environment (JRE/JDK >= 11, optional for PlantUML local execution)

### Getting Started

1. Fork and clone the repository:

   ```bash
   git clone https://github.com/<your-username>/md-tech-pdf.git
   cd md-tech-pdf
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Build Core and CLI:

   ```bash
   pnpm build
   ```

4. Run tests:

   ```bash
   pnpm test
   ```

5. Setup VS Code extension development:
   ```bash
   cd vscode-extension
   npm install
   npm run build
   npm run test:unit
   ```

## Development Workflow

### Scripts Reference

Root directory:

- `pnpm build`: Compile TypeScript sources to `dist/`.
- `pnpm test`: Run Core unit tests via Vitest.
- `pnpm lint`: Run ESLint across the codebase.
- `pnpm format`: Format all code with Prettier.
- `pnpm format:check`: Verify code formatting without modifications.
- `pnpm benchmark`: Run diagram rendering benchmarks.

VS Code extension directory (`vscode-extension/`):

- `npm run build`: Compile extension TypeScript sources to `dist/`.
- `npm run typecheck`: Run type checking on extension and test suites.
- `npm run test:unit`: Run Mocha unit tests for extension components.
- `npm run package:vsix`: Package the `.vsix` extension file.

### Coding Standards

- Maintain strict TypeScript type safety without unnecessary `any`.
- Keep code formatted with Prettier (`pnpm format`).
- Ensure all tests pass before opening a Pull Request.
- Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:
  - `feat`: New feature or user-facing capability.
  - `fix`: Bug fix.
  - `docs`: Documentation updates.
  - `test`: Adding or updating test suites.
  - `refactor`: Code changes that neither fix bugs nor add features.
  - `ci`: CI/CD workflow modifications.

## Submitting Pull Requests

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Commit your changes with meaningful commit messages.
3. Push to your fork:
   ```bash
   git push origin feat/my-new-feature
   ```
4. Open a Pull Request targeting `main`.
5. Ensure all automated GitHub Actions CI checks pass.
