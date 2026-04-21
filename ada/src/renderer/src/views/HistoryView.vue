<script setup lang="ts">
import { ref } from 'vue'

// Placeholder: Phase 4 will load real CDR from 3CX XAPI.
const calls = ref<
  {
    id: string
    direction: 'inbound' | 'outbound'
    number: string
    startedAt: number
    duration: number
  }[]
>([])
</script>

<template>
  <div class="mx-auto max-w-md">
    <h1 class="mb-4 text-xl font-semibold">通話紀錄</h1>
    <div v-if="calls.length === 0" class="rounded-md bg-white p-6 text-center text-sm text-slate-400 ring-1 ring-slate-200">
      尚無通話紀錄
      <p class="mt-1 text-xs">（Phase 4 將接入 3CX XAPI 讀取 CDR）</p>
    </div>
    <ul v-else class="divide-y divide-slate-200 rounded-md bg-white ring-1 ring-slate-200">
      <li
        v-for="c in calls"
        :key="c.id"
        class="flex items-center justify-between px-4 py-3"
      >
        <div>
          <div class="font-medium">{{ c.number }}</div>
          <div class="text-xs text-slate-500">
            {{ new Date(c.startedAt).toLocaleString('zh-TW') }}
          </div>
        </div>
        <span
          class="rounded-full px-2 py-0.5 text-xs"
          :class="c.direction === 'inbound' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'"
        >
          {{ c.direction === 'inbound' ? '來電' : '撥出' }}
        </span>
      </li>
    </ul>
  </div>
</template>
