<template>
  <div class="cornerstone-welcome">
    <div class="welcome-container">
      <h1>Bienvenida a Cornerstone.js</h1>
      <p>Visualizador de imágenes médicas avanzado hola mundo </p>

      <div class="features">
        <div class="feature">
          <h3>Visualización</h3>
          <p>Ver imágenes DICOM y médicas de alta calidad</p>
        </div>
        <div class="feature">
          <h3>Herramientas</h3>
          <p>Pan, zoom, mediciones y anotaciones</p>
        </div>
        <div class="feature">
          <h3>Análisis</h3>
          <p>Procesamiento y análisis de imágenes</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VisorcornerstonejsView',
  data() {
    return {
      message: 'Bienvenida a Cornerstone.js'
    }
  }
}
</script>

<style scoped>
.cornerstone-welcome {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.welcome-container {
  text-align: center;
  color: white;
  padding: 2rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}

.feature {
  background: rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 8px;
  backdrop-filter: blur(10px);
}
</style>
