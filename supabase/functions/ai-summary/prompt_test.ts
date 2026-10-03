import { assert } from 'jsr:@std/assert@1';

import { buildUserMessage } from './prompt.ts';

const base = {
  question: '¿Cuál portátil?',
  options: [
    { side: 'a', label: 'A', votes: 6 },
    { side: 'b', label: 'B', votes: 4 },
  ],
  majoritySide: 'a',
  reasons: [{ id: 'r1', side: 'a', text: 'Más batería', consent: true }],
  minorityEnough: false,
};

Deno.test('asks for the summary in the asker’s language', () => {
  assert(buildUserMessage({ ...base, language: 'es' }).includes('language with code "es"'));
});

Deno.test('English needs no language line, and codes are sanitised', () => {
  assert(!buildUserMessage({ ...base, language: 'en' }).includes('language with code'));
  assert(buildUserMessage({ ...base, language: 'pt-BR"; drop' }).includes('code "pt-BRdrop"'));
});
