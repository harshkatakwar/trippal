import { describe, it, expect } from 'vitest';
import { sanitizeInput } from './pureLogic';
import { MAX_INPUT_LENGTH } from './constants';

describe('pureLogic', () => {
  describe('sanitizeInput', () => {
    // TEST T1 — happy path: valid input
    it('returns valid input unchanged', () => {
      expect(sanitizeInput('Plan a trip to Goa')).toBe('Plan a trip to Goa');
    });

    // TEST T2 — empty input: blocked early
    it('returns empty string for empty input', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput('   ')).toBe('   '); // Whitespace is handled by .trim() later
    });

    // TEST T6 — malicious input (<script>): sanitized, safe output
    it('strips HTML tags to prevent injection', () => {
      expect(sanitizeInput('<script>alert("hack")</script>')).toBe('alert("hack")');
      expect(sanitizeInput('<b>bold</b> text')).toBe('bold text');
    });

    // TEST T3 — long input (2000+ chars): truncated gracefully
    it('truncates input exceeding MAX_INPUT_LENGTH', () => {
      const longInput = 'A'.repeat(MAX_INPUT_LENGTH + 500);
      const result = sanitizeInput(longInput);
      expect(result.length).toBe(MAX_INPUT_LENGTH);
      expect(result).toBe('A'.repeat(MAX_INPUT_LENGTH));
    });
  });
});
