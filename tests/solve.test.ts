import { describe, expect, test } from "vitest";
import { solve } from "../src/index.js";
import type { Payment, Repayment } from "../src/index.js";

describe("solve", () => {
  test.each<{ name: string; payments: Payment[]; expected: Repayment[] }>([
    {
      name: "empty payments",
      payments: [],
      expected: [],
    },
    {
      name: "simple payment",
      payments: [{ amount: 100, payer: "A", beneficiaries: ["B"] }],
      expected: [{ amount: 100, from: "B", to: "A" }],
    },
    {
      name: "payer is also beneficiary",
      payments: [{ amount: 100, payer: "A", beneficiaries: ["A", "B"] }],
      expected: [{ amount: 50, from: "B", to: "A" }],
    },
  ])("$name", ({ payments, expected }) => {
    expect(solve(payments)).toEqual(expected);
  });
});
