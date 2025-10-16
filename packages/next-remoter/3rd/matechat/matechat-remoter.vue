<template>
  <McLayout class="container" :style="{ width: fullscreen ? 'unset' : '480px' }">
    <McHeader :title="title" :logoImg="titleLogo">
      <template #operationArea>
        <div class="operations">
          <i class="icon-add-thin" @click="api.createConversation"></i>
          <i class="icon-history" @click="api.showHistory"></i>
        </div>
      </template>
    </McHeader>
    <!-- 无对话时的展示 -->
    <McLayoutContent
      v-if="state.messages.length === 0"
      style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px"
    >
      <McIntroduction
        :logoImg="welcome.logo"
        :title="welcome.title"
        :description="welcome.description"
      ></McIntroduction>
      <!-- <McPrompt
        :list="introPrompt.list"
        :direction="introPrompt.direction"
        class="intro-prompt"
        @itemClick="onSubmit($event.label)"
      ></McPrompt> -->
    </McLayoutContent>
    <!-- 对话列表 -->
    <!--    <McLayoutContent v-else>
      <template v-for="(msg, idx) in messages" :key="idx">
        <McBubble
          v-if="msg.from === 'user'"
          :content="msg.content"
          :align="'right'"
          :avatarConfig="{ imgSrc: 'https://matechat.gitcode.com/png/demo/userAvatar.svg' }"
        >
        </McBubble>
        <McBubble
          v-else
          :content="msg.content"
          :avatarConfig="{ imgSrc: 'https://matechat.gitcode.com/logo.svg' }"
          :loading="msg.loading"
        >
        </McBubble>
      </template>
    </McLayoutContent>
    <div class="shortcut" style="display: flex; align-items: center; gap: 8px">
      <McPrompt
        v-if="!startPage"
        :list="simplePrompt"
        :direction="'horizontal'"
        style="flex: 1"
        @itemClick="onSubmit($event.label)"
      ></McPrompt>
      <d-button
        style="margin-left: auto"
        icon="add"
        shape="circle"
        title="新建对话"
        size="sm"
        @click="
          startPage = true
          messages = []
        "
      />
    </div>
    <McLayoutSender>
      <McInput :value="inputValue" :maxLength="2000" @change="(e) => (inputValue = e)" @submit="onSubmit">
        <template #extra>
          <div class="input-foot-wrapper">
            <div class="input-foot-left">
              <span v-for="(item, index) in inputFootIcons" :key="index">
                <i :class="item.icon"></i>
                {{ item.text }}
              </span>
              <span class="input-foot-dividing-line"></span>
              <span class="input-foot-maxlength">{{ inputValue.length }}/2000</span>
            </div>
            <div class="input-foot-right">
              <d-button icon="op-clearup" shape="round" :disabled="!inputValue" @click="inputValue = ''">
                清空输入
              </d-button>
            </div>
          </div>
        </template>
      </McInput>
    </McLayoutSender> -->
  </McLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useShareChat } from '../share/use-share-chat'

defineOptions({
  name: 'MatechatRemoter'
})

const props = defineProps({
  /** 必传的会话id */
  sessionId: {
    type: String,
    default: ''
  },
  /** 后端的代理服务器地址 */
  agentRoot: {
    type: String,
    default: 'https://agent.opentiny.design/api/v1/webmcp-trial/'
  },
  /** 系统提示词 */
  systemPrompt: {
    type: String,
    default: '你是一个智能生活助手，擅长通过工具调用帮助用户完成任务'
  },
  /** 是否全屏 */
  fullscreen: {
    type: Boolean,
    default: true
  },
  /** 左上角的标题 */
  title: {
    type: String,
    default: 'MateChat'
  },
  titleLogo: {
    type: String,
    default: 'https://matechat.gitcode.com/logo.svg'
  },
  welcome: {
    type: Object,
    default: () => ({
      logo: 'https://matechat.gitcode.com/logo.svg',
      title: 'MateChat',
      description: '我是你的私人智能助手'
    })
  },
  //----------------------------
  remoteUrl: {
    type: String
  },
  qrCodeUrl: {
    type: String
  },
  /** 展示模式： 'remoter' | 'chat-dialog'
   * 遥控器模式： 自动在右下角显示一个AI图标，点击展开多个菜单项。
   * 对话框模式： 直接显示一个对话框界面
   *  */
  mode: {
    type: String,
    default: 'remoter'
  },
  /** 大语言模型配置对象，不能与 llm 同时传入 */
  llmConfig: {
    type: Object as () => ICustomAgentModelProviderLlmConfig | undefined,
    default: undefined
  },
  /** ai-sdk官方的Provider实例，不能与 llmConfig 同时传入 */
  llm: {
    type: Object,
    default: undefined
  }
})

