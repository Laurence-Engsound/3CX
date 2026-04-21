<script setup lang="ts">
import { ref } from 'vue'
import { useCallStore } from '../stores/call'

const number = ref('')
const call = useCallStore()

const keys = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '*',
  '0',
  '#'
]

function press(k: string) {
  number.value += k
}

function backspace() {
  number.value = number.value.slice(0, -1)
}

async function dial() {
  if (!number.value.trim()) return
  await call.dial(number.value.trim())
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <input
        v-model="number"
        class="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-lg tracking-widest focus:border-brand focus:outline-none"
        placeholder="輸入分機或外線號碼"
      />
      <button
        class="rounded-md border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-100"
        title="刪除"
        @click="backspace"
      >
        ⌫
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <button
        v-for="k in keys"
        :key="k"
        class="rounded-lg bg-white py-4 text-xl font-medium shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 active:bg-slate-100"
        @click="press(k)"
      >
        {{ k }}
      </button>
    </div>

    <button
      class="mt-2 rounded-full bg-emerald-500 py-3 text-lg font-semibold text-white shadow hover:bg-emerald-600 disabled:bg-slate-300"
      :disabled="!number"
      @click="dial"
    >
      撥打
    </button>
  </div>
</template>
