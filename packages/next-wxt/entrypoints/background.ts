export default defineBackground(async () => {
  console.log('Hello background!', { id: browser.runtime.id })
})
