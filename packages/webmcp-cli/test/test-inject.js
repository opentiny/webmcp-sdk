const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => !p.url().startsWith('devtools://')) || pages[0];
  
  const UMD_MASK = `
    var __temp_define = window.define;
    var __temp_module = window.module;
    var __temp_exports = window.exports;
    window.define = undefined;
    window.module = undefined;
    window.exports = undefined;
  `;
  const UMD_RESTORE = `
    window.define = __temp_define;
    window.module = __temp_module;
    window.exports = __temp_exports;
  `;

  const scriptContent = fs.readFileSync('../../next-sdk/dist/webmcp-full.js', 'utf-8');
  await page.evaluate(UMD_MASK + scriptContent + UMD_RESTORE);
  
  const keys = await page.evaluate(() => Object.keys(window));
  console.log('Is WebMCP on window?', keys.includes('WebMCP'));

  await page.evaluate(() => {
    const { initializeBuiltinWebMCP, registerPageAgentTool } = window.WebMCP;
    initializeBuiltinWebMCP();
    registerPageAgentTool();
  });
  
  const tools = await page.evaluate(async () => {
    const mcp = navigator.modelContextTesting || navigator.modelContext;
    if (!mcp) return 'no mcp';
    const res = await mcp.listTools();
    return res;
  });
  
  console.log('Tools:', JSON.stringify(tools, null, 2));
  
  if (tools === 'no mcp' || !tools.tools || tools.tools.length === 0) {
    console.error('Tool injection/registration failed.');
    process.exit(1);
  }

  process.exit(0);
})();
