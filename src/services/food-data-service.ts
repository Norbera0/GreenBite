
// src/services/food-data-service.ts
import { parse } from 'csv-parse/sync';

interface FoodCarbonData {
  food_item_name: string;
  co2e_per_kg: number;
  source_notes?: string;
}

let foodDataCache: FoodCarbonData[] | null = null;
let foodDataMapCache: Map<string, number> | null = null;

async function fetchAndParseCSV(): Promise<FoodCarbonData[]> {
  if (foodDataCache) {
    return foodDataCache;
  }
  try {
    const response = await fetch('/food_data.csv');
    if (!response.ok) {
      throw new Error(`Failed to fetch food_data.csv: ${response.statusText}`);
    }
    const csvText = await response.text();
    const records: FoodCarbonData[] = parse(csvText, {
      columns: ['food_item_name', 'co2e_per_kg', 'source_notes'], // Explicitly define columns
      from_line: 2, // Skip the header row in the CSV file
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow varying column counts; extra columns are discarded
      cast: (value, context) => {
        // When columns are explicitly defined as an array, context.column is the column name.
        if (context.column === 'co2e_per_kg') {
          const num = parseFloat(value);
          return isNaN(num) ? null : num; // Return null if parsing fails
        }
        return value;
      },
    });
    
    // Filter out records where co2e_per_kg is null (due to parsing error or empty value)
    // or if food_item_name is somehow missing after relaxed parsing.
    foodDataCache = records.filter(record => record.food_item_name !== undefined && record.co2e_per_kg !== null);
    return foodDataCache;
  } catch (error) {
    console.error("Error parsing or fetching food_data.csv:", error);
    return []; // Return empty array on error
  }
}

async function getFoodDataMap(): Promise<Map<string, number>> {
  if (foodDataMapCache) {
    return foodDataMapCache;
  }
  const data = await fetchAndParseCSV();
  const map = new Map<string, number>();
  data.forEach(item => {
    if (item.food_item_name && typeof item.co2e_per_kg === 'number') {
      map.set(item.food_item_name.trim().toLowerCase(), item.co2e_per_kg);
    }
  });
  foodDataMapCache = map;
  return foodDataMapCache;
}

/**
 * Looks up the carbon factor (CO2e per kg) for a given food item name.
 * The comparison is case-insensitive.
 * @param foodName The name of the food item.
 * @returns A promise that resolves to the CO2e per kg (number) or null if not found or data is unavailable.
 */
export async function getCarbonFactor(foodName: string): Promise<number | null> {
  try {
    const map = await getFoodDataMap();
    const factor = map.get(foodName.trim().toLowerCase());
    return factor === undefined ? null : factor;
  } catch (error) {
    console.error(`Error getting carbon factor for ${foodName}:`, error);
    return null;
  }
}

// Pre-warm the cache on service load (optional, but can be good for performance)
// getFoodDataMap().catch(err => console.error("Failed to pre-warm food data cache:", err));

