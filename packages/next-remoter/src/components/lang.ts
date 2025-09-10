import { PromptProps } from '@opentiny/tiny-robot'
import { h, CSSProperties } from 'vue'

// 默认的 SuggestionPills
export const mapMake = (str: string, id: number) => {
  const [text, inputMessage] = str.split('#')
  return { id, text, inputMessage }
}

export const getLang = (props: { locale: string }) => {
  const lang: Record<string, { title: string; description: string; placeholder: string; thinking: string }> = {
    'zh-CN': {
      title: 'OpenTiny NEXT',
      description: '我是你的私人智能助手',
      placeholder: '请输入您的问题',
      thinking: '正在思考中...'
    },
    'en-US': {
      title: 'OpenTiny NEXT',
      description: 'I am your private AI assistant',
      placeholder: 'Please enter your question',
      thinking: 'Thinking...'
    }
  }

  const pillItems = [
    {
      id: 'office',
      text: props.locale === 'zh-CN' ? '办公助手' : 'Office Assistant',
      menus: [
        '接收邮件#请同步邮箱的新邮件。',
        '编写邮件#请新建一个邮件，收件人为 opentiny-next@meeting.com, 内容为举办一个临时会议。',
        '安排会议#创建一个临时的在线会议，主题为讨论问题，时长为1小时。',
        '整理文档#请分析附件中的销售情况，把销售额绘制成折线图。'
      ].map(mapMake)
    },
    {
      id: 'development',
      text: props.locale === 'zh-CN' ? '开发支持' : 'Development Support',
      menus: [
        '遇到代码问题#请检查当前位置的报错原因。',
        '架构建议#请使用NodeJs实现一个分块上传文件的模块。',
        '最新的技术趋势#请分析Vue与React 框架的优劣分别是什么？'
      ].map(mapMake)
    },
    {
      id: 'management',
      text: props.locale === 'zh-CN' ? '项目管理' : 'Project Management',
      menus: [
        '项目规划#如何开展品牌推广的活动？',
        '任务分配#将本季度的销售任务分配给三个人，并生成甘特图进行跟踪。',
        '进度跟踪#分析团队的任务完成情况。'
      ].map(mapMake)
    }
  ]

  // 默认的Prompts。 仅做为介绍性文字，点击不触发事件
  const promptItems: PromptProps[] = [
    {
      label: props.locale === 'zh-CN' ? '企业办公助手' : 'Enterprise Office Assistant',
      description:
        props.locale === 'zh-CN'
          ? '需要我帮你处理邮件、安排会议、整理文档，还是优化工作流程？'
          : 'Need help with emails, meeting scheduling, document organization, or workflow optimization?',
      icon: h('span', { style: { fontSize: '18px' } as CSSProperties }, '🧠'),
      badge: 'NEW'
    },
    {
      label: props.locale === 'zh-CN' ? '开发技术支持' : 'Development Support',
      description:
        props.locale === 'zh-CN'
          ? '遇到代码问题？需要架构建议？还是想了解最新的技术趋势？'
          : 'Facing code issues? Need architecture advice? Or want to learn about latest tech trends?',
      icon: h('span', { style: { fontSize: '18px' } as CSSProperties }, '💻')
    },
    {
      label: props.locale === 'zh-CN' ? '项目管理协作' : 'Project Management',
      description:
        props.locale === 'zh-CN'
          ? '需要项目规划、任务分配、进度跟踪，还是团队协作建议？'
          : 'Need project planning, task assignment, progress tracking, or team collaboration advice?',
      icon: h('span', { style: { fontSize: '18px' } as CSSProperties }, '📊')
    }
  ]

  return {
    lang,
    pillItems,
    promptItems
  }
}
