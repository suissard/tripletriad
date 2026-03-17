import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'

// Global UI Components
import AppButton from './components/ui/AppButton.vue'
import AppCard from './components/ui/AppCard.vue'
import AppPanel from './components/ui/AppPanel.vue'
import AppModal from './components/ui/AppModal.vue'

const pinia = createPinia()
const app = createApp(App)

// Register global components
app.component('AppButton', AppButton)
app.component('AppCard', AppCard)
app.component('AppPanel', AppPanel)
app.component('AppModal', AppModal)

app.use(pinia)
app.use(router)

import { useUserStore } from './stores/userStore'
const userStore = useUserStore()
userStore.restoreAuth()

app.mount('#app')
