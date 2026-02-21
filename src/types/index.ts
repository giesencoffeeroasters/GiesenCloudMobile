export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface DashboardData {
  today_roasts: number;
  active_roasters: number;
  low_stock_count: number;
  schedule: RoastPlan[];
  live_roasters: LiveRoaster[];
}

export interface RoastPlan {
  id: number;
  scheduled_at: string;
  profile: {
    id: number;
    name: string;
  };
  device: {
    id: number;
    name: string;
  };
  green_coffee: string;
  batch_size: number;
  status: string;
}

export interface LiveRoaster {
  device_id: number;
  device_name: string;
  profile_name: string;
  bean_temp: number;
  duration: number;
  ror: number;
}

export interface PlanningItem {
  id: number;
  planned_at: string;
  roasted_at: string | null;
  amount: number;
  roasted_amount: number | null;
  order: number;
  description: string | null;
  profile: {
    id: number;
    name: string;
    duration: number;
    start_weight: number;
    roaster_model: string;
  } | null;
  device: {
    id: number;
    name: string;
    model: string;
  } | null;
  user: {
    id: number;
    name: string;
  } | null;
  employee: {
    id: number;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  formatted_inventory_number: string;
  current_quantity_grams: number;
  low_stock_threshold_grams: number;
  stock_status: "ok" | "low" | "critical";
  supplier: {
    id: number;
    name: string;
  } | null;
  location: {
    id: number;
    name: string;
  } | null;
  item_type: {
    id: number;
    name: string;
    code: string;
  } | null;
  status: {
    id: number;
    name: string;
    code: string;
  } | null;
  varieties: { id: number; name: string }[];
  certificates: { id: number; name: string }[];
  received_at: string | null;
  created_at: string;
}

export interface InventorySummary {
  total_items: number;
  total_weight: number;
  low_stock_count: number;
}

/** @deprecated Use InventoryItem instead */
export interface Inventory {
  id: number;
  name: string;
  sku: string | null;
  type: string;
  current_stock: number;
  unit: string;
  low_stock_threshold: number;
  is_low_stock: boolean;
  location: {
    id: number;
    name: string;
  };
}

export interface ProfilerDevice {
  id: string;
  name: string;
  model: string;
  serial_number: string | null;
  roasting_hours: number | null;
  running_hours: number | null;
  connection_type: string | null;
  ip_address: string | null;
  version: string | null;
  claim_status: string | null;
  last_synced_at: string | null;
  roasts_count: number;
  image_url: string | null;
}

export interface ProfilerDeviceDetail extends ProfilerDevice {
  sync_status: string | null;
  settings: Record<string, unknown> | null;
  subscriptions: {
    giesen_live: boolean;
    roast_planning: boolean;
    inventory: boolean;
    profiler_compare: boolean;
    profiler_storage: boolean;
    profiler: boolean;
  };
  latest_roasts: DeviceRoast[];
}

export interface DeviceRoast {
  id: string;
  profile_name: string | null;
  duration: number | null;
  bean_temp_end: number | null;
  batch_size: number | null;
  roasted_at: string | null;
}

export interface Notification {
  id: string;
  type: string;
  data: {
    title?: string;
    message?: string;
    body?: string;
    [key: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
}

export interface ProfilerProfile {
  id: string;
  name: string;
  roaster_model: string | null;
  duration: number | null;
  start_weight: number | null;
  end_weight: number | null;
  weight_change: number | null;
  bean_type: string | null;
  is_favorite: boolean;
  roasts_count: number;
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
  email?: string;
}

export interface ProfileSummary {
  total_count: number;
  favorites_count: number;
  avg_duration: number | null;
}

export interface ProfileRecentRoast {
  id: string;
  profile_name: string;
  device_name: string;
  bean_type: string | null;
  start_weight: number | null;
  end_weight: number | null;
  weight_change: number | null;
  duration: number;
  roasted_at: string;
}

export interface ProfilerProfileDetail {
  id: string;
  name: string;
  roaster_model: string | null;
  duration: number | null;
  start_weight: number | null;
  end_weight: number | null;
  weight_change: number | null;
  bean_type: string | null;
  type: string | null;
  is_favorite: boolean;
  comment: string | null;
  roasts_count: number;
  created_at: string;
  curve_data: {
    bean_temp: { time: number; value: number }[];
    drum_temp: { time: number; value: number }[];
    ror: { time: number; value: number }[];
  } | null;
  recent_roasts: ProfileRecentRoast[];
}

export interface ProfilerRoast {
  id: number;
  profile_name: string;
  device_name: string;
  bean_temp_end: number;
  duration: number;
  ror: number;
  score: number | null;
  roasted_at: string;
  green_coffee: string;
  batch_size: number;
}
