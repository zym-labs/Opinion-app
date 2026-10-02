import assert from 'node:assert/strict';
import { test } from 'node:test';

import { contrastRatio } from './contrast.ts';
import { palette } from './tokens.ts';

// Body text pairs must meet WCAG AA 4.5:1 (STAGE6 §2).
const bodyPairs = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['textMuted', 'bg'],
  ['textMuted', 'surface'],
  ['onPrimary', 'primary'],
  ['optionA', 'surface'],
  ['optionBText', 'surface'],
  ['optionC', 'surface'],
  ['optionD', 'surface'],
  ['danger', 'surface'],
] as const;

// Fills, icons and large text need 3:1.
const largePairs = [
  ['optionB', 'surface'],
  ['ai', 'surface'],
  ['success', 'surface'],
  ['warning', 'surface'],
] as const;

for (const scheme of ['light', 'dark'] as const) {
  const p = palette[scheme];
  for (const [fg, bg] of bodyPairs) {
    test(`${scheme}: ${fg} on ${bg} >= 4.5`, () => {
      const ratio = contrastRatio(p[fg], p[bg]);
      assert.ok(ratio >= 4.5, `${ratio.toFixed(2)}`);
    });
  }
  for (const [fg, bg] of largePairs) {
    test(`${scheme}: ${fg} on ${bg} >= 3`, () => {
      const ratio = contrastRatio(p[fg], p[bg]);
      assert.ok(ratio >= 3, `${ratio.toFixed(2)}`);
    });
  }
}
