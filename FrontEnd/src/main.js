import { createApp } from 'vue'
import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'

const app = createApp(App)

// Esperar a que el router cargue completamente antes de montar la app
app.use(router)
app.use(vuetify)

router.isReady().then(() => {
    app.mount('#app')
})