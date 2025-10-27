export default defineContentScript({
  // world: "ISOLATED", // Main 不支持V2, 不支持ff
  // matches: ["<all_urls"],
  // matches: ["*://*/*"],
  matches: ["*://*.baidu.com/*"],
  runAt: "document_end",
  async main() {
    console.log("Hello content.");

    // async function testStorage() {
    //   storage.setItem("local:ext-content-data", "1");
    //   storage.setMeta("local:ext-content-meta", { date: Date.now() });

    //   console.log("[content]", await storage.getItems(["local:ext"]));
    // }

    // testStorage();

    // console.log("[content]", document.querySelectorAll("div"));

    // 发送消息
    const bgResponse = await browser.runtime.sendMessage({
      type: "hello",
      name: "Shenjunjian",
    });

    // console.log("[content]:  bg answer", bgResponse);
  },
});
