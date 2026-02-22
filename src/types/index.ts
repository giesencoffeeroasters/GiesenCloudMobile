/* ------------------------------------------------------------------ */
/*  Shared roasting data types                                          */
/* ------------------------------------------------------------------ */

export interface CurvePoint {
  time: number;
  value: number;
}

export interface ExtendedCurveData {
  bean_temp: CurvePoint[];
  drum_temp: CurvePoint[];
  ror: CurvePoint[];
  power: CurvePoint[];
  drum_speed: CurvePoint[];
  pressure: CurvePoint[];
}

export interface RoastEvent {
  type: string;
  timePassed: number;
}

export interface RoastPhase {
  name: string;
  start_time: number;
  end_time: number;
  color: string;
}

export interface RoastSetpoint {
  key: string;
  value: number;
  timePassed?: number;
}

/* ------------------------------------------------------------------ */
/*  API response wrappers                                               */
/* ------------------------------------------------------------------ */

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
  order: number;
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

  // Detail fields (only present on show endpoint)
  country_of_origin?: string | null;
  region_of_origin?: string | null;
  production_year?: number | null;
  size_grade?: string | null;
  sku?: string | null;
  lot_code?: string | null;
  price_per_kg?: number | null;
  currency?: string | null;
  notes?: string | null;
  processing_methods?: { id: number; name: string }[];
  latest_physical_reading?: {
    moisture_content: number | null;
    water_activity: number | null;
    density: number | null;
    temperature: number | null;
    humidity: number | null;
    measured_at: string | null;
  } | null;
  latest_defect_analysis?: {
    sample_weight_grams: number | null;
    total_category_1_defects: number;
    total_category_2_defects: number;
    sca_grade: string | null;
    analyzed_at: string | null;
  } | null;
  latest_screen_analysis?: {
    sample_weight_grams: number | null;
    analyzed_at: string | null;
    results: {
      screen_size: number;
      weight_grams: number;
      percentage: number;
    }[];
  } | null;
  cupping_samples?: {
    id: number;
    sample_code: string;
    average_score: number | null;
    session_id: number;
  }[];
  assigned_profiles?: {
    id: number;
    name: string;
    roaster_model: string | null;
    duration: number | null;
    is_main: boolean;
  }[];
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
  has_planning_subscription?: boolean;
  has_speciality_or_industrial?: boolean;
  subscription_tier?: string | null;
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
  curve_data: ExtendedCurveData | null;
  events: RoastEvent[];
  phases: RoastPhase[];
  setpoints: RoastSetpoint[];
  inventories: {
    id: number;
    name: string;
    formatted_inventory_number: string;
    is_main: boolean;
  }[];
  recent_roasts: ProfileRecentRoast[];
}

