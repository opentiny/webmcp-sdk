const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => !p.url().startsWith('devtools://')) || pages[0];
  
  const stateRes = await page.evaluate(async () => {
    const mcp = document.modelContext;
    try {
      return await mcp.executeTool('page-agent-tool', { action: 'browserState' });
    } catch (e1) {
      try {
        return await mcp.executeTool({ name: 'page-agent-tool', arguments: { action: 'browserState' } });
      } catch (e2) {
        try {
          return await mcp.executeTool('page-agent-tool', "{\"action\": \"browserState\"}");
        } catch (e3) {
          return { error: e3.message };
        }
      }
    }
  });
  
  console.log('Result:', JSON.stringify(stateRes, null, 2));
  process.exit(0);
})();
