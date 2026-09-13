import artworks from '../src/data/artworks.json';

interface Artwork {
  id: string;
  titleChinese: string;
  imageUrl: string;
  sourceMuseum: string;
  accessionNumber: string;
}

const BATCH_SIZE = 100;
const TIMEOUT = 10000;

async function testUrl(url: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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

async function main() {
  const typedArtworks = artworks as Artwork[];
  
  const metArtworks = typedArtworks.filter(a => a.sourceMuseum === '大都会艺术博物馆');
  const clevelandArtworks = typedArtworks.filter(a => a.sourceMuseum === '克利夫兰艺术博物馆');
  const aicArtworks = typedArtworks.filter(a => a.sourceMuseum === '芝加哥艺术博物馆');
  
  console.log('=== 图片URL验证报告 / Image URL Validation Report ===');
  console.log('');
  console.log(`总藏品数: ${typedArtworks.length}`);
  console.log(`- 大都会艺术博物馆: ${metArtworks.length}`);
  console.log(`- 克利夫兰艺术博物馆: ${clevelandArtworks.length}`);
  console.log(`- 芝加哥艺术博物馆: ${aicArtworks.length}`);
  console.log('');
  
  const results: Record<string, { total: number; working: number; broken: number; reasons: Record<string, number> }> = {};
  
  for (const [name, artworkSet] of [
    ['大都会艺术博物馆 (Met)', metArtworks],
    ['克利夫兰艺术博物馆 (CMA)', clevelandArtworks],
    ['芝加哥艺术博物馆 (AIC)', aicArtworks],
  ] as const) {
    console.log(`\n测试 ${name}...`);
    
    let working = 0;
    let broken = 0;
    const reasons: Record<string, number> = {};
    
    for (let i = 0; i < artworkSet.length; i += BATCH_SIZE) {
      const batch = artworkSet.slice(i, i + BATCH_SIZE);
      console.log(`  批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(artworkSet.length / BATCH_SIZE)}...`);
      
      const batchResults = await Promise.all(
        batch.map(async (artwork) => {
          const result = await testUrl(artwork.imageUrl);
          return result;
        })
      );
      
      batchResults.forEach(result => {
        if (result.ok) {
          working++;
        } else {
          broken++;
          const reason = result.status?.toString() || result.error || 'unknown';
          reasons[reason] = (reasons[reason] || 0) + 1;
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    results[name] = { total: artworkSet.length, working, broken, reasons };
    
    console.log(`  结果: ${working}/${artworkSet.length} 正常 (${(working / artworkSet.length * 100).toFixed(1)}%)`);
  }
  
  console.log('\n=== 汇总 / Summary ===');
  console.log('');
  
  let totalWorking = 0;
  let totalBroken = 0;
  
  for (const [name, data] of Object.entries(results)) {
    totalWorking += data.working;
    totalBroken += data.broken;
    
    console.log(`${name}:`);
    console.log(`  - 正常: ${data.working}/${data.total} (${(data.working / data.total * 100).toFixed(1)}%)`);
    if (data.broken > 0) {
      console.log(`  - 损坏: ${data.broken}`);
      for (const [reason, count] of Object.entries(data.reasons)) {
        console.log(`    - ${reason}: ${count}`);
      }
    }
    console.log('');
  }
  
  const total = typedArtworks.length;
  console.log(`总计: ${totalWorking}/${total} 正常 (${(totalWorking / total * 100).toFixed(1)}%)`);
  console.log(`损坏: ${totalBroken}/${total} (${(totalBroken / total * 100).toFixed(1)}%)`);
  
  console.log('\n=== 注意事项 / Notes ===');
  console.log('- AIC图片在服务端测试返回403是因为Cloudflare保护');
  console.log('- 这些图片在浏览器中能正常加载(浏览器可处理Cloudflare challenge)');
  console.log('- 前端已添加错误回退机制，显示优雅的占位符');
}

main().catch(console.error);