const { state, api } = useShareChat()
// const description = [
//   'MateChat 可以辅助研发人员编码、查询知识和相关作业信息、编写文档等。',
//   '作为AI模型，MateChat 提供的答案可能不总是确定或准确的，但您的反馈可以帮助 MateChat 做的更好。'
// ]
// const introPrompt = {
//   direction: 'horizontal',
//   list: [
//     {
//       value: 'quickSort',
//       label: '帮我写一个快速排序',
//       iconConfig: { name: 'icon-info-o', color: '#5e7ce0' },
//       desc: '使用 js 实现一个快速排序'
//     },
//     {
//       value: 'helpMd',
//       label: '你可以帮我做些什么？',
//       iconConfig: { name: 'icon-star', color: 'rgb(255, 215, 0)' },
//       desc: '了解当前大模型可以帮你做的事'
//     },
//     {
//       value: 'bindProjectSpace',
//       label: '怎么绑定项目空间',
//       iconConfig: { name: 'icon-priority', color: '#3ac295' },
//       desc: '如何绑定云空间中的项目'
//     }
//   ]
// }
// const simplePrompt = [
//   {
//     value: 'quickSort',
//     iconConfig: { name: 'icon-info-o', color: '#5e7ce0' },
//     label: '帮我写一个快速排序'
//   },
//   {
//     value: 'helpMd',
//     iconConfig: { name: 'icon-star', color: 'rgb(255, 215, 0)' },
//     label: '你可以帮我做些什么？'
//   }
// ]
// const startPage = ref(true)
// const inputValue = ref('')
// const inputFootIcons = [
//   { icon: 'icon-at', text: '智能体' },
//   { icon: 'icon-standard', text: '词库' },
//   { icon: 'icon-add', text: '附件' }
// ]

// const messages = ref([
//   {
//     from: 'user',
//     content: '你好'
//   },
//   {
//     from: 'model',
//     content: '你好，我是 MateChat',
//     id: 'init-msg'
//   }
// ])

// const onSubmit = (evt) => {
//   startPage.value = false
//   // 用户发送消息
//   messages.value.push({
//     from: 'user',
//     content: evt
//   })
//   setTimeout(() => {
//     // 模型返回消息
//     messages.value.push({
//       from: 'model',
//       content: evt
//     })
//   }, 200)
// }
</script>

<style lang="less" scoped>
.container {
  margin: 0 auto;
  height: 100vh;
  padding: 20px;
  gap: 8px;
  background: #fff;
}

.operations {
  display: inline-flex;
  gap: 12px;
  font-size: 18px;

  i {
    cursor: pointer;
  }
}

.input-foot-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 100%;
  margin-right: 8px;

  .input-foot-left {
    display: flex;
    align-items: center;
    gap: 8px;

    span {
      font-size: var(--devui-font-size-sm);
      color: var(--devui-text);
      cursor: pointer;
    }

    .input-foot-dividing-line {
      width: 1px;
      height: 14px;
      background-color: var(--devui-line);
    }

    .input-foot-maxlength {
      font-size: var(--devui-font-size-sm);
      color: var(--devui-aide-text);
    }
  }

  .input-foot-right {
    & > *:not(:first-child) {
      margin-left: 8px;
    }
  }
}
</style>
