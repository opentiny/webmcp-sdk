import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    // 定义manifiest
    permissions: ["storage", "tabs", "scripting", "contextMenus"],
    host_permissions: ["*://*/*"], //  bg 发出 fecth, bg注入content脚本，访问 tab详情，cookie..
    action: {},
  },
});
