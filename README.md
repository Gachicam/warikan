# warikan

割り勘計算ライブラリの TypeScript 実装。複数人での支払い履歴から、誰が誰にいくら返済すべきかを計算します。

## インストール

```bash
npm install warikan
```

## 使い方

### 基本的な使い方

```typescript
import { solve } from "warikan";

// A さんが B さんのために 1000 円支払った
const payments = [{ amount: 1000, payer: "A", beneficiaries: ["B"] }];

const repayments = solve(payments);
// => [{ amount: 1000, from: 'B', to: 'A' }]
```

### 自分も含む割り勘

```typescript
// A さんが 2000 円支払い、A, B, C, D の4人で割り勘
const payments = [
  { amount: 2000, payer: "A", beneficiaries: ["A", "B", "C", "D"] },
];

const repayments = solve(payments);
// => [
//   { amount: 500, from: 'B', to: 'A' },
//   { amount: 500, from: 'C', to: 'A' },
//   { amount: 500, from: 'D', to: 'A' }
// ]
```

### 複数の支払い

```typescript
// 複数人が別々に支払った場合
const payments = [
  { amount: 1200, payer: "A", beneficiaries: ["A", "B"] },
  { amount: 1200, payer: "B", beneficiaries: ["A", "B", "C", "D"] },
  { amount: 1200, payer: "C", beneficiaries: ["A", "B", "C", "D"] },
  { amount: 1200, payer: "D", beneficiaries: ["B", "C", "D"] },
];

const repayments = solve(payments);
// => [
//   { amount: 200, from: 'B', to: 'C' },
//   { amount: 200, from: 'B', to: 'D' }
// ]
```

## API

### 型定義

```typescript
type Money = number; // 金額（円単位の整数）
type PersonId = string; // 人物を識別する文字列

interface Payment {
  amount: Money; // 支払い金額
  payer: PersonId; // 支払者
  beneficiaries: PersonId[]; // 受益者リスト
}

interface Repayment {
  amount: Money; // 返済金額
  from: PersonId; // 返済する人（債務者）
  to: PersonId; // 返済を受ける人（債権者）
}
```

### solve(payments: Payment[]): Repayment[]

支払い履歴から返済リストを計算します。

- 返済リストは `from` の Unicode コードポイント順、同じなら `to` の順でソートされます
- 端数は配列の最後の受益者に加算されます

#### バリデーション

以下の場合は `Error` をスローします:

- `amount` が負の値
- `payer` が空文字列
- `beneficiaries` に空文字列が含まれる
- `beneficiaries` に同一人物が複数回含まれる

## ライセンス

MIT
