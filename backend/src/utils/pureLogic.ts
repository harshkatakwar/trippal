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
 * Pure function to extract JSON from markdown code blocks.
 * Matches the first fenced code block if present; otherwise returns the raw text.
 */
export function extractJsonFromMarkdown(text: string): string {
  if (!text) return "";
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  return match ? match[1].trim() : text.trim();
}
