# warikan TypeScript API 仕様書

割り勘計算ライブラリの TypeScript 版仕様。

## 概要

複数人での支払い履歴から、誰が誰にいくら返済すべきかを計算するライブラリ。

## 型定義

### 基本型

```typescript
/**
 * 金額（円単位の整数）
 * - 正の整数: 通常の金額
 * - 0: 有効だがスキップされる
 * - 負の整数: 未定義動作（バリデーションでエラー）
 */
type Money = number;

/**
 * 人物を識別する文字列
 * - 空文字列は無効
 */
type PersonId = string;
```

### Payment（支払い）

```typescript
/**
 * 一回の支払いを表す
 */
interface Payment {
  /** 支払い金額（円） */
  amount: Money;

  /** 支払者の ID */
  payer: PersonId;

  /** 受益者リスト（支払者自身を含めることも可能） */
  beneficiaries: PersonId[];
}
```

**フィールド説明:**

- `amount`: 支払った金額。0の場合は無視される
- `payer`: 実際にお金を支払った人
- `beneficiaries`: この支払いの恩恵を受けた人のリスト
  - 空配列の場合、この支払いは無視される
  - payer 自身を含めることで、自分の分も負担として計算される
  - payer が beneficiaries に含まれない場合も有効（payer は全額を立て替えた扱いになる）

### Repayment（返済）

```typescript
/**
 * 返済（誰が誰にいくら払うべきか）
 */
interface Repayment {
  /** 返済金額（円） */
  amount: Money;

  /** 返済する人（債務者） */
  from: PersonId;

  /** 返済を受ける人（債権者） */
  to: PersonId;
}
```

## 関数

### solve

```typescript
/**
 * 支払い履歴から最小限の返済リストを計算する
 *
 * @param payments - 支払い履歴の配列
 * @returns 返済リスト（from の Unicode コードポイント順、同じなら to の Unicode コードポイント順）
 * @throws {Error} 不正な入力（負の金額、空の PersonId）の場合
 */
function solve(payments: Payment[]): Repayment[];
```

**アルゴリズム概要:**

1. 各人の残高（債権・債務）を計算
2. 支払い金額は受益者数で均等割り（端数は配列の最後の受益者に加算）
3. 債権者と債務者をグループ化
4. 金額の大きい順にマッチングして返済を生成（貪欲法）
5. 結果を from → to の順でソート

**アルゴリズム詳細:**

```text
1. 残高計算
   - 各人の残高を 0 で初期化
   - 各支払いについて:
     - 1人あたりの負担額 = amount ÷ beneficiaries.length（切り捨て）
     - 端数 = amount - (1人あたりの負担額 × beneficiaries.length)
     - payer の残高に amount を加算（債権）
     - 各 beneficiary の残高から 1人あたりの負担額を減算（債務）
     - 配列の最後の beneficiary の残高から端数を追加で減算

2. 債権者・債務者の分類
   - 残高 > 0 の人を債権者リストに追加
   - 残高 < 0 の人を債務者リストに追加
   - 残高 = 0 の人は無視

3. 貪欲法によるマッチング
   - 債権者を残高の降順でソート
   - 債務者を残高の絶対値の降順でソート
   - 債権者リストと債務者リストが両方空になるまで:
     - 最大の債権者と最大の債務者を取得
     - 返済額 = min(債権者の残高, 債務者の残高の絶対値)
     - Repayment { amount: 返済額, from: 債務者, to: 債権者 } を生成
     - 両者の残高を更新し、残高が 0 になった人はリストから除去

4. ソート
   - 返済リストを from の Unicode コードポイント順でソート
   - from が同じ場合は to の Unicode コードポイント順でソート
   - 同一の from/to ペアは1つの Repayment に集約される（貪欲法の性質上、同一ペアは発生しない）
```

**注意:** このアルゴリズムは返済回数の最小化を保証しない。最小化には NP 困難な集合分割問題を解く必要があるため、実用的な貪欲法を採用している。