export interface RoastDetail {
  id: string;
  profile_name: string;
  device_name: string;
  bean_type: string | null;
  start_weight: number | null;
  end_weight: number | null;
  weight_change: number | null;
  duration: number;
  roasted_at: string;
  is_favorite: boolean;
  comment: string | null;
  cupping_score: number | null;
  beans: unknown[] | null;
  profile: { id: string; name: string } | null;
  curve_data: ExtendedCurveData | null;
  events: RoastEvent[];
  phases: RoastPhase[];
  setpoints: RoastSetpoint[];
  inventory_selections: {
    inventory_id: number;
    inventory_name: string;
    formatted_inventory_number: string;
    quantity_grams: number;
    percentage: number;
  }[];
  cupping_samples: {
    id: number;
    sample_code: string;
    average_score: number | null;
    session_id: number;
  }[];
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

// Cupping / Quality types
export interface CuppingFormAttribute {
  id: number;
  name: string;
  label: string;
  min_score: number;
  max_score: number;
  step: number;
  sort_order: number;
  is_required: boolean;
  has_cup_tracking: boolean;
  has_descriptors: boolean;
  score_group: string | null;
}

export interface CuppingForm {
  id: number;
  name: string;
  type: string;
  attributes: CuppingFormAttribute[];
}

export interface CuppingScoreEntry {
  cupping_form_attribute_id: number;
  score: number;
}

export interface CuppingCupScoreEntry {
  cupping_form_attribute_id: number;
  cup_number: number;
  passed: boolean;
}

export interface CuppingDescriptorEntry {
  cupping_form_attribute_id: number;
  cupping_descriptor_id: number;
  descriptor_name: string | null;
  is_positive: boolean;
  intensity: "low" | "medium" | "high" | null;
}

export interface CuppingDescriptorItem {
  id: number;
  name: string;
}

export interface CuppingDescriptorCategory {
  id: number;
  name: string;
  children: {
    id: number;
    name: string;
    children: CuppingDescriptorItem[];
  }[];
}

export interface CuppingEvaluation {
  id: number;
  total_score: number | null;
  defect_cups: number;
  defect_intensity: number;
  notes: string | null;
  scores: CuppingScoreEntry[];
  cup_scores: CuppingCupScoreEntry[];
  descriptors: CuppingDescriptorEntry[];
}

export interface CuppingSample {
  id: number;
  sample_number: number;
  sample_code: string;
  label: string | null;
  notes: string | null;
  average_score: number | null;
  attributes: { label: string; score: number }[];
  my_evaluation: CuppingEvaluation | null;
}

export interface CuppingSessionDetail {
  id: number;
  name: string;
  description: string | null;
  status: string;
  is_blind: boolean;
  scheduled_at: string | null;
  created_at: string | null;
  creator: { id: number; name: string } | null;
  overall_score: number | null;
  form: CuppingForm;
  samples: CuppingSample[];
}

// Maintenance types
export type MaintenanceTaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "overdue"
  | "skipped";
export type MaintenancePriority = "critical" | "high" | "medium" | "low";
export type WarrantyStatus = "active" | "suspended" | "expired" | "voided";

export interface MaintenanceTask {
  id: number;
  title: string;
  status: MaintenanceTaskStatus;
  status_label: string;
  priority: MaintenancePriority;
  priority_label: string;
  is_warranty_required: boolean;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  skip_reason: string | null;
  notes: string | null;
  assignee: { id: number; name: string } | null;
  asset: { hubspot_id: string; name: string } | null;
  warranty: MaintenanceWarranty | null;
  template: {
    id: number;
    title: string;
    description: string | null;
    estimated_minutes: number | null;
    trigger_type: string;
  } | null;
  steps: MaintenanceTaskStep[];
  comments: MaintenanceComment[];
  comments_count: number;
  steps_completed: number;
  steps_total: number;
  created_at: string;
}

export interface MaintenanceTaskStep {
  id: number;
  title: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: { id: number; name: string } | null;
  photo_path: string | null;
  reading_value: string | null;
  reading_label: string | null;
  notes: string | null;
  requires_photo: boolean;
  requires_reading: boolean;
  reading_unit: string | null;
  description: string | null;
}

export interface MaintenanceWarranty {
  id: number;
  status: WarrantyStatus;
  compliance_score: number;
  expires_at: string | null;
}

export interface MaintenanceComment {
  id: number;
  comment: string;
  is_staff_comment: boolean;
  user: { id: number; name: string };
  created_at: string;
}

export interface MaintenanceSummary {
  overdue_count: number;
  pending_count: number;
  in_progress_count: number;
  completed_this_month: number;
  compliance_scores: {
    asset_name: string;
    warranty_status: WarrantyStatus;
    score: number;
  }[];
  upcoming_tasks: MaintenanceTask[];
}

export interface SkipImpact {
  current_score: number;
  projected_score: number;
  will_void: boolean;
}

// Calendar
export interface CalendarTask {
  id: number;
  title: string;
  priority: MaintenancePriority;
  status: MaintenanceTaskStatus;
  due_at: string;
  asset_name: string;
  assignee_name: string | null;
}

export type CalendarData = Record<string, CalendarTask[]>;

// Warranty detail
export interface WarrantyDetail {
  id: number;
  asset_id: string;
  asset_name: string;
  roaster_model: string;
  status: WarrantyStatus;
  compliance_score: number;
  started_at: string | null;
  expires_at: string | null;
  tasks_summary: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    skipped: number;
    in_progress: number;
  };
  recent_tasks: MaintenanceTask[];
}

