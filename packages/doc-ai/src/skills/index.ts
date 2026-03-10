// Load skill documents for AI
const skillMdModules = import.meta.glob('./**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

export { skillMdModules }
