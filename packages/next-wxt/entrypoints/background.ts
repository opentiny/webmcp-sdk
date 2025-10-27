export default defineBackground(async () => {
  console.log("Hello background!", { id: browser.runtime.id });

  // testStorage();

  // 回复消息
  browser.runtime.onMessage.addListener(async (message, _, sendResponse) => {
    if (message.type == "hello") {
      sendResponse("hello ," + message.name + "先生");
      const allTabs = await browser.tabs.query({ active: true });
      console.log("[bg]", allTabs);

      // 动态注入脚本
      await browser.scripting.executeScript({
        target: { tabId: allTabs[0].id! },
        files: ["./content1.js"],
      });

      browser.userScripts;

      return true;
    }
  });

  // 广播消息
  // const allTabs = await browser.tabs.query({});
  // const responses = await Promise.all(
  //   allTabs.map(async (t) => {
  //     const resp = await browser.tabs.sendMessage(t.id!, "hi from bg");
  //     return { tab: t.id, resp };
  //   })
  // );

  // console.log("[bg] 收到所有 的响应", responses);
});

// 测试存储
async function testStorage() {
  storage.setItem("local:ext-bg-data", "1");
  storage.setMeta("local:ext-bg-meta", { date: Date.now() });

  console.log("[bg]", await storage.getItems(["local:ext"]));
}
