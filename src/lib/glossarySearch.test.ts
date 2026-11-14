import test from 'node:test';
import assert from 'node:assert/strict';
import { filterGlossaryEntries, parseGlossaryEntries } from './glossarySearch';

const SAMPLE_GLOSSARY = `# ARCHTECHNIX TECHNICAL GLOSSARY

* Asynchronous Advisory: Consulting via Markdown specs and Git PR reviews.
* Cryptographic Key Shredding: Intentional deletion of DEK for GDPR erasure.
* RPO (Recovery Point Objective): Maximum acceptable age of recovered data (< 15m).
* Schedule A Specification: Client infrastructure intake document.`;

test('parseGlossaryEntries extracts term and definition pairs from markdown list', () => {
  const entries = parseGlossaryEntries(SAMPLE_GLOSSARY);
  assert.equal(entries.length, 4);
  assert.equal(entries[0].term, 'Asynchronous Advisory');
  assert.equal(entries[2].term, 'RPO (Recovery Point Objective)');
});

test('filterGlossaryEntries filters case-insensitively across term and definition', () => {
  const entries = parseGlossaryEntries(SAMPLE_GLOSSARY);
  assert.equal(filterGlossaryEntries(entries, '').length, 4);
  assert.equal(filterGlossaryEntries(entries, 'rpo').length, 1);
  assert.equal(filterGlossaryEntries(entries, 'GDPR').length, 1);
  assert.equal(filterGlossaryEntries(entries, 'key shredding').length, 1);
  assert.equal(filterGlossaryEntries(entries, 'unknown-term').length, 0);
});
