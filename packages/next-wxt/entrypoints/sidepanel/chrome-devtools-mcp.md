完整流程：从 AI 获取无障碍树到通过 UID 操作浏览器
阶段一：AI 请求获取页面快照
1.1 AI 调用 MCP 工具
AI → MCP Client → MCP Server (chrome-devtools-mcp)工具调用: take_snapshot
1.2 MCP 服务器接收请求
main.tsLines 128-144
    async (params): Promise<CallToolResult> => {      const guard = await toolMutex.acquire();      try {        logger(`${tool.name} request: ${JSON.stringify(params, null, '  ')}`);        const context = await getContext();        logger(`${tool.name} context: resolved`);        await context.detectOpenDevToolsWindows();        const response = new McpResponse();        await tool.handler(          {            params,          },          response,          context,        );
1.3 工具处理器标记需要快照
snapshot.tsLines 36-41
  handler: async (request, response) => {    response.includeSnapshot({      verbose: request.params.verbose ?? false,      filePath: request.params.filePath,    });  },
阶段二：获取 Puppeteer 无障碍树
2.1 响应处理触发快照创建
McpResponse.tsLines 186-212
  async handle(    toolName: string,    context: McpContext,  ): Promise<Array<TextContent | ImageContent>> {    if (this.#includePages) {      await context.createPagesSnapshot();    }    let formattedSnapshot: string | undefined;    if (this.#snapshotParams) {      await context.createTextSnapshot(        this.#snapshotParams.verbose,        this.#devToolsData,      );      const snapshot = context.getTextSnapshot();      if (snapshot) {        if (this.#snapshotParams.filePath) {          await context.saveFile(            new TextEncoder().encode(              formatSnapshotNode(snapshot.root, snapshot),            ),            this.#snapshotParams.filePath,          );          formattedSnapshot = `Saved snapshot to ${this.#snapshotParams.filePath}.`;        } else {          formattedSnapshot = formatSnapshotNode(snapshot.root, snapshot);        }      }    }
2.2 通过 Puppeteer 获取无障碍树
McpContext.tsLines 491-499
  async createTextSnapshot(    verbose = false,    devtoolsData: DevToolsData | undefined = undefined,  ): Promise<void> {    const page = this.getSelectedPage();    const rootNode = await page.accessibility.snapshot({      includeIframes: true,      interestingOnly: !verbose,    });    if (!rootNode) {      return;    }
2.3 内部流程（Puppeteer → CDP → Chrome）
page.accessibility.snapshot()    ↓Puppeteer API    ↓CDP 协议: Accessibility.getFullAXTree    ↓ (WebSocket)Chrome 浏览器 (渲染引擎生成无障碍树)    ↓返回 SerializedAXNode (包含 role, name, backendNodeId 等)
阶段三：为无障碍节点分配 UID
3.1 遍历树并分配唯一 ID
McpContext.tsLines 504-531
    const snapshotId = this.#nextSnapshotId++;    // Iterate through the whole accessibility node tree and assign node ids that    // will be used for the tree serialization and mapping ids back to nodes.    let idCounter = 0;    const idToNode = new Map<string, TextSnapshotNode>();    const assignIds = (node: SerializedAXNode): TextSnapshotNode => {      const nodeWithId: TextSnapshotNode = {        ...node,        id: `${snapshotId}_${idCounter++}`,        children: node.children          ? node.children.map(child => assignIds(child))          : [],      };      // The AXNode for an option doesn't contain its `value`.      // Therefore, set text content of the option as value.      if (node.role === 'option') {        const optionText = node.name;        if (optionText) {          nodeWithId.value = optionText.toString();        }      }      idToNode.set(nodeWithId.id, nodeWithId);      return nodeWithId;    };    const rootNodeWithId = assignIds(rootNode);
3.2 存储快照数据结构
McpContext.tsLines 532-543
    this.#textSnapshot = {      root: rootNodeWithId,      snapshotId: String(snapshotId),      idToNode,      hasSelectedElement: false,      verbose,    };    const data = devtoolsData ?? (await this.getDevToolsData());    if (data?.cdpBackendNodeId) {      this.#textSnapshot.hasSelectedElement = true;      this.#textSnapshot.selectedElementUid = this.resolveCdpElementId(        data?.cdpBackendNodeId,      );    }
数据结构：
McpContext.tsLines 34-45
export interface TextSnapshotNode extends SerializedAXNode {  id: string;  backendNodeId?: number;  children: TextSnapshotNode[];}export interface TextSnapshot {  root: TextSnapshotNode;  idToNode: Map<string, TextSnapshotNode>;  snapshotId: string;  selectedElementUid?: string;
阶段四：格式化并返回给 AI
4.1 格式化快照为文本

```8:30
继续输出，你好像还没总结完成

继续完成流程梳理：
继续完成流程梳理：
阶段四：格式化并返回给 AI
4.1 格式化快照为文本
snapshotFormatter.tsLines 8-42
export function formatSnapshotNode(  root: TextSnapshotNode,  snapshot?: TextSnapshot,  depth = 0,): string {  const chunks: string[] = [];  if (depth === 0) {    // Top-level content of the snapshot.    if (      snapshot?.verbose &&      snapshot?.hasSelectedElement &&      !snapshot.selectedElementUid    ) {      chunks.push(`Note: there is a selected element in the DevTools Elements panel but it is not included into the current a11y tree snapshot.Get a verbose snapshot to include all elements if you are interested in the selected element.\n\n`);    }  }  const attributes = getAttributes(root);  const line =    ' '.repeat(depth * 2) +    attributes.join(' ') +    (root.id === snapshot?.selectedElementUid      ? ' [selected in the DevTools Elements panel]'      : '') +    '\n';  chunks.push(line);  for (const child of root.children) {    chunks.push(formatSnapshotNode(child, snapshot, depth + 1));  }  return chunks.join('');}
4.2 格式化输出示例
uid=1_0 button "登录" clickable  uid=1_1 text "用户名"  uid=1_2 textbox editable    uid=1_3 text "请输入用户名"
4.3 返回给 AI
McpResponse.tsLines 211-212
          formattedSnapshot = formatSnapshotNode(snapshot.root, snapshot);        }
阶段五：AI 分析快照并决定操作
5.1 AI 接收快照数据
AI 收到 Markdown 格式的快照文本，包含：- 每个元素的 uid（如 "1_5"）- 元素角色（role: "button"）- 元素名称（name: "登录"）- 元素属性（clickable, editable 等）
5.2 AI 决策
AI 分析：需要点击"登录"按钮找到元素：uid="1_5" role="button" name="登录"决定操作：调用 click 工具，参数 {uid: "1_5"}
阶段六：通过 UID 定位 DOM 元素
6.1 AI 调用操作工具
AI → MCP Client → MCP Server工具调用: click({uid: "1_5"})
6.2 工具处理器接收请求
input.tsLines 33-35
  handler: async (request, response, context) => {    const uid = request.params.uid;    const handle = await context.getElementByUid(uid);
6.3 通过 UID 获取元素句柄
McpContext.tsLines 363-386
  async getElementByUid(uid: string): Promise<ElementHandle<Element>> {    if (!this.#textSnapshot?.idToNode.size) {      throw new Error(        `No snapshot found. Use ${takeSnapshot.name} to capture one.`,      );    }    const [snapshotId] = uid.split('_');    if (this.#textSnapshot.snapshotId !== snapshotId) {      throw new Error(        'This uid is coming from a stale snapshot. Call take_snapshot to get a fresh snapshot.',      );    }    const node = this.#textSnapshot?.idToNode.get(uid);    if (!node) {      throw new Error('No such element found in the snapshot');    }    const handle = await node.elementHandle();    if (!handle) {      throw new Error('No such element found in the snapshot');    }    return handle;  }
6.4 内部定位流程
uid="1_5"    ↓从 idToNode Map 中查找: idToNode.get("1_5")    ↓获取 TextSnapshotNode (包含 backendNodeId)    ↓调用 node.elementHandle()    ↓Puppeteer 内部通过 backendNodeId    ↓CDP 协议: DOM.describeNode(backendNodeId=12345)    ↓返回 ElementHandle (DOM 元素句柄)
阶段七：执行浏览器操作
7.1 执行点击操作
input.tsLines 37-41
      await context.waitForEventsAfterAction(async () => {        await handle.asLocator().click({          count: request.params.dblClick ? 2 : 1,        });      });
7.2 等待机制
WaitForHelper.tsLines 125-159
  async waitForEventsAfterAction(    action: () => Promise<unknown>,  ): Promise<void> {    const navigationFinished = this.waitForNavigationStarted()      .then(navigationStated => {        if (navigationStated) {          return this.#page.waitForNavigation({            timeout: this.#navigationTimeout,            signal: this.#abortController.signal,          });        }        return;      })      .catch(error => logger(error));    try {      await action();    } catch (error) {      // Clear up pending promises      this.#abortController.abort();      throw error;    }    try {      await navigationFinished;      // Wait for stable dom after navigation so we execute in      // the correct context      await this.waitForStableDom();    } catch (error) {      logger(error);    } finally {      this.#abortController.abort();    }  }
7.3 CDP 协议执行操作
handle.asLocator().click()    ↓Puppeteer Locator API    ↓CDP 协议: Input.dispatchMouseEvent({  type: "mousePressed",  button: "left",  clickCount: 1,  x: 100,  y: 200,  ...})    ↓ (WebSocket)Chrome 浏览器执行点击    ↓页面响应（可能触发导航、DOM 更新等）    ↓等待导航完成（如果有）    ↓等待 DOM 稳定（MutationObserver 检测 100ms 无变化）
阶段八：操作后处理
8.1 自动获取新快照
input.tsLine 47
      response.includeSnapshot();
8.2 返回操作结果
input.tsLines 42-46
      response.appendResponseLine(        request.params.dblClick          ? `Successfully double clicked on the element`          : `Successfully clicked on the element`,      );
8.3 资源清理
input.tsLines 48-50
    } finally {      void handle.dispose();  
完整流程图总结
┌─────────────────────────────────────────────────────────────┐│ 阶段一：AI 请求快照                                          ││ AI → MCP Client → take_snapshot()                            │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段二：获取 Puppeteer 无障碍树                              ││ page.accessibility.snapshot()                                ││   → Puppeteer API                                            ││   → CDP: Accessibility.getFullAXTree                        ││   → Chrome 渲染引擎                                          ││   → 返回 SerializedAXNode                                    │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段三：分配 UID                                              ││ 遍历无障碍树 → 为每个节点分配 uid (如 "1_5")                ││ 存储到 idToNode Map: Map<uid, TextSnapshotNode>              ││ TextSnapshotNode 包含:                                        ││   - id: "1_5"                                                ││   - backendNodeId: 12345 (CDP 节点 ID)                       ││   - role: "button"                                           ││   - name: "登录"                                             │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段四：格式化返回 AI                                         ││ formatSnapshotNode() → Markdown 文本                        ││ 输出: uid=1_5 button "登录" clickable                       │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段五：AI 分析并决策                                        ││ AI 分析快照 → 找到目标元素 uid="1_5"                        ││ 决定操作: click({uid: "1_5"})                               │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段六：通过 UID 定位 DOM                                    ││ getElementByUid("1_5")                                       ││   → idToNode.get("1_5") → TextSnapshotNode                  ││   → node.elementHandle()                                     ││   → Puppeteer 通过 backendNodeId                            ││   → CDP: DOM.describeNode(backendNodeId)                    ││   → 返回 ElementHandle                                       │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段七：执行浏览器操作                                        ││ handle.asLocator().click()                                   ││   → Puppeteer Locator API                                    ││   → CDP: Input.dispatchMouseEvent()                         ││   → Chrome 执行点击                                          ││   → 等待导航完成（如果有）                                   ││   → 等待 DOM 稳定（100ms 无变化）                            │└─────────────────────────────────────────────────────────────┘                        ↓┌─────────────────────────────────────────────────────────────┐│ 阶段八：操作后处理                                           ││ 自动获取新快照 → 返回结果给 AI → 清理资源                    │└─────────────────────────────────────────────────────────────┘
关键技术点
UID 映射机制：uid（如 "1_5"）→ idToNode Map → TextSnapshotNode → backendNodeId → ElementHandle
backendNodeId 的作用：CDP 协议中用于标识 DOM 节点的唯一 ID，连接无障碍树和 DOM
操作方式：通过 CDP 协议发送命令，而非注入脚本
自动等待机制：操作后自动等待导航和 DOM 稳定
快照管理：每次操作后自动获取新快照，确保 AI 看到最新状态
以上是从 AI 获取无障碍树到通过 UID 操作浏览器的完整流程。
