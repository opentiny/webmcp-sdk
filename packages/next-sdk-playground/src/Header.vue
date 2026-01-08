<script setup lang="ts">
import IconGithub from './components/IconGithub.vue'

// Define props interface for version data
interface Props {
  nextSdkVersions: string[]
}

// Define props with default values
withDefaults(defineProps<Props>(), {
  nextSdkVersions: () => []
})

const nextSdkVersion = defineModel<string>('nextSdkVersion', { required: true })
</script>

<template>
  <header class="playground-header">
    <div class="header-content">
      <div class="playground-info">
        <img class="playground-logo" src="/logo.svg" alt="NEXT-SDKs logo" />
        <div class="playground-title">NEXT-SDKs Playground</div>
      </div>
      <div class="header-end">
        <div class="version-selector">
          <label for="tiny-robot-version" class="version-label">NEXT-SDKs 版本:</label>

          <select id="tiny-robot-version" v-model="nextSdkVersion" class="version-select">
            <option v-for="version in nextSdkVersions" :key="version" :value="version">
              {{ version }}
            </option>
          </select>
        </div>
        <a
          class="github-button"
          href="https://github.com/opentiny/next-sdk"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open NEXT-SDKs on GitHub"
        >
          <IconGithub size="20" />
        </a>
      </div>
    </div>
  </header>
</template>

<style scoped>
.playground-header {
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  padding: 0.75rem 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.playground-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.playground-logo {
  height: 32px;
  width: 32px;
}

.playground-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.header-end {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.version-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.version-label {
  font-weight: 500;
  color: #495057;
  font-size: 0.875rem;
}

.version-select {
  padding: 0.375rem 0.75rem;
  border: 1px solid #ced4da;
  border-radius: 0.375rem;
  background-color: white;
  font-size: 0.875rem;
  color: #495057;
  cursor: pointer;
  transition:
    border-color 0.15s ease-in-out,
    box-shadow 0.15s ease-in-out;
}

.version-select:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.version-select:disabled {
  background-color: #e9ecef;
  cursor: not-allowed;
}

.github-button {
  background: transparent;
  border-radius: 999px;
  color: black;
  border: none;
  padding: 0;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
