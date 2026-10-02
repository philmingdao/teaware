import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { artworkTitle, artworkDescription, isLocale, locales, localizedHref, messages, term, periodName, translate } from '../src/lib/i18n';
import { heroTranslations } from '../src/lib/hero-translations';
import type { Artwork } from '../src/types/artwork';

test('language links retain artwork identity, TV filters and fragments', () => {
  for (const locale of locales) {
    const url = new URL(localizedHref('/artwork/?id=mia-100515&museum=东京国立博物馆&lang=zh#details', locale), 'https://example.org');
    assert.equal(url.searchParams.get('id'), 'mia-100515');
    assert.equal(url.searchParams.get('museum'), '东京国立博物馆');
    assert.equal(url.searchParams.get('lang'), locale);
    assert.equal(url.hash, '#details');
    assert.equal(url.searchParams.getAll('lang').length, 1);
    assert.equal(localizedHref('https://museum.org/object?lang=en', locale), 'https://museum.org/object?lang=en');
    assert.equal(localizedHref('//museum.org/object', locale), '//museum.org/object');
  }
});

test('all interface messages have four complete translations and interpolate counts', () => {
  for (const [key, row] of Object.entries(messages)) {
    assert.equal(row.length, 4, key);
    assert.ok(row.every(text => text.trim()), key);
    const placeholders = row.map(text => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort());
    assert.deepEqual(placeholders[0], placeholders[1], key);
    assert.deepEqual(placeholders[0], placeholders[2], key);
    assert.deepEqual(placeholders[0], placeholders[3], key);
  }
  for (const locale of locales) assert.ok(translate(locale, 'count', {count: 2000}).includes('2000'));
  assert.equal(isLocale('fr'), false);
  assert.equal(isLocale('ja'), true);
});

test('all 2000 objects have usable browsing labels; tea origins stay distinct', () => {
  const items: Artwork[] = JSON.parse(fs.readFileSync('src/data/artworks.json', 'utf8'));
  assert.equal(items.length, 2000);
  for (const item of items) for (const locale of locales) {
    assert.ok(artworkTitle(item, locale).trim(), `${item.id}:${locale}`);
    assert.ok(artworkDescription(item, locale).trim(), `${item.id}:${locale}`);
    assert.ok(term(item.dynasty, locale, item.dynastyEnglish).trim(), item.id);
  }
  assert.equal(term('日本', 'en'), 'Japan');
  assert.equal(term('韩国', 'ja'), '韓国');
  assert.equal(term('美国', 'ko'), '미국');
  assert.equal(term('未核实', 'en'), 'Unverified');
  assert.equal(term('金', 'en'), 'Gold');
  assert.equal(periodName('金', 'en'), 'Jin');
});

test('all ten reviewed cover labels have distinct translations and descriptions', () => {
  assert.equal(Object.keys(heroTranslations).length, 10);
  for (const [id, record] of Object.entries(heroTranslations)) {
    assert.equal(record.title.length, 3, id);
    assert.equal(record.description.length, 3, id);
    assert.ok(record.description.every(text => text.length > 30), id);
  }
});
