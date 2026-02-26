/**
 * API service for DiFluid measurement sync.
 */

import apiClient from "./client";
import type {
  DiFluidMeasurementFromApi,
  PaginatedResponse,
  ApiResponse,
} from "@/types/index";

interface StoreMeasurementPayload {
  measurable_type?: "inventory" | "roast";
  measurable_id?: string | number;
  coffee_type: string;
  moisture?: number;
  water_activity?: number;
  density?: number;
  bulk_density?: number;
  agtron_number?: number;
  sca_color_value?: number;
  variance?: number;
  roast_standard?: number;
  bar_chart_31?: number[];
  pie_chart_8?: number[];
  screen_size_grade?: number;
  screen_size_diameter?: number;
  weight?: number;
  mirror_temperature?: number;
  bean_temperature?: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  altitude?: number;
  device_identifier?: string;
  raw_data?: Record<string, unknown>;
  measured_at: string;
}

/** Fetch all recent measurements for the team (no filters) */
export async function getAllMeasurements(): Promise<DiFluidMeasurementFromApi[]> {
  const response = await apiClient.get<
    PaginatedResponse<DiFluidMeasurementFromApi>
  >("/difluid/measurements");
  return response.data.data;
}

/** Fetch measurements for an inventory item */
export async function getMeasurementsForInventory(
  inventoryId: number
): Promise<DiFluidMeasurementFromApi[]> {
  const response = await apiClient.get<
    PaginatedResponse<DiFluidMeasurementFromApi>
  >("/difluid/measurements", {
    params: { inventory_id: inventoryId },
  });
  return response.data.data;
}

/** Fetch measurements for a roast */
export async function getMeasurementsForRoast(
  roastId: string | number
): Promise<DiFluidMeasurementFromApi[]> {
  const response = await apiClient.get<
    PaginatedResponse<DiFluidMeasurementFromApi>
  >("/difluid/measurements", {
    params: { roast_id: roastId },
  });
  return response.data.data;
}

/** Save a single measurement */
export async function storeMeasurement(
  payload: StoreMeasurementPayload
): Promise<DiFluidMeasurementFromApi> {
  const response = await apiClient.post<
    ApiResponse<DiFluidMeasurementFromApi>
  >("/difluid/measurements", payload);
  return response.data.data;
}

/** Batch sync offline measurements */
export async function batchStoreMeasurements(
  measurements: StoreMeasurementPayload[]
): Promise<DiFluidMeasurementFromApi[]> {
  const response = await apiClient.post<
    ApiResponse<DiFluidMeasurementFromApi[]>
  >("/difluid/measurements/batch", { measurements });
  return response.data.data;
}

/** Link an unlinked measurement to a roast or inventory item */
export async function linkMeasurement(
  id: number,
  measurableType: "inventory" | "roast",
  measurableId: string | number
): Promise<DiFluidMeasurementFromApi> {
  const response = await apiClient.patch<
    ApiResponse<DiFluidMeasurementFromApi>
  >(`/difluid/measurements/${id}`, {
    measurable_type: measurableType,
    measurable_id: measurableId,
  });
  return response.data.data;
}