## 使用例

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

## エッジケース

| ケース     | 入力                                                | 出力                                         |
| ---------- | --------------------------------------------------- | -------------------------------------------- |
| 空配列     | `[]`                                                | `[]`                                         |
| 金額が 0   | `[{ amount: 0, payer: 'A', beneficiaries: ['B'] }]` | `[]`                                         |
| 受益者が空 | `[{ amount: 100, payer: 'A', beneficiaries: [] }]`  | `[]`                                         |
| 相殺       | A→B で 100円、B→A で 100円                          | `[]`                                         |
| 端数処理   | 100円を3人で割る                                    | 33, 33, 34円（配列の最後の受益者に端数加算） |

**端数処理の補足:** 切り捨て除算を使用するため、端数は常に 0 以上となる。負の端数は発生しない。

## バリデーション

以下の場合は `Error` をスローする:

- `amount` が負の値
- `payer` が空文字列
- `beneficiaries` に空文字列が含まれる
- `beneficiaries` に同一人物が複数回含まれる

```typescript
// これらはエラーになる
solve([{ amount: -100, payer: "A", beneficiaries: ["B"] }]); // 負の金額
solve([{ amount: 100, payer: "", beneficiaries: ["B"] }]); // 空の payer
solve([{ amount: 100, payer: "A", beneficiaries: [""] }]); // 空の beneficiary
solve([{ amount: 100, payer: "A", beneficiaries: ["B", "B"] }]); // 重複する beneficiary
```

**エラーメッセージ形式:**

| エラー種別           | メッセージ                                    |
| -------------------- | --------------------------------------------- |
| 負の金額             | `Invalid amount: -100 (must be non-negative)` |
| 空の payer           | `Invalid payer: empty string`                 |
| 空の beneficiary     | `Invalid beneficiary: empty string`           |
| 重複する beneficiary | `Duplicate beneficiary: 'B'`                  |

## モジュール構成

```text
warikan/
├── src/
│   ├── index.ts        # エントリーポイント（re-export）
│   ├── types.ts        # 型定義（Money, PersonId, Payment, Repayment）
│   └── solve.ts        # solve 関数の実装
├── tests/
│   └── solve.test.ts   # テスト
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### エクスポート

```typescript
// src/index.ts
export type { Money, PersonId, Payment, Repayment } from "./types";
export { solve } from "./solve";
```

## テストケースの移植方針

Rust 版のテストケースを Vitest の `test.each` を使って移植する。

```typescript
// tests/solve.test.ts
import { describe, test, expect } from "vitest";
import { solve, Payment, Repayment } from "../src";

