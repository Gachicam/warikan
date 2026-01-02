# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

割り勘計算ライブラリの TypeScript 実装。複数人での支払い履歴から、誰が誰にいくら返済すべきかを計算する。

## Commands

```bash
# Install dependencies
npm install

# Build
npm run build

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a single test file
npx vitest run tests/solve.test.ts

# Run tests matching a pattern
npx vitest run -t "simple payment"
```

## Architecture

```
src/
├── index.ts      # Re-exports (entry point)
├── types.ts      # Type definitions (Money, PersonId, Payment, Repayment)
└── solve.ts      # Main algorithm implementation

tests/
└── solve.test.ts # Test cases using vitest test.each
```

### Core Algorithm (solve.ts)

1. **残高計算**: 各人の債権・債務を計算（端数は最後の beneficiary に加算）
2. **分類**: 残高 > 0 を債権者、< 0 を債務者にグループ化
3. **貪欲法マッチング**: 金額の大きい順にマッチングして返済を生成
4. **ソート**: from → to の Unicode コードポイント順

## Specification

詳細な仕様は [docs/SPEC.md](docs/SPEC.md) を参照。
