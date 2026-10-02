import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTeaware, normalizedSourceUrl } from './teaware-policy.mjs';

const classify = (titleEnglish, materialEnglish, objectTypeEnglish = 'Tea Bowl/Cup') =>
  classifyTeaware({ titleEnglish, materialEnglish, objectTypeEnglish }).decision;

test('depictions and publications cannot qualify by their tea-related titles', () => {
  assert.equal(classify('Still Life with Yixing Teapot', 'Oil painting'), 'reject');
  assert.equal(classify('Tea Service', 'Albumen silver print'), 'reject');
  assert.equal(classify('Tea Bowl', 'Woodburytype on paper'), 'reject');
  assert.equal(classify('Tea bowl', 'paper', 'page'), 'reject');
  assert.equal(classify('茶入窯分記《瀬戸窯茶入分記》', 'Seto Ware', 'Tea Caddy'), 'reject');
});
test('garments, tomb artifacts and ordinary vessels cannot qualify by generated labels', () => {
  assert.equal(classify('Semi-formal Court Robe', 'silk with embroidery'), 'reject');
  assert.equal(classify('茶筅文様緞子', 'Ceramics', 'Tea Utensil'), 'reject');
  assert.equal(classify('Epitaph tablet', 'Porcelain'), 'reject');
  assert.equal(classify('Bowl', 'Stoneware'), 'review');
  assert.equal(classify('Water dropper', 'Porcelain with tea-dust glaze'), 'reject');
  assert.equal(classify('Vase', 'Porcelain', 'Vase'), 'reject');
  assert.equal(classify('Wine Cup', 'Silver'), 'reject');
});
test('decoration terminology does not remove actual tea ware', () => {
  assert.equal(classify('Tea Bowl with Abstract Scroll Design', 'Stoneware'), 'admit');
  assert.equal(classify('Teapot with French Coat of Arms', 'Porcelain'), 'admit');
  assert.equal(classify('Tea bowl, named Chinese Robe', 'Glazed stoneware'), 'admit');
  assert.equal(classify('Teapot', 'Earthenware, transfer-printed'), 'admit');
  assert.equal(classify('Tea Bowl', 'Stoneware with papercut decoration'), 'admit');
  assert.equal(classify('Tea chest', 'wood, velvet (fabric weave), silver'), 'admit');
});
test('tea-use names are recognized across source languages and accessory types', () => {
  assert.equal(classify('黒楽茶碗', 'Ceramics'), 'admit');
  assert.equal(classify('Tea ceremony water jar', 'Stoneware'), 'admit');
  assert.equal(classify('Stoftheebus', 'Stoneware'), 'admit');
  assert.equal(classify('Theepot', 'Porcelain'), 'admit');
  assert.equal(classify('Winepot or teapot', 'Porcelain'), 'admit');
  assert.equal(classify('Tea urn', 'Silver'), 'admit');
  assert.equal(classify('Tea strainer', 'Silver'), 'admit');
  assert.equal(classify('Tea Caddy Spoon', 'Silver'), 'admit');
  assert.equal(classify('Teaspoon', 'Silver'), 'admit');
  assert.equal(classify('Spoon', 'Silver', 'Spoon'), 'review');
});
test('a tea-related caption cannot admit a silk cushion or a known printed depiction', () => {
  assert.equal(classify('Tea service for two people', 'silk'), 'reject');
  assert.equal(classifyTeaware({id:'mia-54323',titleEnglish:'Porcelain Tea Container, from Japonisme'}).decision,'reject');
  assert.equal(classifyTeaware({id:'rks-200113720',titleEnglish:'Tea tray, cake stands, jam dish, sugar bowls, coffee pot and milk jug'}).decision,'reject');
});
test('Commons file names use the same identity with URL encoding and underscores', () => {
  assert.equal(normalizedSourceUrl('https://commons.wikimedia.org/wiki/File%3ATea%20Bowl.jpg'), normalizedSourceUrl('https://commons.wikimedia.org/wiki/File:Tea_Bowl.jpg'));
});
