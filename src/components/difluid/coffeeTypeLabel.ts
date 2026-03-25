export function formatCoffeeTypeLabel(coffeeType: unknown): string {
  if (typeof coffeeType !== "string") {
    return "Unknown";
  }

  const normalized = coffeeType.trim();

  if (!normalized) {
    return "Unknown";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
