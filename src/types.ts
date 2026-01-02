/**
 * 金額（円単位の整数）
 * - 正の整数: 通常の金額
 * - 0: 有効だがスキップされる
 * - 負の整数: 未定義動作（バリデーションでエラー）
 */
export type Money = number;

/**
 * 人物を識別する文字列
 * - 空文字列は無効
 */
export type PersonId = string;

/**
 * 一回の支払いを表す
 */
export interface Payment {
  /** 支払い金額（円） */
  amount: Money;

  /** 支払者の ID */
  payer: PersonId;

  /** 受益者リスト（支払者自身を含めることも可能） */
  beneficiaries: PersonId[];
}

/**
 * 返済（誰が誰にいくら払うべきか）
 */
export interface Repayment {
  /** 返済金額（円） */
  amount: Money;

  /** 返済する人（債務者） */
  from: PersonId;

  /** 返済を受ける人（債権者） */
  to: PersonId;
}
