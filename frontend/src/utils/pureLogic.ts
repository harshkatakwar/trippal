import { MAX_INPUT_LENGTH } from './constants';

/**
 * Pure function to sanitize user input before API calls or rendering
 * Strips all HTML tags and enforces a maximum character length.
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "").slice(0, MAX_INPUT_LENGTH);
};
