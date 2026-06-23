// Identidad de marca centralizada. El logo vive en /public y se referencia con
// ruta absoluta desde la raíz, así sirve igual en dev, build y subcarpetas.
export const brand = {
  name: 'Logickem',
  tagline: 'Sistema de Gestión Empresarial',
  logo: '/logo.png',
  year: new Date().getFullYear(),
  // Datos de la empresa para comprobantes (igual que el dashboard Blade)
  empresa: {
    razon: 'LOGICKEM - Variedades Tecnológicas',
    direccion: '2da. Calle 6-41 zona 3, Rabinal B.V.',
    whatsapp: '4710 4888',
    lema: '¡Gracias por su preferencia!',
  },
}
