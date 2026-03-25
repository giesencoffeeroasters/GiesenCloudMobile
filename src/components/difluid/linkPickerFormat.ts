type LinkPickerItem = {
  id: string | number;
  name?: string;
  profile_name?: string;
  bean_type?: string | null;
  device_name?: string;
  start_weight?: number | null;
  duration?: number | null;
  weight_change?: number | null;
  cupping_score?: number | null;
  created_at?: string;
  roasted_at?: string;
};

function formatWeightKg(weight?: number | null): string | null {
  if (typeof weight !== "number" || !Number.isFinite(weight)) {
    return null;
  }

  return `${(weight / 1000).toFixed(1)} kg`;
}

function formatDuration(seconds?: number | null): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return null;
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, seconds % 60);

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatDateLabel(dateString?: string): string | null {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getLinkPickerTitle(item: LinkPickerItem): string {
  return item.name ?? item.profile_name ?? `#${item.id}`;
}

export function formatLinkPickerMeta(item: LinkPickerItem): string {
  const parts = [item.device_name, formatWeightKg(item.start_weight)].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(" • ") : `ID: ${item.id}`;
}

export function formatLinkPickerSecondary(item: LinkPickerItem): string {
  const parts = [
    item.profile_name && item.profile_name !== item.name ? item.profile_name : null,
    item.bean_type ?? null,
    formatDateLabel(item.roasted_at ?? item.created_at),
    formatDuration(item.duration),
    typeof item.weight_change === "number" && Number.isFinite(item.weight_change)
      ? `${Math.abs(item.weight_change).toFixed(1)}% loss`
      : null,
    typeof item.cupping_score === "number" && Number.isFinite(item.cupping_score)
      ? `${item.cupping_score.toFixed(1)} pts`
      : null,
  ].filter((value): value is string => Boolean(value));

  return parts.join(" • ");
}
