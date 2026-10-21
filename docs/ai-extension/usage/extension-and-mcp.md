# 扩展与MCP

在输入对话框的扩展按钮，在右侧打开抽屉弹窗，控制当前对话可使用哪些工具函数，每一个工具都可以随时启用或禁用它。它主要有下面4种Mcp Server可以连接

![webmcp-server-tool页面上的工具](../assets/images/extension/webmcp-server-tool.png)

1. 操作chrome的Mcp工具
   这是 TinyRobot AI助手为Chrome浏览器统一增加的页面操作工具，通过它们可以实现通用的浏览器操作

用表格解释一下所有工具， browser-\* 的工具都是操作浏览器标签页。
execute_host_bash是在本地计算机环境中执行 cli 命令的。
web_page_operator是操作当前页面的， 请从web_page_operator源码中解析它的功能

2. 页面Mcp工具

这个是当前打开的网页上下文中，已经注册的原生 WebMCP 工具函数。业务系统可以通用 document.modelContext 对象进行工具注册。 插件为每个页面注入了原生 WebMCP的polyfill， 所以任何浏览器版本都可以使用document.modelContext 对象。

page-agent-tool是内置的WebMcp工具，它默认注入到每一个页面，它可以读写当前页面，生成元素索引，点击元素，填写表单文本值，下拉项选择，执行页面脚本等

3. Mcp市场工具
   ![webmcp-server市场上的工具](../assets/images/extension/webmcp-server-market.png)

   这是Opentiny团队提供的一组McpServer服务，用于12306订票等服务 。

4. 自定义Mcp工具
   ![webmcp-server自定义工具](../assets/images/extension/webmcp-server-custom.png)

   任何标准的Mcp Server都可以自行添加到扩展中 来，在对话中使用它注册的工具。 现在有2种方式添加自定义工具，1是通过表单，2是通过 mcpServer 的json格式 ： 比如 {"mcpServers":{"MyMcpServer":{"url":"https://xxxx","type":"StreamableHTTP"}}}
