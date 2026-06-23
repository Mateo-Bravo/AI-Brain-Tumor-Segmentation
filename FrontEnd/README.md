# 🏥 Sistema de Diagnóstico Médico con IA - Frontend Vue.js

> **Universidad de Cuenca - Sistema automatizado de detección de tumores cerebrales con redes neuronales UNet3D**

[![Vue.js](https://img.shields.io/badge/Vue.js-3.5.13-4FC08D?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Vuetify](https://img.shields.io/badge/Vuetify-3.8.10-1867C0?style=for-the-badge&logo=vuetify&logoColor=white)](https://vuetifyjs.com/)
[![Vite](https://img.shields.io/badge/Vite-6.2.4-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

## 👥 **Equipo de Desarrollo**

- **👨‍💼 José Baculima** - Product Owner & Requirements
- **👨‍💻 Richard Guamán** - Líder Técnico & Scrum Master
- **🔒 [Especialista Ciberseguridad]** - Security & HIPAA Compliance
- **👩‍⚕️ Equipo Médico** - Neurocirujanos & Neurólogos (Stakeholders)

## 🏗️ **ESTRUCTURA COMPLETA DEL PROYECTO**

```
machine-learning-medical-image-cancer-frontend/
├── 📁 .vscode/                          # Configuración de VS Code
│   ├── ⚙️ extensions.json              # Extensiones recomendadas
│   └── ⚙️ settings.json                 # Configuración del workspace
│
├── 📁 cypress/                          # Tests End-to-End
│   ├── 🧪 e2e/                         # Tests E2E específicos
│   ├── 🔧 fixtures/                    # Datos de prueba
│   └── 🛠️ support/                     # Helpers de Cypress
│
├── 📁 docs/                             # Documentación del proyecto
│   ├── 📁 medical/                      # Documentación médica específica
│   │   ├── 📄 clinical-workflow.md     # Flujo de trabajo clínico
│   │   ├── 📄 dicom-specifications.md  # Especificaciones DICOM
│   │   └── 📄 ai-model-documentation.md # Documentación modelo IA
│   └── 📁 technical/                    # Documentación técnica
│       ├── 📄 architecture.md          # Arquitectura del sistema
│       ├── 📄 api-integration.md       # Integración con APIs
│       └── 📄 deployment-guide.md      # Guía de deployment
│
├── 📁 node_modules/                     # Dependencias npm (auto-generado)
│
├── 📁 public/                           # Archivos estáticos públicos
│   ├── 📄 index.html                    # HTML base de la aplicación
│   ├── 🖼️ favicon.ico                   # Icono del navegador
│   └── 📁 icons/                        # Iconos PWA y manifest
│       ├── 📄 medical-icon-192.png      # Icono médico 192x192
│       └── 📄 medical-icon-512.png      # Icono médico 512x512
│
├── 📁 src/                              # 🎯 CÓDIGO FUENTE PRINCIPAL
│   ├── 📄 App.vue                       # Componente raíz de Vue
│   ├── 📄 main.js                       # Punto de entrada de la aplicación
│   │
│   ├── 📁 assets/                       # Recursos del proyecto
│   │   ├── 📁 images/                   # Imágenes del proyecto
│   │   │   ├── 📄 logo-medical.png      # Logo médico principal
│   │   │   ├── 📄 brain-hero.jpg        # Imagen hero del cerebro
│   │   │   ├── 📄 dicom-placeholder.svg # Placeholder para DICOM
│   │   │   └── 📄 tumor-examples/       # Ejemplos de tumores
│   │   ├── 📁 icons/                    # Iconos SVG personalizados
│   │   │   ├── 📄 brain-scan.svg        # Icono de escáner cerebral
│   │   │   ├── 📄 upload-dicom.svg      # Icono subida DICOM
│   │   │   ├── 📄 ai-analysis.svg       # Icono análisis IA
│   │   │   └── 📄 medical-report.svg    # Icono reporte médico
│   │   ├── 📁 fonts/                    # Tipografías médicas
│   │   │   └── 📄 medical-sans.woff2    # Fuente sans-serif médica
│   │   └── 📁 styles/                   # 🎨 Estilos globales SCSS
│   │       ├── 📄 medical-variables.scss # Variables médicas (colores, espacios)
│   │       ├── 📄 medical-theme.scss    # Tema médico principal
│   │       ├── 📄 components.scss       # Estilos de componentes
│   │       └── 📄 utilities.scss        # Clases utilitarias médicas
│   │
│   ├── 📁 components/                   # 🧩 COMPONENTES REUTILIZABLES
│   │   ├── 📁 common/                   # Componentes generales
│   │   │   ├── 📄 MedicalNavbar.vue     # Barra de navegación médica
│   │   │   ├── 📄 MedicalSidebar.vue    # Sidebar de navegación
│   │   │   ├── 📄 MedicalFooter.vue     # Footer con info médica
│   │   │   ├── 📄 LoadingSpinner.vue    # Spinner de carga médico
│   │   │   ├── 📄 ConfirmDialog.vue     # Diálogo de confirmación
│   │   │   └── 📄 ErrorAlert.vue        # Alertas de error médico
│   │   │
│   │   ├── 📁 auth/                     # 🔐 Autenticación médica
│   │   │   ├── 📄 MedicalLoginForm.vue  # Formulario login médico
│   │   │   ├── 📄 DoctorRegistration.vue # Registro de doctores
│   │   │   ├── 📄 PasswordRecovery.vue  # Recuperación contraseña
│   │   │   └── 📄 UserRoleSelector.vue  # Selector rol médico
│   │   │
│   │   ├── 📁 upload/                   # 📤 Subida de archivos médicos
│   │   │   ├── 📄 DicomUploader.vue     # Subidor archivos DICOM
│   │   │   ├── 📄 ImageDropZone.vue     # Zona drag & drop
│   │   │   ├── 📄 UploadProgress.vue    # Progreso de subida
│   │   │   ├── 📄 PatientInfoForm.vue   # Formulario paciente
│   │   │   ├── 📄 StudyMetadata.vue     # Metadatos del estudio
│   │   │   └── 📄 FileValidation.vue    # Validación archivos médicos
│   │   │
│   │   ├── 📁 diagnosis/                # 🧠 Diagnóstico con IA
│   │   │   ├── 📄 DiagnosticViewer.vue  # Visualizador principal
│   │   │   ├── 📄 BrainImageViewer.vue  # Visualizador imágenes cerebrales
│   │   │   ├── 📄 SegmentationDisplay.vue # Display segmentación 3D
│   │   │   ├── 📄 TumorClassification.vue # Clasificación de tumores
│   │   │   ├── 📄 AIConfidenceBar.vue   # Barra confianza IA
│   │   │   ├── 📄 SegmentationLegend.vue # Leyenda colores segmentación
│   │   │   ├── 📄 TumorMetrics.vue      # Métricas del tumor
│   │   │   └── 📄 DiagnosticTabs.vue    # Pestañas diagnóstico
│   │   │
│   │   ├── 📁 history/                  # 📋 Historial médico
│   │   │   ├── 📄 PatientHistory.vue    # Historial del paciente
│   │   │   ├── 📄 StudyTimeline.vue     # Timeline de estudios
│   │   │   ├── 📄 StudyCard.vue         # Tarjeta estudio individual
│   │   │   ├── 📄 HistoryFilters.vue    # Filtros de historial
│   │   │   └── 📄 ExportOptions.vue     # Opciones de exportación
│   │   │
│   │   ├── 📁 dashboard/                # 📊 Panel de control médico
│   │   │   ├── 📄 MedicalDashboard.vue  # Dashboard principal
│   │   │   ├── 📄 DiagnosticStats.vue   # Estadísticas diagnósticos
│   │   │   ├── 📄 RecentAnalysis.vue    # Análisis recientes
│   │   │   ├── 📄 QuickActions.vue      # Acciones rápidas
│   │   │   ├── 📄 AIPerformance.vue     # Performance del modelo IA
│   │   │   └── 📄 ActivityChart.vue     # Gráfico de actividad
│   │   │
│   │   └── 📁 reports/                  # 📄 Reportes médicos
│   │       ├── 📄 ReportGenerator.vue   # Generador reportes PDF
│   │       ├── 📄 ReportPreview.vue     # Vista previa reporte
│   │       ├── 📄 MedicalReportPDF.vue  # Template PDF médico
│   │       └── 📄 ReportExport.vue      # Exportación reportes
│   │
│   ├── 📁 views/                        # 📱 PÁGINAS PRINCIPALES (RUTAS)
│   │   ├── 📁 auth/                     # Páginas de autenticación
│   │   │   ├── 📄 LandingPage.vue       # 🏠 Página presentación
│   │   │   ├── 📄 MedicalLogin.vue      # Página login médico
│   │   │   ├── 📄 DoctorRegistration.vue # Registro doctores
│   │   │   └── 📄 PasswordRecovery.vue  # Recuperación contraseña
│   │   │
│   │   ├── 📁 dashboard/                # Panel principal
│   │   │   └── 📄 MedicalDashboard.vue  # Vista dashboard médico
│   │   │
│   │   ├── 📁 upload/                   # Páginas de subida
│   │   │   └── 📄 ImageUploadView.vue   # Vista subida imágenes
│   │   │
│   │   ├── 📁 diagnosis/                # Páginas de diagnóstico
│   │   │   ├── 📄 DiagnosisMain.vue     # Vista principal diagnóstico
│   │   │   ├── 📄 SegmentationView.vue  # Vista segmentación IA
│   │   │   ├── 📄 ClassificationView.vue # Vista clasificación
│   │   │   └── 📄 DiagnosisReport.vue   # Vista reporte diagnóstico
│   │   │
│   │   ├── 📁 history/                  # Páginas de historial
│   │   │   ├── 📄 PatientHistoryView.vue # Vista historial paciente
│   │   │   └── 📄 StudyDetailsView.vue  # Vista detalles estudio
│   │   │
│   │   ├── 📁 settings/                 # Páginas de configuración
│   │   │   ├── 📄 UserProfile.vue       # Perfil usuario médico
│   │   │   └── 📄 SystemSettings.vue    # Configuración sistema
│   │   │
│   │   └── 📁 reports/                  # Páginas de reportes
│   │       ├── 📄 ReportsView.vue       # Vista reportes generales
│   │       └── 📄 ReportDetail.vue      # Detalle reporte específico
│   │
│   ├── 📁 router/                       # 🛣️ CONFIGURACIÓN DE RUTAS
│   │   ├── 📄 index.js                  # Router principal
│   │   ├── 📄 guards.js                 # Guards de autenticación médica
│   │   ├── 📄 medical-routes.js         # Rutas específicas médicas
│   │   └── 📄 auth-routes.js            # Rutas de autenticación
│   │
│   ├── 📁 store/                        # 🗄️ ESTADO GLOBAL (VUEX/PINIA)
│   │   ├── 📄 index.js                  # Store principal
│   │   ├── 📁 modules/                  # Módulos de estado
│   │   │   ├── 📄 auth.js               # Estado autenticación médica
│   │   │   ├── 📄 user.js               # Estado usuario médico
│   │   │   ├── 📄 upload.js             # Estado subidas DICOM
│   │   │   ├── 📄 diagnosis.js          # Estado diagnósticos IA
│   │   │   ├── 📄 history.js            # Estado historial médico
│   │   │   ├── 📄 ui.js                 # Estado interfaz usuario
│   │   │   └── 📄 reports.js            # Estado reportes médicos
│   │   └── 📁 mutations/                # Mutaciones específicas
│   │       ├── 📄 auth-mutations.js     # Mutaciones autenticación
│   │       ├── 📄 upload-mutations.js   # Mutaciones subida
│   │       └── 📄 diagnosis-mutations.js # Mutaciones diagnóstico
│   │
│   ├── 📁 services/                     # 🌐 SERVICIOS Y APIs
│   │   ├── 📁 api/                      # APIs RESTful
│   │   │   ├── 📄 base.js               # Configuración base Axios
│   │   │   ├── 📄 auth.js               # API autenticación
│   │   │   ├── 📄 upload.js             # API subida archivos
│   │   │   ├── 📄 diagnosis.js          # API diagnóstico IA
│   │   │   ├── 📄 patients.js           # API gestión pacientes
│   │   │   └── 📄 reports.js            # API reportes médicos
│   │   └── 📁 medical/                  # Servicios médicos específicos
│   │       ├── 📄 dicom.service.js      # Servicio procesamiento DICOM
│   │       ├── 📄 unet3d.service.js     # Servicio modelo UNet3D
│   │       ├── 📄 segmentation.service.js # Servicio segmentación
│   │       ├── 📄 classification.service.js # Servicio clasificación
│   │       └── 📄 medical-calc.service.js # Cálculos médicos
│   │
│   ├── 📁 utils/                        # 🔧 UTILIDADES Y HELPERS
│   │   ├── 📁 medical/                  # Utilidades médicas
│   │   │   ├── 📄 dicom-parser.js       # Parser archivos DICOM
│   │   │   ├── 📄 brain-calculations.js # Cálculos cerebrales
│   │   │   ├── 📄 tumor-metrics.js      # Métricas de tumores
│   │   │   └── 📄 medical-constants.js  # Constantes médicas
│   │   ├── 📁 validation/               # Validaciones
│   │   │   ├── 📄 medical-validation.js # Validaciones médicas
│   │   │   ├── 📄 dicom-validation.js   # Validaciones DICOM
│   │   │   └── 📄 form-validation.js    # Validaciones formularios
│   │   └── 📁 formatting/               # Formateo de datos
│   │       ├── 📄 medical-formatters.js # Formateo datos médicos
│   │       ├── 📄 date-formatters.js    # Formateo fechas médicas
│   │       └── 📄 number-formatters.js  # Formateo números médicos
│   │
│   ├── 📁 plugins/                      # 🔌 PLUGINS DE VUE
│   │   ├── 📄 vuetify.js                # Configuración Vuetify médico
│   │   ├── 📄 axios.js                  # Configuración Axios
│   │   └── 📄 medical-notifications.js  # Notificaciones médicas
│   │
│   ├── 📁 mixins/                       # 🔄 MIXINS REUTILIZABLES
│   │   ├── 📄 auth-mixin.js             # Mixin autenticación
│   │   ├── 📄 medical-validation.js     # Mixin validación médica
│   │   └── 📄 permission-mixin.js       # Mixin permisos médicos
│   │
│   └── 📁 composables/                  # ⚡ COMPOSABLES (COMPOSITION API)
│       ├── 📁 medical/                  # Composables médicos
│       │   ├── 📄 useDiagnosis.js       # Lógica diagnóstico IA
│       │   ├── 📄 useImageProcessing.js # Procesamiento imágenes
│       │   ├── 📄 usePatientData.js     # Gestión datos pacientes
│       │   ├── 📄 useDicomViewer.js     # Visualizador DICOM
│       │   └── 📄 useMedicalReports.js  # Generación reportes
│       └── 📁 ui/                       # Composables interfaz
│           ├── 📄 useNotifications.js   # Gestión notificaciones
│           ├── 📄 useModals.js          # Gestión modales
│           ├── 📄 useLoading.js         # Estados de carga
│           └── 📄 useTheme.js           # Gestión tema médico
│
├── 📁 tests/                            # 🧪 TESTS DEL PROYECTO
│   ├── 📁 unit/                         # Tests unitarios
│   │   ├── 📁 components/               # Tests componentes
│   │   │   ├── 📄 MedicalLogin.spec.js  # Test login médico
│   │   │   ├── 📄 DicomUploader.spec.js # Test subida DICOM
│   │   │   ├── 📄 DiagnosticViewer.spec.js # Test visualizador
│   │   │   └── 📄 TumorMetrics.spec.js  # Test métricas tumor
│   │   └── 📁 services/                 # Tests servicios
│   │       ├── 📄 auth.service.spec.js  # Test servicio auth
│   │       ├── 📄 dicom.service.spec.js # Test servicio DICOM
│   │       └── 📄 diagnosis.service.spec.js # Test servicio IA
│   └── 📁 e2e/                          # Tests end-to-end
│       ├── 📄 medical-login.cy.js       # E2E login médico
│       ├── 📄 dicom-upload.cy.js        # E2E subida DICOM
│       ├── 📄 diagnosis-flow.cy.js      # E2E flujo diagnóstico
│       └── 📄 report-generation.cy.js   # E2E generación reportes
│
├── 📄 .gitattributes                    # Configuración Git attributes
├── 📄 .gitignore                        # Archivos ignorados por Git
├── 📄 Dockerfile                        # Containerización Docker
├── 📄 index.html                        # HTML principal
├── 📄 jsconfig.json                     # Configuración JavaScript
├── 📄 package.json                      # 📦 Dependencias y scripts
├── 📄 package-lock.json                 # Lock versiones exactas
├── 📄 README.md                         # 📖 Este archivo
├── 📄 setup-medical-structure.sh        # Script configuración estructura
├── 📄 vite.config.js                    # ⚙️ Configuración Vite
├── 📄 vitest.config.js                  # Configuración Vitest
└── 📄 cypress.config.js                 # Configuración Cypress
```

## 🎯 **FLUJO DE TRABAJO MÉDICO**

### **1. 🔐 Autenticación Médica**

```
LandingPage.vue → MedicalLogin.vue → MedicalDashboard.vue
```

### **2. 📤 Subida de Estudios**

```
ImageUploadView.vue → DicomUploader.vue → PatientInfoForm.vue → API Upload
```

### **3. 🧠 Procesamiento IA**

```
DiagnosisMain.vue → BrainImageViewer.vue → UNet3D Service → SegmentationDisplay.vue
```

### **4. 📊 Visualización de Resultados**

```
DiagnosticTabs.vue → TumorClassification.vue → TumorMetrics.vue → AIConfidenceBar.vue
```

### **5. 📄 Generación de Reportes**

```
ReportGenerator.vue → MedicalReportPDF.vue → Export PDF/DICOM
```

## 🚀 **Comandos de Desarrollo**

```bash
# Desarrollo
npm run dev                    # Servidor desarrollo
npm run serve                  # Alias de dev
npm run start                  # Alias de dev

# Build
npm run build                  # Build producción
npm run preview                # Preview build

# Testing
npm run test:unit              # Tests unitarios
npm run test:e2e               # Tests E2E
npm run lint                   # Linting código

# Médico específico
npm run medical:dev            # Desarrollo modo médico
npm run medical:build          # Build médico
```

## 📋 **Tecnologías Principales**

- **Frontend**: Vue.js 3.5.13 + Composition API
- **UI Framework**: Vuetify 3.8.10 (Material Design médico)
- **Build Tool**: Vite 6.2.4 (desarrollo rápido)
- **Estado**: Vuex/Pinia (gestión estado médico)
- **Routing**: Vue Router 4.5.0 (navegación SPA)
- **HTTP Client**: Axios 1.10.0 (APIs médicas)
- **Validación**: Vee-Validate + Yup (formularios médicos)
- **Charts**: Chart.js + Vue-ChartJS (métricas médicas)
- **Testing**: Vitest + Cypress (calidad código)
- **Linting**: ESLint + Prettier (estándares código)

## 🏥 **Características Médicas Específicas**

- ✅ **Soporte DICOM**: Visualización y procesamiento archivos médicos
- ✅ **Integración IA**: Modelos UNet3D para segmentación cerebral
- ✅ **Seguridad HIPAA**: Cumplimiento estándares médicos
- ✅ **Reportes PDF**: Generación automática reportes médicos
- ✅ **Audit Trail**: Trazabilidad completa acciones médicas
- ✅ **Multi-rol**: Soporte doctores, técnicos, administradores
- ✅ **Responsive**: Optimizado tablets/workstations médicas

## 📞 **Contacto del Equipo**

- **Richard Guamán** - Líder Técnico - richard.guaman@ucuenca.edu.ec
- **José Baculima** - Product Owner - jose.baculima@ucuenca.edu.ec
- **Universidad de Cuenca** - Facultad de Ingeniería

---

<div align="center">

**🏥 Desarrollado**  
_Sistema de Diagnóstico Médico con Inteligencia Artificial_
