/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** $370.00, always with cents, so totals line up and read as money. */
export const formatMoney = (amount: number) => `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
