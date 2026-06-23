// src/utils/formatters.js

/**
 * Devuelve las iniciales de un nombre completo (máximo 2).
 * @param {string} fullName - Nombre completo de la persona.
 * @returns {string} Iniciales en mayúsculas.
 */
// src/utils/formatter.js

// src/utils/formatter.js

export function validateName(e, patientData) {
  e.target.value = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
  patientData.fullName = e.target.value
}

export function validatePhone(e, patientData) {
  const value = e.target.value
  const regex = /^(\+593|0)([0-9]{9})$/
  if (!regex.test(value) && value.length > 0) {
    e.target.setCustomValidity('Formato inválido. Ej: +593999999999 o 0999999999')
  } else {
    e.target.setCustomValidity('')
  }
  patientData.phone = value
}

export function validateEmail(e, patientData) {
  const value = e.target.value
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!regex.test(value) && value.length > 0) {
    alert('Correo electrónico no válido.')
  }
  patientData.email = value
}

export function validateCedula(e, patientData) {
  let cedula = e.target.value.replace(/\D/g, '')
  if (cedula.length > 10) cedula = cedula.slice(0, 10)
  e.target.value = cedula
  patientData.patientId = cedula

  if (cedula.length === 10 && !isCedulaValida(cedula)) {
    alert('Cédula ecuatoriana no válida')
  }
}

function isCedulaValida(cedula) {
  if (cedula.length !== 10) return false
  const digitoRegion = parseInt(cedula.substring(0, 2))
  if (digitoRegion < 1 || digitoRegion > 24) return false

  const ultimoDigito = parseInt(cedula.substring(9, 10))
  const pares = [1, 3, 5, 7].map(i => parseInt(cedula.substring(i, i + 1)))
  const impares = [0, 2, 4, 6, 8].map(i => {
    let n = parseInt(cedula.substring(i, i + 1)) * 2
    return n > 9 ? n - 9 : n
  })
  const sumaTotal = pares.reduce((a, b) => a + b, 0) + impares.reduce((a, b) => a + b, 0)
  const decenaSuperior = Math.ceil(sumaTotal / 10) * 10
  const digitoValidador = decenaSuperior - sumaTotal === 10 ? 0 : decenaSuperior - sumaTotal

  return digitoValidador === ultimoDigito
}


export function getUserInitials(fullName) {
  if (!fullName) return ''
  return fullName
    .split(' ')
    .filter(n => n.trim() !== '') // quita espacios dobles
    .slice(0, 2)                  // solo primeras dos palabras
    .map(n => n[0])
    .join('')
    .toUpperCase()
}

// Quitar extensión
export const cleanFilename = (filename) => {
  if (!filename) return ""
  return filename.replace(/\.[^/.]+$/, "")
}

// Mostrar solo el tipo (después del "/")
export const cleanFileType = (fileType) => {
  if (!fileType) return ""
  return fileType.split("/")[1] || fileType
}

// Convertir bytes → MB con 2 decimales
export const formatFileSize = (bytes) => {
  if (!bytes) return "0 MB"
  return (bytes / (1024 * 1024)).toFixed(2) + " MB"
}

// Fecha YYYY-MM-DD HH:mm
export const formatDate = (isoDate) => {
  if (!isoDate) return ""
  const d = new Date(isoDate)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const hour = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minutes}`
}

export const formatDateYMD = (isoDate) => {
  if (!isoDate) return ""
  const d = new Date(isoDate)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
export const formatTimeHM = (isoDate) => {
  if (!isoDate) return ""
  const d = new Date(isoDate)
  const hour = String(d.getHours()).padStart(2, "0")
  const minutes = String(d.getMinutes()).padStart(2, "0")
  return `${hour}:${minutes}`
}
