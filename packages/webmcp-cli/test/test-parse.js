const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => !p.url().startsWith('devtools://')) || pages[0];
  
  const results = await page.evaluate(async () => {
    const mcp = document.modelContext;
    const argsString = JSON.stringify({ action: 'browserState' });
    let stateRes = await mcp.executeTool('page-agent-tool', argsString);
    
    let dbg = 'Type of stateRes: ' + typeof stateRes + '\\n';
    if (typeof stateRes === 'string') {
      try {
        stateRes = JSON.parse(stateRes);
      } catch(e) {}
    }
    
    dbg += 'stateRes keys: ' + (stateRes ? Object.keys(stateRes).join(',') : 'null') + '\\n';
    
    if (stateRes && stateRes.content && stateRes.content.length > 0) {
      const textContent = stateRes.content.map(c => c.text).join('\\n');
      dbg += 'textContent length: ' + textContent.length + '\\n';
      
      const prefix = '浏览器状态: ';
      if (textContent.startsWith(prefix)) {
        try {
          const jsonStr = textContent.substring(prefix.length);
          const parsedState = JSON.parse(jsonStr);
          return parsedState;
        } catch (e) {
          dbg += 'JSON parse error: ' + e.message + '\\n';
        }
      } else {
        dbg += 'Does not start with prefix. Starts with: ' + textContent.substring(0, 20) + '\\n';
      }
    } else {
      dbg += 'No content found in stateRes. stateRes = ' + JSON.stringify(stateRes) + '\\n';
    }
    
    return { error_debug: dbg };
  });
  
  console.log(JSON.stringify(results, null, 2));
  if (results && results.error_debug) {
    console.error('Parsing failed.');
    process.exit(1);
  }
  process.exit(0);
})();
