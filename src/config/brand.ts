// Identidad de marca centralizada. El logo vive en /public y se referencia con
// ruta absoluta desde la raíz, así sirve igual en dev, build y subcarpetas.
export const brand = {
  name: 'Logickem',
  tagline: 'Sistema de Gestión Empresarial',
  logo: '/logo.png',
  year: new Date().getFullYear(),
}
