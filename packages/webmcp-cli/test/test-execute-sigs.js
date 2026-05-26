const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => !p.url().startsWith('devtools://')) || pages[0];
  
  const results = await page.evaluate(async () => {
    const mcp = navigator.modelContextTesting || navigator.modelContext;
    const res = [];
    
    try {
      await mcp.executeTool('page-agent-tool', { action: 'browserState' });
      res.push('signature 1 works');
    } catch(e) { res.push('sig 1 fails: ' + e.message); }

    try {
      await mcp.executeTool({ name: 'page-agent-tool', arguments: { action: 'browserState' } });
      res.push('signature 2 works');
    } catch(e) { res.push('sig 2 fails: ' + e.message); }

    try {
      await mcp.executeTool('page-agent-tool', JSON.stringify({ action: 'browserState' }));
      res.push('signature 3 works');
    } catch(e) { res.push('sig 3 fails: ' + e.message); }

    return res;
  });
  
  console.log(results);
  process.exit(0);
})();
