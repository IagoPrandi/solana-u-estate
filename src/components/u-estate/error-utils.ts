type ErrorLike = {
  message?: unknown;
  error?: unknown;
};

function readText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  if (error && typeof error === "object") {
    const { message, error: nestedError } = error as ErrorLike;
    const text = readText(message) ?? readText(nestedError);
    if (text) return text;

    const rendered = String(error);
    if (rendered && rendered !== "[object Object]") {
      return rendered;
    }
  }

  return fallback;
}

export function summarizeProgramLogs(logs: string[]) {
  const normalized = logs
    .map((line) => line.replace(/^Program log:\s*/, "").trim())
    .filter(Boolean);

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const line = normalized[index];
    if (
      /AnchorError|Error Message:|failed:|custom program error|Invalid|insufficient|Unauthorized|already|not found|Constraint/i.test(
        line,
      )
    ) {
      return line;
    }
  }

  return normalized.at(-1) ?? null;
}