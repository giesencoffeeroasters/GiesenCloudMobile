interface AgtronDisplayStatInput {
  agtronNumber?: number | string | null;
  variance?: number | string | null;
}

export interface AgtronDisplayStat {
  label: string;
  value: string;
  unit: string;
}

export function getAgtronLabel(agtron: number): string {
  if (agtron < 35) return "Espresso";
  if (agtron < 45) return "French";
  if (agtron < 55) return "Full City";
  if (agtron < 65) return "City";
  if (agtron < 75) return "Dark";
  if (agtron < 85) return "Medium";
  if (agtron < 95) return "Cinnamon";
  return "Light";
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = typeof value === "number" ? value : Number(value);

  return Number.isFinite(normalized) ? normalized : null;
}

export function getAgtronDisplayStat({
  agtronNumber,
  variance,
}: AgtronDisplayStatInput): AgtronDisplayStat | null {
  const normalizedVariance = toFiniteNumber(variance);
  if (normalizedVariance !== null) {
    return {
      label: "Agtron",
      value: normalizedVariance.toFixed(2),
      unit: "Color variance",
    };
  }

  const normalizedAgtronNumber = toFiniteNumber(agtronNumber);
  if (normalizedAgtronNumber === null) {
    return null;
  }

  return {
    label: "Agtron",
    value: normalizedAgtronNumber.toFixed(1),
    unit: getAgtronLabel(normalizedAgtronNumber),
  };
}
