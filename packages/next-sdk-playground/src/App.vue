<script setup lang="ts">
import { File, Repl } from '@vue/repl'
import Monaco from '@vue/repl/monaco-editor'
import { nextTick, onMounted, ref, watch, watchEffect } from 'vue'
import Header from './Header.vue'
import { generateImportMap, generateStore, getDefaultFiles, getVersions } from './utils'

declare global {
  const __TINY_ROBOT_VERSION__: string
}

const nextSdkVersion = ref(__TINY_ROBOT_VERSION__ || 'latest')
const nextSdkVersions = ref<string[]>([nextSdkVersion.value])

const { store, builtinImportMap } = generateStore({
  nextSdkVersion: nextSdkVersion.value,
  files: location.hash ? [] : getDefaultFiles({ nextSdkVersion: nextSdkVersion.value })
})

if (location.hash) {
  store.deserialize(location.hash)
}

// persist state to URL hash
watchEffect(() => history.replaceState({}, '', store.serialize()))

// Watch for nextSdk version changes and update import map
watch(nextSdkVersion, async (newVersion) => {
  await nextTick() // 等待 DOM 更新完成

  const importMap = generateImportMap({
    nextSdkVersion: newVersion,
    builtinImportMap: builtinImportMap.value
  })
  store.setImportMap(importMap)

  // 修改 src/index.css 中的 nextSdkVersion
  const indexCssFile = store.files['src/index.css']
  if (indexCssFile) {
    const updatedCss = indexCssFile.code.replace(
      /@opentiny\/next-sdk@[^\s'"\/]+\/dist\/style\.css/g,
      `@opentiny/next-sdk@${newVersion}/dist/style.css`
    )
    if (indexCssFile.code !== updatedCss) {
      store.addFile(new File('src/index.css', updatedCss))
    }
  }
})

// Load available Vue versions on component mount
onMounted(async () => {
  try {
    nextSdkVersions.value = await getVersions('@opentiny/next-sdk', {
      includePrerelease: true,
      includeLatest: false
    })
  } catch (error) {
    console.error('Failed to load Vue versions:', error)
  }
})

console.log(111, store)
</script>

<template>
  <div class="playground-container">
    <!-- Header with Vue version selector -->
    <Header v-model:next-sdk-version="nextSdkVersion" :next-sdk-versions="nextSdkVersions" />

    <!-- Main playground area -->
    <main class="playground-main">
      <Repl :store="store" :editor="Monaco" :show-compile-output="false" :key="nextSdkVersion" />
    </main>
  </div>
</template>

<style scoped>
.playground-container {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
}

.playground-main {
  flex: 1;
  overflow: hidden;
}
</style>
