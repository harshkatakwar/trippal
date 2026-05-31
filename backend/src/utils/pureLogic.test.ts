import { describe, it, expect } from 'vitest';
import { sanitizeInput, extractJsonFromMarkdown } from './pureLogic';
import { MAX_INPUT_LENGTH } from './constants';

describe('Backend pureLogic', () => {
  describe('sanitizeInput', () => {
    it('returns valid input unchanged', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World');
    });

    it('returns empty string for empty input', () => {
      expect(sanitizeInput('')).toBe('');
    });

    it('strips HTML tags', () => {
      expect(sanitizeInput('<div>Test</div>')).toBe('Test');
    });

    it('truncates input exceeding max length', () => {
      const longStr = 'B'.repeat(MAX_INPUT_LENGTH + 100);
      const result = sanitizeInput(longStr);
      expect(result.length).toBe(MAX_INPUT_LENGTH);
      expect(result).toBe('B'.repeat(MAX_INPUT_LENGTH));
    });
  });

  describe('extractJsonFromMarkdown', () => {
    it('extracts JSON from standard code blocks', () => {
      const markdown = '```json\n{"test": true}\n```';
      expect(extractJsonFromMarkdown(markdown)).toBe('{"test": true}');
    });

    it('handles code blocks without json language specifier', () => {
      const markdown = '```\n{"test": true}\n```';
      expect(extractJsonFromMarkdown(markdown)).toBe('{"test": true}');
    });

    it('handles raw JSON string', () => {
      const raw = '{"test": true}';
      expect(extractJsonFromMarkdown(raw)).toBe('{"test": true}');
    });
  });
});
