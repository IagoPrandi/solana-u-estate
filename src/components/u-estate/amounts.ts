const LAMPORT_DECIMALS = 9;
const LEGACY_WEI_DECIMALS = 18;
const LEGACY_WEI_MIN_DIGITS = 16;

function formatUnits(value: bigint, decimals: number, precision: number) {
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function storedSolAmountToDecimal(value: string, precision = 9) {
  const raw = BigInt(value);
  const normalizedPrecision = Math.max(0, Math.min(precision, LEGACY_WEI_DECIMALS));
  const decimals =
    value.replace(/^-/, "").length >= LEGACY_WEI_MIN_DIGITS
      ? LEGACY_WEI_DECIMALS
      : LAMPORT_DECIMALS;
  return formatUnits(raw, decimals, normalizedPrecision);
}

export function storedSolAmountToNumber(value: string) {
  return Number(storedSolAmountToDecimal(value, 9));
}
