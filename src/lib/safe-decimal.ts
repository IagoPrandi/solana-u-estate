import Decimal from "decimal.js";

const decimalPattern = /^\d+(\.\d+)?$/;
const BIGINT_ZERO = BigInt(0);
const BIGINT_TEN = BigInt(10);

Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
});

export function parseDecimalToUnits(value: string, decimals: number) {
  const normalizedValue = value.trim();

  if (!decimalPattern.test(normalizedValue)) {
    throw new Error("Invalid decimal string.");
  }

  const [wholePart, fractionPart = ""] = normalizedValue.split(".");

  if (fractionPart.length > decimals) {
    throw new Error("Decimal precision exceeds supported scale.");
  }

  const paddedFraction = fractionPart.padEnd(decimals, "0");
  const base = BIGINT_TEN ** BigInt(decimals);

  return BigInt(wholePart) * base + BigInt(paddedFraction || "0");
}

export function formatUnitsSafe(
  value: bigint | number,
  decimals: number,
  precision = decimals,
) {
  const bigintValue = typeof value === "bigint" ? value : BigInt(value);
  const isNegative = bigintValue < BIGINT_ZERO;
  const absoluteValue = isNegative ? -bigintValue : bigintValue;
  const base = BIGINT_TEN ** BigInt(decimals);
  const wholePart = absoluteValue / base;
  const fractionPart = absoluteValue % base;

  if (decimals === 0 || precision === 0) {
    return `${isNegative ? "-" : ""}${wholePart.toString()}`;
  }

  const trimmedPrecision = Math.min(decimals, precision);
  const rawFraction = fractionPart.toString().padStart(decimals, "0");
  const visibleFraction = rawFraction.slice(0, trimmedPrecision).replace(/0+$/, "");

  if (!visibleFraction) {
    return `${isNegative ? "-" : ""}${wholePart.toString()}`;
  }

  return `${isNegative ? "-" : ""}${wholePart.toString()}.${visibleFraction}`;
}

export function scaleBpsToPercent(bps: number) {
  return `${formatUnitsSafe(BigInt(bps), 2, 2)}%`;
}

export function normalizeDecimalString(
  value: Decimal.Value,
  maximumFractionDigits = 8,
) {
  const normalized = new Decimal(value).toFixed(maximumFractionDigits);
  const trimmed = normalized.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");

  return trimmed === "-0" ? "0" : trimmed;
}

export function multiplyDecimalStrings(
  left: Decimal.Value,
  right: Decimal.Value,
  maximumFractionDigits = 8,
) {
  return normalizeDecimalString(
    new Decimal(left).mul(new Decimal(right)),
    maximumFractionDigits,
  );
}

export function divideDecimalStrings(
  dividend: Decimal.Value,
  divisor: Decimal.Value,
  maximumFractionDigits = 18,
) {
  return normalizeDecimalString(
    new Decimal(dividend).div(new Decimal(divisor)),
    maximumFractionDigits,
  );
}

export function weiToEthDecimalString(
  value: bigint | string,
  maximumFractionDigits = 8,
) {
  return divideDecimalStrings(value.toString(), "1000000000000000000", maximumFractionDigits);
}

export function formatDecimalForDisplay(
  value: Decimal.Value,
  maximumFractionDigits = 2,
) {
  const fixed = new Decimal(value).toFixed(maximumFractionDigits);
  const [wholePart, fractionPart] = fixed.split(".");
  const groupedWholePart = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmedFraction = fractionPart?.replace(/0+$/, "");

  return trimmedFraction
    ? `${groupedWholePart}.${trimmedFraction}`
    : groupedWholePart;
}
