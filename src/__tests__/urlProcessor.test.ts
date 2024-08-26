import { expect, test } from 'vitest';
import { normalizeUrl } from '../scripts/urlProcessor';

test('normalizeUrl function', () => {
  expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
  expect(normalizeUrl('https://Example.com/Path')).toBe('https://example.com/path');
  expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  expect(normalizeUrl('https://www.example.com')).toBe('https://www.example.com');
  expect(normalizeUrl('https://example.com/path/to/page')).toBe('https://example.com/path/to/page');
  expect(normalizeUrl('https://example.com/?query=param')).toBe('https://example.com');
  expect(normalizeUrl('https://example.com/#fragment')).toBe('https://example.com');
});
