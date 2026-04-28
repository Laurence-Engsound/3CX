import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/phone' },
  {
    path: '/login',
    name: 'login',
    component: () => import('./views/LoginView.vue'),
    meta: { title: '登入' }
  },
  {
    path: '/phone',
    name: 'phone',
    component: () => import('./views/PhoneView.vue'),
    meta: { title: '話機' }
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('./views/HistoryView.vue'),
    meta: { title: '通話紀錄' }
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('./views/SettingsView.vue'),
    meta: { title: '設定' }
  }
  // NOTE: BarView is NOT a route in the main app's router — it has its
  // own HTML entry (ada/src/renderer/bar.html → bar-main.ts) loaded in
  // a separate BrowserWindow (see ada/src/main/barWindow.ts). This avoids
  // App.vue's auto-redirect and layout interfering with the Bar.
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
