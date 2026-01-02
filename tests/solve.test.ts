import { describe, expect, test } from "vitest";
import { solve } from "../src/index.js";
import type { Payment, Repayment } from "../src/index.js";

describe("solve", () => {
  test.each<{ name: string; payments: Payment[]; expected: Repayment[] }>([
    // 1. 空配列
    {
      name: "empty payments",
      payments: [],
      expected: [],
    },
    // 2. シンプルな支払い（1対1）
    {
      name: "simple payment",
      payments: [{ amount: 100, payer: "A", beneficiaries: ["B"] }],
      expected: [{ amount: 100, from: "B", to: "A" }],
    },
    // 3. 支払者が受益者に含まれる場合
    {
      name: "payer is also beneficiary",
      payments: [{ amount: 100, payer: "A", beneficiaries: ["A", "B"] }],
      expected: [{ amount: 50, from: "B", to: "A" }],
    },
    // 4. 複数人への分割（4人割り勘）
    {
      name: "split among 4 people",
      payments: [
        { amount: 2000, payer: "A", beneficiaries: ["A", "B", "C", "D"] },
      ],
      expected: [
        { amount: 500, from: "B", to: "A" },
        { amount: 500, from: "C", to: "A" },
        { amount: 500, from: "D", to: "A" },
      ],
    },
    // 5. 複数の支払いがある場合
    {
      name: "multiple payments",
      payments: [
        { amount: 1200, payer: "A", beneficiaries: ["A", "B"] },
        { amount: 1200, payer: "B", beneficiaries: ["A", "B", "C", "D"] },
        { amount: 1200, payer: "C", beneficiaries: ["A", "B", "C", "D"] },
        { amount: 1200, payer: "D", beneficiaries: ["B", "C", "D"] },
      ],
      expected: [
        { amount: 200, from: "B", to: "C" },
        { amount: 200, from: "B", to: "D" },
      ],
    },
    // 6. 8人グループ、3つの支払い
    {
      name: "8 people group with 3 payments",
      payments: [
        {
          amount: 8000,
          payer: "A",
          beneficiaries: ["A", "B", "C", "D", "E", "F", "G", "H"],
        },
        { amount: 4000, payer: "B", beneficiaries: ["A", "B", "C", "D"] },
        { amount: 2000, payer: "C", beneficiaries: ["E", "F"] },
      ],
      expected: [
        { amount: 2000, from: "D", to: "A" },
        { amount: 2000, from: "E", to: "A" },
        { amount: 2000, from: "F", to: "A" },
        { amount: 1000, from: "G", to: "B" },
        { amount: 1000, from: "H", to: "B" },
      ],
    },
    // 7. 金額が 0 の支払いを含む
    {
      name: "zero amount payment",
      payments: [
        { amount: 0, payer: "A", beneficiaries: ["B"] },
        { amount: 100, payer: "C", beneficiaries: ["D"] },
      ],
      expected: [{ amount: 100, from: "D", to: "C" }],
    },
    // 8. 受益者が空
    {
      name: "empty beneficiaries",
      payments: [{ amount: 100, payer: "A", beneficiaries: [] }],
      expected: [],
    },
    // 9. 全員の収支が 0（相殺）
    {
      name: "complete offset",
      payments: [
        { amount: 100, payer: "A", beneficiaries: ["B"] },
        { amount: 100, payer: "B", beneficiaries: ["A"] },
      ],
      expected: [],
    },
    // 10. 同額の債権・債務（ソート確認）
    {
      name: "same amount credits and debts (sort check)",
      payments: [
        { amount: 100, payer: "A", beneficiaries: ["C"] },
        { amount: 100, payer: "B", beneficiaries: ["D"] },
      ],
      expected: [
        { amount: 100, from: "C", to: "A" },
        { amount: 100, from: "D", to: "B" },
      ],
    },
  ])("$name", ({ payments, expected }) => {
    expect(solve(payments)).toEqual(expected);
  });

  describe("validation", () => {
    test("throws on negative amount", () => {
      expect(() =>
        solve([{ amount: -100, payer: "A", beneficiaries: ["B"] }])
      ).toThrow("Invalid amount: -100 (must be non-negative)");
    });

    test("throws on empty payer", () => {
      expect(() =>
        solve([{ amount: 100, payer: "", beneficiaries: ["B"] }])
      ).toThrow("Invalid payer: empty string");
    });

    test("throws on empty beneficiary", () => {
      expect(() =>
        solve([{ amount: 100, payer: "A", beneficiaries: [""] }])
      ).toThrow("Invalid beneficiary: empty string");
    });

    test("throws on duplicate beneficiary", () => {
      expect(() =>
        solve([{ amount: 100, payer: "A", beneficiaries: ["B", "B"] }])
      ).toThrow("Duplicate beneficiary: 'B'");
    });
  });
});
