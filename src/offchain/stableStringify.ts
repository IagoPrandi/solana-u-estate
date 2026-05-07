type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

function sortRecursively(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, JsonValue>>((sorted, key) => {
        sorted[key] = sortRecursively(value[key]);
        return sorted;
      }, {});
  }

  return value;
}

export function stableStringify(value: JsonValue) {
  return JSON.stringify(sortRecursively(value));
}
