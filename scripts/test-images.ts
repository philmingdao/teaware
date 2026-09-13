import artworks from '../src/data/artworks.json';

interface Artwork {
  id: string;
  titleChinese: string;
  imageUrl: string;
  sourceMuseum: string;
  accessionNumber: string;
}

const BATCH_SIZE = 50;
const TIMEOUT = 8000;

async function testUrl(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeout);
    return { ok: response.ok, status: response.status };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const error = err as Error;
    return { ok: false, error: error.message || 'Unknown error' };
  }
}

async function testBatch(items: Artwork[]): Promise<{ working: number; broken: Artwork[] }> {
  const results = await Promise.all(
    items.map(async (artwork) => {
      const result = await testUrl(artwork.imageUrl);
      return { artwork, result };
    })
  );
  
  let working = 0;
  const broken: Artwork[] = [];
  
  results.forEach(({ artwork, result }) => {
    if (result.ok) {
      working++;
    } else {
      broken.push(artwork);
      console.log(`[BROKEN] ${artwork.id}: ${result.status || result.error}`);
    }
  });
  
  return { working, broken };
}

async function main() {
  const typedArtworks = artworks as Artwork[];
  const total = typedArtworks.length;
  
  console.log(`Testing ${total} artworks...`);
  console.log('');
  
  let totalWorking = 0;
  const allBroken: Artwork[] = [];
  
  // Test sample from each museum
  const metArtworks = typedArtworks.filter(a => a.sourceMuseum === '大都会艺术博物馆');
  const clevelandArtworks = typedArtworks.filter(a => a.sourceMuseum === '克利夫兰艺术博物馆');
  const aicArtworks = typedArtworks.filter(a => a.sourceMuseum === '芝加哥艺术博物馆');
  
  console.log(`Met: ${metArtworks.length}, Cleveland: ${clevelandArtworks.length}, AIC: ${aicArtworks.length}`);
  console.log('');
  
  // Test first 100 from each museum
  const samplesToTest = [
    ...metArtworks.slice(0, 100),
    ...clevelandArtworks.slice(0, 100),
    ...aicArtworks.slice(0, 100)
  ];
  
  console.log(`Testing sample of ${samplesToTest.length} artworks...`);
  console.log('');
  
  for (let i = 0; i < samplesToTest.length; i += BATCH_SIZE) {
    const batch = samplesToTest.slice(i, i + BATCH_SIZE);
    console.log(`Testing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(samplesToTest.length / BATCH_SIZE)}...`);
    
    const { working, broken } = await testBatch(batch);
    totalWorking += working;
    allBroken.push(...broken);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('');
  console.log('=== SUMMARY ===');
  console.log(`Total tested: ${samplesToTest.length}`);
  console.log(`Working: ${totalWorking} (${(totalWorking / samplesToTest.length * 100).toFixed(1)}%)`);
  console.log(`Broken: ${allBroken.length} (${(allBroken.length / samplesToTest.length * 100).toFixed(1)}%)`);
  
  // Group broken by museum
  const brokenByMuseum: Record<string, number> = {};
  allBroken.forEach(a => {
    brokenByMuseum[a.sourceMuseum] = (brokenByMuseum[a.sourceMuseum] || 0) + 1;
  });
  
  console.log('');
  console.log('Broken by museum:');
  Object.entries(brokenByMuseum).forEach(([museum, count]) => {
    console.log(`  ${museum}: ${count}`);
  });
  
  // Print first 20 broken URLs for analysis
  console.log('');
  console.log('First 20 broken URLs:');
  allBroken.slice(0, 20).forEach(a => {
    console.log(`  ${a.id}: ${a.imageUrl}`);
  });
}

main().catch(console.error);
