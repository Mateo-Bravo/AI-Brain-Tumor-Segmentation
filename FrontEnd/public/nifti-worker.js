/**
 * Versión simplificada de nifti-reader para Web Workers
 * Basada en la lógica tradicional que ya funciona
 */

// Mock básico para replicar las funciones nifti principales
const nifti = {
  // Función para verificar si es un archivo NIFTI válido
  isNIFTI: function(data) {
    if (!data || data.byteLength < 348) {
      return false;
    }
    
    const buf = new DataView(data);
    const mag1 = buf.getUint8(344);
    const mag2 = buf.getUint8(345);
    const mag3 = buf.getUint8(346);
    
    // Magic numbers para NIFTI: "n+1" (110, 43, 49) o "ni1" (110, 105, 49)
    return (mag1 === 110 && mag2 === 43 && mag3 === 49) || 
           (mag1 === 110 && mag2 === 105 && mag3 === 49);
  },
  
  // Función para leer el header NIFTI
  readHeader: function(data) {
    if (!this.isNIFTI(data)) {
      throw new Error('No es un archivo NIFTI válido');
    }
    
    const buf = new DataView(data);
    
    // Crear objeto header básico con las propiedades necesarias
    const header = {
      littleEndian: true,
      dims: [
        buf.getInt16(40, true),  // dim[0]
        buf.getInt16(42, true),  // dim[1] - width
        buf.getInt16(44, true),  // dim[2] - height
        buf.getInt16(46, true),  // dim[3] - depth
        buf.getInt16(48, true),  // dim[4]
        buf.getInt16(50, true),  // dim[5]
        buf.getInt16(52, true),  // dim[6]
        buf.getInt16(54, true)   // dim[7]
      ],
      datatype: buf.getInt16(70, true),  // datatype
      bitpix: buf.getInt16(72, true),    // bits per pixel
      vox_offset: buf.getFloat32(108, true), // voxel offset
      scl_slope: buf.getFloat32(112, true),  // scale slope
      scl_inter: buf.getFloat32(116, true),  // scale intercept
      // Propiedades adicionales necesarias
      numBitsPerVoxel: buf.getInt16(72, true),
      datatypeCode: buf.getInt16(70, true),
      // Orientation matrices
      qform_code: buf.getInt16(252, true),
      sform_code: buf.getInt16(254, true),
      // Espaciado de voxels
      pixDims: [
        buf.getFloat32(76, true),   // pixdim[0]
        buf.getFloat32(80, true),   // pixdim[1]
        buf.getFloat32(84, true),   // pixdim[2]
        buf.getFloat32(88, true),   // pixdim[3]
        buf.getFloat32(92, true),   // pixdim[4]
        buf.getFloat32(96, true),   // pixdim[5]
        buf.getFloat32(100, true),  // pixdim[6]
        buf.getFloat32(104, true)   // pixdim[7]
      ]
    };
    
    return header;
  },
  
  // Función para leer los datos de imagen
  readImage: function(header, data) {
    const voxelOffset = Math.floor(header.vox_offset || 352);
    const imageSize = data.byteLength - voxelOffset;
    
    // Crear ArrayBuffer con solo los datos de imagen
    const imageBuffer = data.slice(voxelOffset);
    
    return imageBuffer;
  }
};

// Exportar al contexto global del Worker
if (typeof self !== 'undefined') {
  self.nifti = nifti;
} else if (typeof global !== 'undefined') {
  global.nifti = nifti;
} else if (typeof window !== 'undefined') {
  window.nifti = nifti;
}
