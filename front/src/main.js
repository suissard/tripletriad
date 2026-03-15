import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
app.use(router)

import { useAuthStore } from './admin/stores/authStore'
const authStore = useAuthStore()
authStore.restoreSession()

app.mount('#app')
