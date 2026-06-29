<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSettings } from '../composables/useSettings'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { settings, update } = useSettings()
const local = ref({ ...settings.value })
const saved = ref(false)

const modelExamples = [
  'doubao-1-5-pro-32k-250115',
  'doubao-1-5-lite-32k-250115',
  'doubao-seed-1-6-flash-250615',
  'doubao-seed-1-6-250615',
]

watch(() => props.open, (v) => {
  if (v) {
    local.value = { ...settings.value }
    saved.value = false
  }
})

function save() {
  update({ ...local.value })
  saved.value = true
  setTimeout(() => emit('close'), 600)
}

function useExampleModel(id: string) {
  local.value.useEndpoint = false
  local.value.modelId = id
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="emit('close')" />

        <div class="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl animate-slide-up max-h-[90dvh] overflow-y-auto">
          <div class="p-5 sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-slate-800">豆包 API 设置</h2>
              <button class="p-1 text-slate-400 hover:text-slate-600" @click="emit('close')">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mb-5 p-3.5 bg-indigo-50 rounded-xl text-sm text-indigo-900 leading-relaxed space-y-2">
              <p class="font-medium">配置步骤（推荐接入点方式）：</p>
              <ol class="list-decimal list-inside space-y-1 text-indigo-800/90 text-xs sm:text-sm">
                <li>
                  在
                  <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/openManagement" target="_blank" rel="noopener" class="underline font-medium">模型广场</a>
                  开通你想用的豆包模型
                </li>
                <li>
                  在
                  <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint" target="_blank" rel="noopener" class="underline font-medium">推理接入点</a>
                  创建接入点，复制 Endpoint ID（ep- 开头）
                </li>
                <li>
                  在
                  <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" target="_blank" rel="noopener" class="underline font-medium">API Key 管理</a>
                  创建并填入 API Key
                </li>
              </ol>
              <p class="text-xs text-indigo-700/80 pt-1 border-t border-indigo-100">
                参考文档：
                <a href="https://www.volcengine.com/docs/82379/2121998?lang=zh" target="_blank" rel="noopener" class="underline">在线推理（常规）</a>
                ·
                <a href="https://www.volcengine.com/docs/82379/2123275?lang=zh" target="_blank" rel="noopener" class="underline">流式输出</a>
              </p>
            </div>

            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
                <input
                  v-model="local.apiKey"
                  type="password"
                  placeholder="sk-xxxxxxxx"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>

              <div class="flex items-center justify-between gap-3">
                <div>
                  <label class="text-sm font-medium text-slate-700">调用方式</label>
                  <p class="text-xs text-slate-500 mt-0.5">推荐接入点 ID，更稳定</p>
                </div>
                <button
                  class="relative w-10 h-5 rounded-full transition-colors shrink-0"
                  :class="local.useEndpoint ? 'bg-indigo-500' : 'bg-slate-300'"
                  @click="local.useEndpoint = !local.useEndpoint"
                >
                  <span
                    class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
                    :class="local.useEndpoint ? 'translate-x-5' : 'translate-x-0.5'"
                  />
                </button>
              </div>

              <div v-if="local.useEndpoint">
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Endpoint ID（推荐）</label>
                <input
                  v-model="local.endpointId"
                  type="text"
                  placeholder="ep-2024xxxxxxxx-xxxxx"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
                <p class="mt-1.5 text-xs text-slate-500">在控制台创建「在线推理」接入点并确保状态为运行中</p>
              </div>

              <div v-else>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Model ID</label>
                <input
                  v-model="local.modelId"
                  type="text"
                  placeholder="填写已在模型广场开通的模型 ID"
                  class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
                <p class="mt-1.5 text-xs text-slate-500 mb-2">需先在模型广场开通对应模型，否则会报 404</p>
                <div class="flex flex-wrap gap-1.5">
                  <button
                    v-for="m in modelExamples"
                    :key="m"
                    type="button"
                    class="px-2 py-1 text-[11px] text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
                    @click="useExampleModel(m)"
                  >
                    {{ m }}
                  </button>
                </div>
              </div>
            </div>

            <div class="mt-6 flex gap-3">
              <button
                class="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
                @click="save"
              >
                {{ saved ? '已保存 ✓' : '保存设置' }}
              </button>
              <button
                class="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                @click="emit('close')"
              >
                取消
              </button>
            </div>

            <p class="mt-4 text-xs text-amber-600/80 leading-relaxed">
              纯前端调用会将 API Key 存储在浏览器本地，请勿在公共设备使用。
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