describe("solve", () => {
  test.each([
    // ケース1: シンプルな支払い
    {
      name: "simple payment",
      payments: [{ amount: 100, payer: "A", beneficiaries: ["B"] }],
      expected: [{ amount: 100, from: "B", to: "A" }],
    },
    // ケース2: 自分自身も受益者に含む場合
    {
      name: "payer is also beneficiary",
      payments: [{ amount: 100, payer: "A", beneficiaries: ["A", "B"] }],
      expected: [{ amount: 50, from: "B", to: "A" }],
    },
    // ... 他のケース
  ])("$name", ({ payments, expected }) => {
    expect(solve(payments)).toEqual(expected);
  });
});
```

### 移植するテストケース一覧

#### 1. シンプルな支払い（1対1）

- 入力: `[{ amount: 100, payer: 'A', beneficiaries: ['B'] }]`
- 期待出力: `[{ amount: 100, from: 'B', to: 'A' }]`

#### 2. 支払者が受益者に含まれる場合

- 入力: `[{ amount: 100, payer: 'A', beneficiaries: ['A', 'B'] }]`
- 期待出力: `[{ amount: 50, from: 'B', to: 'A' }]`

#### 3. 複数人への分割（4人割り勘）

- 入力: `[{ amount: 2000, payer: 'A', beneficiaries: ['A', 'B', 'C', 'D'] }]`
- 期待出力: `[{ amount: 500, from: 'B', to: 'A' }, { amount: 500, from: 'C', to: 'A' }, { amount: 500, from: 'D', to: 'A' }]`

#### 4. 複数の支払いがある場合

- 入力: 使用例「複数の支払い」参照
- 期待出力: `[{ amount: 200, from: 'B', to: 'C' }, { amount: 200, from: 'B', to: 'D' }]`

#### 5. 8人グループ、3つの支払い

- 入力:

  ```typescript
  [
    {
      amount: 8000,
      payer: "A",
      beneficiaries: ["A", "B", "C", "D", "E", "F", "G", "H"],
    },
    { amount: 4000, payer: "B", beneficiaries: ["A", "B", "C", "D"] },
    { amount: 2000, payer: "C", beneficiaries: ["E", "F"] },
  ];
  ```

- 残高計算: A=+6000, B=+2000, C=0, D=-2000, E=-2000, F=-2000, G=-1000, H=-1000

- 期待出力:

  ```typescript
  [
    { amount: 2000, from: "D", to: "A" },
    { amount: 2000, from: "E", to: "A" },
    { amount: 2000, from: "F", to: "A" },
    { amount: 1000, from: "G", to: "B" },
    { amount: 1000, from: "H", to: "B" },
  ];
  ```

#### 6. 9人グループ、多数の支払い

- 複雑なため Rust 版テストを参照

#### 7. 金額が 0 の支払いを含む

- 入力: `[{ amount: 0, payer: 'A', beneficiaries: ['B'] }, { amount: 100, payer: 'C', beneficiaries: ['D'] }]`
- 期待出力: `[{ amount: 100, from: 'D', to: 'C' }]`

#### 8. 受益者が空

- 入力: `[{ amount: 100, payer: 'A', beneficiaries: [] }]`
- 期待出力: `[]`

#### 9. 全員の収支が 0（相殺）

- 入力: `[{ amount: 100, payer: 'A', beneficiaries: ['B'] }, { amount: 100, payer: 'B', beneficiaries: ['A'] }]`
- 期待出力: `[]`

#### 10. 同額の債権・債務（ソート確認）

- 入力: `[{ amount: 100, payer: 'A', beneficiaries: ['C'] }, { amount: 100, payer: 'B', beneficiaries: ['D'] }]`
- 期待出力: `[{ amount: 100, from: 'C', to: 'A' }, { amount: 100, from: 'D', to: 'B' }]`

## TypeScript 設定

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Vitest 設定

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["tests/**/*.test.ts"],
  },
});
```

## npm パッケージ設定

```json
{
  "name": "warikan",
  "version": "0.1.0",
  "description": "割り勘計算ライブラリ",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "keywords": ["warikan", "split-bill", "割り勘"],
  "license": "MIT",
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^4.0.0"
  }
}
```

## Rust 版との対応表

| Rust                                    | TypeScript                                           |
| --------------------------------------- | ---------------------------------------------------- |
| `Money(i32)`                            | `type Money = number`                                |
| `Person(String)`                        | `type PersonId = string`                             |
| `Payment { money, from, to }`           | `interface Payment { amount, payer, beneficiaries }` |
| `Repayment { money, from, to }`         | `interface Repayment { amount, from, to }`           |
| `solve(Vec<Payment>) -> Vec<Repayment>` | `solve(payments: Payment[]): Repayment[]`            |

### 命名の変更理由

- `money` → `amount`: TypeScript では「金額」を表す際に `amount` がより一般的
- `from` → `payer`: Payment において「誰が支払ったか」をより明確に
- `to` → `beneficiaries`: Payment において「誰が恩恵を受けたか」をより明確に

## 完了チェックリスト

- [x] 型定義が決定している（Money, PersonId, Payment, Repayment）
- [x] solve 関数の TypeScript シグネチャが決定している
- [x] エッジケースの扱いが明確になっている（空配列、0円支払い等）
- [x] 仕様書が作成されている
