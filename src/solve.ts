import type { Payment, Repayment } from "./types.js";

/**
 * 支払い履歴から最小限の返済リストを計算する
 *
 * @param payments - 支払い履歴の配列
 * @returns 返済リスト（from の Unicode コードポイント順、同じなら to の Unicode コードポイント順）
 * @throws {Error} 不正な入力（負の金額、空の PersonId）の場合
 */
export function solve(payments: Payment[]): Repayment[] {
  // TODO: 実装
  void payments;
  return [];
}
