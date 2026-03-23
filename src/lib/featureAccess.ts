import type {
  AccessCapabilityKey,
  AccessContext,
  AccessFeatureKey,
  AppUser,
  DeviceCapabilities,
  DeviceCapabilityKey,
} from "@/types";

export interface AccessAwareTabDefinition<TKey extends string = string> {
  key: TKey;
  title: string;
  requiresCapabilities?: AccessCapabilityKey[];
  requiresFeatures?: AccessFeatureKey[];
}

export interface SelectableDeviceLike {
  id: number | string;
  name: string;
  capabilities?: DeviceCapabilities;
  subscriptions?: DeviceCapabilities;
}

type AccessSubject = AccessContext | AppUser | null | undefined;

const MODULE_CAPABILITY_MAP: Record<string, DeviceCapabilityKey | undefined> = {
  planning: "roast_planning",
  inventory: "inventory",
  quality: "quality",
  reports: "reports",
  "giesen-live": "giesen_live",
};

function isUserLike(subject: AccessSubject): subject is AppUser {
  return Boolean(subject && typeof subject === "object" && "access_context" in subject);
}

function resolveAccessContext(subject: AccessSubject): AccessContext | null {
  if (!subject) {
    return null;
  }

  if (isUserLike(subject)) {
    return subject.access_context ?? null;
  }

  return subject;
}

function isEnabled(value: unknown): value is true {
  return value === true;
}

function hasCapabilities(
  subject: AccessSubject,
  requiredCapabilities: readonly AccessCapabilityKey[] = [],
): boolean {
  const context = resolveAccessContext(subject);

  return requiredCapabilities.every((key) => isEnabled(context?.capabilities?.[key]));
}

function hasFeatures(
  subject: AccessSubject,
  requiredFeatures: readonly AccessFeatureKey[] = [],
): boolean {
  const context = resolveAccessContext(subject);

  return requiredFeatures.every(
    (key) =>
      isEnabled(context?.features?.[key]) ||
      context?.enabled_feature_keys?.includes(key) === true,
  );
}

function getDeviceCapabilities(
  device: SelectableDeviceLike,
): DeviceCapabilities {
  return device.capabilities ?? device.subscriptions ?? {};
}

function canDeviceAccessCapability(
  device: SelectableDeviceLike,
  capability: DeviceCapabilityKey,
): boolean {
  return isEnabled(getDeviceCapabilities(device)[capability]);
}

export function canAccessCapability(
  subject: AccessSubject,
  key: AccessCapabilityKey,
): boolean {
  return hasCapabilities(subject, [key]);
}

export function canAccessFeature(
  subject: AccessSubject,
  key: AccessFeatureKey,
): boolean {
  return hasFeatures(subject, [key]);
}

export function getVisibleTabs<T extends AccessAwareTabDefinition>(
  subject: AccessSubject,
  tabDefs: readonly T[],
): T[] {
  return tabDefs.filter(
    (tab) =>
      hasCapabilities(subject, tab.requiresCapabilities) &&
      hasFeatures(subject, tab.requiresFeatures),
  );
}

export function getSelectableDevicesFor<T extends SelectableDeviceLike>(
  module: string,
  devices: readonly T[],
): T[] {
  const requiredCapability = MODULE_CAPABILITY_MAP[module];

  if (!requiredCapability) {
    return [...devices];
  }

  return devices.filter((device) =>
    canDeviceAccessCapability(device, requiredCapability),
  );
}
