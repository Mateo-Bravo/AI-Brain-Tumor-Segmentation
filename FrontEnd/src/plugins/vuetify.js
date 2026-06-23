import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export default createVuetify({
    components,
    directives,
    icons: {
        defaultSet: 'mdi',
        sets: {
            mdi,
        },
    },
    theme: {
        defaultTheme: 'medicalDark',
        themes: {
            medicalDark: {
                dark: true,
                colors: {
                    primary: '#1E40AF',
                    secondary: '#64748B',
                    success: '#059669',
                    warning: '#D97706',
                    error: '#DC2626',
                    info: '#0284C7',
                    surface: '#1a1a1a',
                    background: '#0f0f0f',
                    'on-surface': '#ffffff',
                    'on-background': '#ffffff'
                }
            },
            medicalLight: {
                dark: false,
                colors: {
                    primary: '#1E40AF',
                    secondary: '#64748B',
                    success: '#059669',
                    warning: '#D97706',
                    error: '#DC2626',
                    info: '#0284C7'
                }
            }
        }
    }
})