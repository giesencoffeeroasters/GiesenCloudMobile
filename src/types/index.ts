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

export interface InventorySummary {
  total_items: number;
  low_stock_count: number;
  total_weight_kg: number;
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
