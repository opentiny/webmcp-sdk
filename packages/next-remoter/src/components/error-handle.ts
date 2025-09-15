const errorMap = {
  'No client found for session ID': '受控端页面已关闭请重新打开或者刷新页面',
  'Failed to create MCP client': '创建MCP客户端失败'
}

export const handleError = (message: string) => {
  console.log('message', message)
  const keys = Object.keys(errorMap)
  const index = keys.findIndex((key) => message.includes(key))
  const errorMessage = index !== -1 ? errorMap[keys[index] as keyof typeof errorMap] : message
  return errorMessage || message
}
