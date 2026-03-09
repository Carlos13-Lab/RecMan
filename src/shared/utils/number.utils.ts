/**
 * Safely parses a string or number to float, returning defaultValue if invalid
 */
export function safeParseFloat(
  value: string | number,
  defaultValue: number = 0
): number {
  if (typeof value === "number") {
    return isNaN(value) ? defaultValue : value;
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safely parses a string or number to integer, returning defaultValue if invalid
 */
export function safeParseInt(
  value: string | number,
  defaultValue: number = 0
): number {
  if (typeof value === "number") {
    return isNaN(value) || !Number.isInteger(value) ? defaultValue : value;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
