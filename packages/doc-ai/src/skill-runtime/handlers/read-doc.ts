import type { SkillHandler } from '../types'

export const readDocHandler: SkillHandler = async (args, context) => {
  const { path } = args

  try {
    const content = await context.vfs.readFile(path)
    return { content }
  } catch (error: any) {
    return {
      error: error.message
    }
  }
}
