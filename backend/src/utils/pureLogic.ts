import { MAX_INPUT_LENGTH } from './constants.js';

/**
 * Pure function to sanitize input strings
 * Strips HTML tags and enforces a maximum length
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>?/gm, '').substring(0, MAX_INPUT_LENGTH);
}

/**
 * Pure function to extract JSON from markdown code blocks
 */
export function extractJsonFromMarkdown(text: string): string {
  if (!text) return "";
  return text.replace(/^```(?:json)?\s*/m, '').replace(/```\s*$/m, '').trim();
}
