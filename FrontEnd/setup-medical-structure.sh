#!/bin/bash

echo "🏥 Creando estructura para Medical AI Frontend..."

# Crear carpetas especializadas para aplicación médica
mkdir -p src/assets/{images,icons,styles,fonts}
mkdir -p src/components/{common,auth,upload,diagnosis,history,dashboard,reports}
mkdir -p src/views/{auth,dashboard,upload,diagnosis,history,settings,reports}
mkdir -p src/store/{modules,mutations}
mkdir -p src/services/{api,medical}
mkdir -p src/utils/{medical,validation,formatting}
mkdir -p src/plugins
mkdir -p src/composables/{medical,ui}
mkdir -p tests/{unit,e2e}
mkdir -p docs/{medical,technical}

echo "✅ Estructura de carpetas creada!"
echo "📁 Revisa la carpeta src/ para ver todos los archivos"