// Warranty list item (from /maintenance/warranties)
export interface WarrantyListItem {
  id: number;
  asset_name: string;
  asset_id: string;
  roaster_model: string;
  status: WarrantyStatus;
  compliance_score: number;
  started_at: string | null;
  expires_at: string | null;
}

// Team asset (for asset filter chips)
export interface TeamAsset {
  hubspot_id: string;
  name: string;
  model: string;
}

/* ------------------------------------------------------------------ */
/*  Support Tickets                                                     */
/* ------------------------------------------------------------------ */

export interface TicketPipelineStage {
  id: number;
  label: string;
  customer_label: string;
  display_order: number;
}

export interface TicketAttachment {
  id: number;
  name: string;
  url: string;
  size: number | null;
}

export interface TicketListItem {
  id: number;
  subject: string;
  status: string;
  status_id: number | null;
  is_closed: boolean;
  unread_count: number;
  contact_email: string | null;
  asset_name: string | null;
  sync_status: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  content: string;
  sender_type: "AGENT" | "VISITOR";
  sender_name: string | null;
  sender_email: string | null;
  is_ai_agent: boolean;
  created_at: string;
  attachments: TicketAttachment[];
  is_internal: boolean;
  channel_id: string | null;
}

export interface TicketDetail extends TicketListItem {
  content: string | null;
  roaster_info: {
    model: string | null;
    serial_number: string | null;
    roasting_hours: number | null;
  } | null;
  attachments: TicketAttachment[];
  pipeline_stage: TicketPipelineStage | null;
  conversations: ConversationMessage[];
}

export interface TicketAsset {
  id: number;
  name: string;
  model: string | null;
  serial_number: string | null;
  roasting_hours: number | null;
  type: "asset" | "device";
}

/* ------------------------------------------------------------------ */
/*  Knowledge Base                                                      */
/* ------------------------------------------------------------------ */

export interface KBArticle {
  articleId: string;
  id: string;
  category: string | null;
  question: string;
  answer: string | null;
  roaster: string | null;
  roasterSeries: string | null;
  hs_body: string | null;
  hs_body_highlighted?: string | null;
}

export interface KBCategoryStats {
  category: string;
  count: number;
}

/* ------------------------------------------------------------------ */
/*  Service Appointments                                                */
/* ------------------------------------------------------------------ */

export type ServiceAppointmentPlannedStatus =
  | "requested"
  | "proposal"
  | "confirmed"
  | "executed"
  | "declined";

export interface ServiceAppointmentListItem {
  id: number;
  machine_serial_number: string | null;
  planned_status: ServiceAppointmentPlannedStatus;
  work_status: string | null;
  service_note: string | null;
  work_date: string | null;
  work_time: string | null;
  display_cost: string | null;
  display_cost_label: string | null;
  destination: string | null;
  work_type: {
    id: number;
    title: string;
  } | null;
  asset: {
    id: number;
    name: string;
    model: string | null;
  } | null;
  sync_status: string | null;
  created_at: string;
}

export interface ServiceAppointmentMaterial {
  id: number;
  name: string;
  quantity: number | null;
  price: string | null;
}

export interface ServiceAppointmentPhoto {
  id: number;
  url: string;
  name: string | null;
}

export interface ServiceAppointmentDetail extends ServiceAppointmentListItem {
  roasting_hours: number | null;
  running_hours: number | null;
  last_service_date: string | null;
  decline_reason: string | null;
  cost_change_info: string | null;
  destination_line1: string | null;
  destination_line2: string | null;
  destination_city: string | null;
  destination_state: string | null;
  destination_postal_code: string | null;
  destination_country: string | null;
  materials: ServiceAppointmentMaterial[];
  photos: ServiceAppointmentPhoto[];
}

export interface OutsmartWorkType {
  id: number;
  wrt_name: string;
  title: string;
  display_description: string | null;
  wrt_default_minutes: number | null;
}
