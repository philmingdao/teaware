import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(root, 'out', 'artwork');
const basePath = '/teaware';
const artworks = JSON.parse(await readFile(path.join(root, 'src/data/artworks.json'), 'utf8'));
const manifest = JSON.parse(await readFile(path.join(root, 'src/data/collection-cutouts.json'), 'utf8'));

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function absoluteImageUrl(src) {
  if (/^https?:\/\//i.test(src)) return src;
  return `https://philmingdao.github.io${basePath}${src.startsWith('/') ? src : `/${src}`}`;
}

function renderArtwork(artwork) {
  const title = artwork.titleChinese || artwork.titleEnglish || 'Untitled teaware';
  const description = (artwork.description || `${artwork.dynastyEnglish || artwork.dynasty} ${artwork.date}. ${artwork.sourceMuseumEnglish || artwork.sourceMuseum}.`).slice(0, 180);
  const imagePath = manifest.assets?.[artwork.id]?.url || artwork.imageUrl;
  const image = absoluteImageUrl(imagePath);
  const url = `https://philmingdao.github.io${basePath}/artwork/${encodeURIComponent(artwork.id)}/`;
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: title,
    alternateName: artwork.titleEnglish || undefined,
    description,
    image: { '@type': 'ImageObject', contentUrl: image, caption: title },
    url,
    dateCreated: artwork.date,
    artMedium: artwork.materialEnglish || artwork.material,
    provider: { '@type': 'Organization', name: artwork.sourceMuseumEnglish || artwork.sourceMuseum },
    license: artwork.license,
    identifier: artwork.accessionNumber,
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} | 器 · 茶</title>
<meta name="description" content="${escapeHtml(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
<script type="application/ld+json">${jsonLd}</script>
<style>body{margin:0;color:#1a1a1a;background:#faf9f7;font:16px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:0 auto;padding:24px}nav{margin-bottom:24px;font-size:14px}a{color:inherit}article{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(280px,1fr);gap:40px}figure{margin:0}img{display:block;width:100%;max-height:75vh;object-fit:contain}h1{font-size:clamp(28px,4vw,42px);line-height:1.2}dt{margin-top:16px;color:#777;font-size:12px;text-transform:uppercase}dd{margin:0}figcaption{margin-top:12px;color:#777;font-size:13px}@media(max-width:700px){article{grid-template-columns:1fr;gap:20px}}</style>
</head>
<body><main>
<nav aria-label="Breadcrumb"><a href="${basePath}/">器 · 茶</a> / <a href="${basePath}/gallery/">藏品</a> / ${escapeHtml(title)}</nav>
<article>
<figure><img src="${escapeHtml(imagePath.startsWith('/') ? `${basePath}${imagePath}` : imagePath)}" alt="${escapeHtml(title)}" fetchpriority="high"><figcaption>${escapeHtml(artwork.sourceMuseumEnglish || artwork.sourceMuseum)} · ${escapeHtml(artwork.license)}</figcaption></figure>
<section><p>${escapeHtml(artwork.dynastyEnglish || artwork.dynasty)} · ${escapeHtml(artwork.date)}</p><h1>${escapeHtml(title)}</h1>${artwork.titleEnglish ? `<p>${escapeHtml(artwork.titleEnglish)}</p>` : ''}<p>${escapeHtml(description)}</p><dl><dt>Material</dt><dd>${escapeHtml(artwork.material)} · ${escapeHtml(artwork.materialEnglish)}</dd><dt>Museum</dt><dd>${escapeHtml(artwork.sourceMuseum)} · ${escapeHtml(artwork.sourceMuseumEnglish)}</dd><dt>Accession number</dt><dd>${escapeHtml(artwork.accessionNumber)}</dd></dl><p><a href="${escapeHtml(artwork.sourceUrl)}" rel="noopener noreferrer">在博物馆官网查看 · View at museum</a></p></section>
</article>
</main></body></html>
`;
}

await mkdir(outputRoot, { recursive: true });
for (const artwork of artworks) {
  const directory = path.join(outputRoot, encodeURIComponent(artwork.id));
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'index.html'), renderArtwork(artwork));
}

console.log(`Generated ${artworks.length} lightweight artwork pages in out/artwork.`);
