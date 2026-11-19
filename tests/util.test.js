import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  slugify, isValidSlug, isLive, displayStatus, introText, bodyWithoutMarker, buildArchive, monthRange, escapeHtml, stripTags,
} from '../src/util.js';

test('slugify handles Swedish letters and punctuation', () => {
  assert.equal(slugify('Kaffe på morgonen – för alla!'), 'kaffe-pa-morgonen-for-alla');
  assert.equal(slugify('  Why I built my own tiny CMS  '), 'why-i-built-my-own-tiny-cms');
  assert.equal(slugify('!!!'), 'untitled');
});

test('reserved and malformed slugs are rejected', () => {
  assert.equal(isValidSlug('admin'), false);
  assert.equal(isValidSlug('Hello'), false);
  assert.equal(isValidSlug('a--b'), false);
  assert.equal(isValidSlug('notes-on-slow-mornings'), true);
});

test('scheduled posts are not live until their time', () => {
  const now = Date.UTC(2026, 10, 19);
  const post = { status: 'published', publish_at: now + 60_000 };
  assert.equal(isLive(post, now), false);
  assert.equal(displayStatus(post, now), 'scheduled');
  assert.equal(isLive(post, now + 60_000), true);
  assert.equal(displayStatus({ status: 'draft', publish_at: 0 }, now), 'draft');
});

test('intro is the text above the read-more break (F-022)', () => {
  const html = '<p>First <strong>part</strong>.</p><p>Second.</p><hr data-read-more=""><p>Hidden</p>';
  assert.equal(introText(html), 'First part. Second.');
  assert.equal(bodyWithoutMarker(html), '<p>First <strong>part</strong>.</p><p>Second.</p><p>Hidden</p>');
  assert.equal(introText('<p>Only one</p><p>Two</p>'), 'Only one');
});

test('archive groups by year and month, hides empty months, opens newest year (F-006)', () => {
  const ts = (y, m, d) => Date.UTC(y, m - 1, d, 12);
  const archive = buildArchive([ts(2026, 11, 2), ts(2026, 11, 9), ts(2026, 3, 1), ts(2024, 4, 4)]);
  assert.deepEqual(archive.map((y) => [y.year, y.total, y.open]), [[2026, 3, true], [2024, 1, false]]);
  assert.deepEqual(archive[0].months.map((m) => `${m.name} (${m.count})`), ['November (2)', 'March (1)']);
});

test('archive uses Stockholm time at month boundaries', () => {
  // 23:30 UTC on 31 Oct is 00:30 on 1 Nov in Stockholm (CET, UTC+1).
  const archive = buildArchive([Date.UTC(2026, 9, 31, 23, 30)]);
  assert.equal(archive[0].months[0].name, 'November');
});

test('monthRange returns local month boundaries', () => {
  const { start, end } = monthRange(2026, 11);
  assert.equal(new Date(start).toISOString(), '2026-10-31T23:00:00.000Z');
  assert.equal(new Date(end).toISOString(), '2026-11-30T23:00:00.000Z');
  const summer = monthRange(2026, 7);
  assert.equal(new Date(summer.start).toISOString(), '2026-06-30T22:00:00.000Z');
});

test('escapeHtml and stripTags', () => {
  assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(stripTags('<p>a&amp;b</p><p>c</p>'), 'a&b c');
});
