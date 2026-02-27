export type UnitType = 'weight' | 'pieces' | 'volume';

export function formatQuantity(
  value: number | null | undefined,
  unitType: UnitType,
  weightUnit: string = 'kg',
  includeLabel: boolean = true
): string | number | null {
  if (value === null || value === undefined) return null;

  switch (unitType) {
    case 'weight':
      return formatWeight(value, weightUnit, includeLabel);
    case 'pieces':
      return includeLabel ? `${value} pcs` : value;
    case 'volume':
      return includeLabel
        ? `${(value / 1000).toFixed(2)} L`
        : parseFloat((value / 1000).toFixed(2));
    default:
      return formatWeight(value, weightUnit, includeLabel);
  }
}

function formatWeight(
  value: number,
  weightUnit: string,
  includeLabel: boolean
): string | number {
  switch (weightUnit) {
    case 'kg':
      return includeLabel ? `${(value / 1000).toFixed(2)} kg` : parseFloat((value / 1000).toFixed(2));
    case 'lb':
      return includeLabel ? `${(value * 0.00220462).toFixed(2)} lb` : parseFloat((value * 0.00220462).toFixed(2));
    case 'g':
      return includeLabel ? `${value} g` : value;
    case 'oz':
      return includeLabel ? `${(value * 0.035274).toFixed(2)} oz` : parseFloat((value * 0.035274).toFixed(2));
    default:
      return includeLabel ? `${(value / 1000).toFixed(2)} kg` : parseFloat((value / 1000).toFixed(2));
  }
}

export function getUnitLabel(unitType: UnitType): string {
  switch (unitType) {
    case 'weight': return 'kg';
    case 'pieces': return 'pcs';
    case 'volume': return 'L';
    default: return 'kg';
  }
}

export function getPriceLabel(unitType: UnitType): string {
  switch (unitType) {
    case 'weight': return 'per kg';
    case 'pieces': return 'per pc';
    case 'volume': return 'per L';
    default: return 'per kg';
  }
}

export function convertToBaseUnit(value: number, unitType: UnitType): number {
  switch (unitType) {
    case 'weight': return value * 1000; // kg to g
    case 'pieces': return value;
    case 'volume': return value * 1000; // L to ml
    default: return value * 1000;
  }
}

export function convertFromBaseUnit(value: number, unitType: UnitType): number {
  switch (unitType) {
    case 'weight': return value / 1000; // g to kg
    case 'pieces': return value;
    case 'volume': return value / 1000; // ml to L
    default: return value / 1000;
  }
}
