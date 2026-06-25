import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import pageAgentPrompt from "./page-agent-prompt.md?raw";
import { PageController } from "@page-agent/page-controller";

/** 在浏览器页面中注册 page-agent-tool, 用于页面的内容获取和操作，页面的动效 */
export function registerPageAgentTool() {
  const pageController = new PageController({
    enableMask: true,
    viewportExpansion: -1,
  });

  const inputSchema = z.object({
    action: z.enum([
      "browserState",
      "click",
      "fill",
      "select",
      "scroll",
      "executeJavascript",
    ] as const)
      .describe(`执行的动作名称, 每一次执行 'click', 'fill', 'select'动作之前，**必须**要先调用 'browserState' 去获取页面的最新状态。 
        browserState: '查询整个页面的浏览器状态;返回页面的标题、URL、HTML内容',
        click: '根据元素索引点击;',
        fill: '根据元素索引填写文本;'; 
        select: '根据元素索引选择下拉框选项;'; 
        scroll: '滚动页面的动作，可以指定水平滚动还是上下滚动; 不带元素索引时：滚动整个文档。带元素索引时：滚动该索引处的容器（或其最近的可滚动祖先元素）'
        executeJavascript: '执行javascript代码'
    `),
    index: z
      .number()
      .min(0)
      .optional()
      .describe(
        "执行动作的元素索引, 动作为 click,fill,select时，必须提供元素索引",
      ),
    text: z
      .string()
      .optional()
      .describe("执行动作的文本内容, 动作为 fill,select 时，必须提供文本内容"),
    down: z.boolean().optional().describe("执行上下滚动时，必须提供down参数"),
    right: z
      .boolean()
      .optional()
      .describe("执行水平滚动方向, 必须提供right参数"),
    numPages: z
      .number()
      .optional()
      .describe(
        "执行动作的滚动页数, 动作为 scroll时，可以提供滚动页数，建议每次滚动0.1页，该值不要大于5.",
      ),
    pixels: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("执行动作的滚动像素数，动作为 scroll时，可以提供滚动像素数"),
    script: z
      .string()
      .optional()
      .describe(
        "执行的javascript代码，动作为 executeJavascript时，必须提供script参数",
      ),
  });

  async function buildContent(msg: string, ret?: any) {
    await pageController.hideMask();
    await pageController.cleanUpHighlights();
    return {
      content: [{ type: "text", text: `${msg} ${JSON.stringify(ret)}` }],
    };
  }

  navigator.modelContext.registerTool({
    name: "page-agent-tool",
    description: pageAgentPrompt,
    // @ts-ignore
    inputSchema: zodToJsonSchema(inputSchema) as any,
    async execute(args: any) {
      pageController.showMask();
      try {
        if (args.action === "browserState") {
          const result = await pageController.getBrowserState();
          return buildContent("浏览器状态:", result);
        } else if (args.action === "click") {
          if (!args.index) return buildContent("点击结果:", "缺少元素索引");

          const result = await pageController.clickElement(args.index);
          return buildContent("点击结果:", result);
        } else if (args.action === "fill") {
          if (!args.index || !args.text)
            return buildContent("填写结果:", "缺少元素索引或文本内容");

          const result = await pageController.inputText(args.index, args.text);
          return buildContent("填写结果:", result);
        } else if (args.action === "select") {
          if (!args.index || !args.text)
            return buildContent("选择结果:", "缺少元素索引或文本内容");

          const result = await pageController.selectOption(
            args.index,
            args.text,
          );
          return buildContent("选择结果:", result);
        } else if (args.action === "scroll") {
          if (!args.down && !args.right)
            return buildContent("滚动结果:", "缺少滚动方向参数");

          const input = Object.assign({}, args);
          delete input.action;

          if (args.right) {
            delete input.down;
            delete input.numPages;
          }

          const result = args.right
            ? await pageController.scrollHorizontally(input)
            : await pageController.scroll(input);
          return buildContent("滚动结果:", result);
        } else if (args.action === "executeJavascript") {
          if (!args.script)
            return buildContent("脚本执行异常:", "缺少javascript代码");

          const result = await pageController.executeJavascript(args.script);
          return buildContent("脚本执行结果:", result);
        }
      } catch (error) {
        return buildContent("异常:", error);
      }
    },
  });
}
