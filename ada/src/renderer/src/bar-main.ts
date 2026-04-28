/**
 * bar-main.ts — entry point for the Softphone Bar window.
 *
 * Mounts ONLY the BarView component (no router, no global layout, no
 * App.vue wrapper). This avoids App.vue's auto-redirect to /phone and
 * its StatusBar/Sidebar layout that would otherwise drown the 40px Bar.
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import BarView from './views/BarView.vue'
import './style.css'

const app = createApp(BarView)
app.use(createPinia())
app.mount('#app')
