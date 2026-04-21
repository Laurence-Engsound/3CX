<script setup lang="ts">
import { RouterLink } from 'vue-router'

const items = [
  { to: '/phone', label: '話機', icon: '📞' },
  { to: '/history', label: '紀錄', icon: '📋' },
  { to: '/settings', label: '設定', icon: '⚙️' }
]
</script>

<template>
  <nav class="flex w-16 flex-col items-center gap-1 border-r border-slate-200 bg-white py-3">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="flex w-12 flex-col items-center rounded-lg py-2 text-xs text-slate-600 hover:bg-slate-100"
      active-class="bg-brand/10 !text-brand-dark"
    >
      <span class="text-xl">{{ item.icon }}</span>
      <span class="mt-0.5">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
