import type { Money, Payment, PersonId, Repayment } from "./types.js";

/**
 * 支払いをバリデートする
 */
function validatePayment(payment: Payment): void {
  if (payment.amount < 0) {
    throw new Error(
      `Invalid amount: ${String(payment.amount)} (must be non-negative)`
    );
  }
  if (payment.payer === "") {
    throw new Error("Invalid payer: empty string");
  }
  const seen = new Set<PersonId>();
  for (const beneficiary of payment.beneficiaries) {
    if (beneficiary === "") {
      throw new Error("Invalid beneficiary: empty string");
    }
    if (seen.has(beneficiary)) {
      throw new Error(`Duplicate beneficiary: '${beneficiary}'`);
    }
    seen.add(beneficiary);
  }
}

/**
 * 各人の残高を計算する
 */
function calculateBalances(payments: Payment[]): Map<PersonId, Money> {
  const balances = new Map<PersonId, Money>();

  const getBalance = (id: PersonId): Money => balances.get(id) ?? 0;
  const addBalance = (id: PersonId, amount: Money): void => {
    balances.set(id, getBalance(id) + amount);
  };

  for (const payment of payments) {
    // 金額0または受益者が空の場合はスキップ
    if (payment.amount === 0 || payment.beneficiaries.length === 0) {
      continue;
    }

    const count = payment.beneficiaries.length;
    const perPerson = Math.floor(payment.amount / count);
    const remainder = payment.amount - perPerson * count;

    // 支払者は全額を債権として持つ
    addBalance(payment.payer, payment.amount);

    // 各受益者は負担額を債務として持つ
    for (let i = 0; i < count; i++) {
      const beneficiary = payment.beneficiaries[i];
      // 最後の受益者に端数を加算
      const share = i === count - 1 ? perPerson + remainder : perPerson;
      addBalance(beneficiary, -share);
    }
  }

  return balances;
}

/**
 * 貪欲法で返済リストを生成する
 */
function generateRepayments(balances: Map<PersonId, Money>): Repayment[] {
  // 債権者（残高 > 0）と債務者（残高 < 0）に分類
  const creditors: { id: PersonId; amount: Money }[] = [];
  const debtors: { id: PersonId; amount: Money }[] = [];

  for (const [id, balance] of balances) {
    if (balance > 0) {
      creditors.push({ id, amount: balance });
    } else if (balance < 0) {
      debtors.push({ id, amount: -balance }); // 絶対値で保持
    }
  }

  // 金額の大きい順にソート
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const repayments: Repayment[] = [];

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const amount = Math.min(creditor.amount, debtor.amount);

    repayments.push({
      amount,
      from: debtor.id,
      to: creditor.id,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount === 0) ci++;
    if (debtor.amount === 0) di++;
  }

  return repayments;
}

/**
 * 返済リストをソートする（from → to の Unicode コードポイント順）
 */
function sortRepayments(repayments: Repayment[]): Repayment[] {
  return repayments.sort((a, b) => {
    const fromCmp = a.from.localeCompare(b.from);
    if (fromCmp !== 0) return fromCmp;
    return a.to.localeCompare(b.to);
  });
}

/**
 * 支払い履歴から最小限の返済リストを計算する
 *
 * @param payments - 支払い履歴の配列
 * @returns 返済リスト（from の Unicode コードポイント順、同じなら to の Unicode コードポイント順）
 * @throws {Error} 不正な入力（負の金額、空の PersonId）の場合
 */
export function solve(payments: Payment[]): Repayment[] {
  // 1. バリデーション
  for (const payment of payments) {
    validatePayment(payment);
  }

  // 2. 残高計算
  const balances = calculateBalances(payments);

  // 3. 貪欲法でマッチング
  const repayments = generateRepayments(balances);

  // 4. ソート
  return sortRepayments(repayments);
}
