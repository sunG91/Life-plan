import { ref, computed } from 'vue'
import { loadSettings, saveSettings, defaultSettings } from '../services/storage'
import { isConfigured } from '../services/doubao'
import type { AppSettings } from '../types'

const settings = ref<AppSettings>(loadSettings())

export function useSettings() {
  const configured = computed(() => isConfigured(settings.value))

  function update(partial: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...partial }
    saveSettings(settings.value)
  }

  function reset() {
    settings.value = defaultSettings()
    saveSettings(settings.value)
  }

  return { settings, configured, update, reset }
}
