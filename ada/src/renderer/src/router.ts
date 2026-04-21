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
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
