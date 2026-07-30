import { productosApi } from '@/lib/api'
import type { Producto } from '@/types/producto'

/** Un grupo puede tener a lo sumo este número de miembros en las consultas. */
const MAX_MIEMBROS = 50

/**
 * Grupo destino al agrupar: si alguno de los candidatos ya pertenece a un grupo, se
 * reutiliza ese en lugar de inventar uno nuevo. Así vincular contra una variante
 * existente conserva el grupo que ya tenía (y con él, sus hermanos).
 */
export function grupoDestino(candidatos: Producto[], fallback: string): string {
  return candidatos.find((p) => p.grupo_variante)?.grupo_variante ?? fallback
}

/** Miembros de un grupo. */
export async function miembrosDe(grupo: string): Promise<Producto[]> {
  return (await productosApi.listar({ grupo_variante: grupo, per_page: MAX_MIEMBROS })).productos.data
}

/** Miembros de un grupo excluyendo un producto (sus "hermanos"). */
export async function hermanosDe(grupo: string, excluirId: number): Promise<Producto[]> {
  return (await miembrosDe(grupo)).filter((m) => m.id !== excluirId)
}

/** Trae al grupo destino a TODOS los miembros de otro grupo (fusión de grupos). */
export async function fusionarGrupos(origen: string, destino: string): Promise<void> {
  if (origen === destino) return
  const miembros = await miembrosDe(origen)
  await Promise.all(miembros.map((m) => productosApi.vincularGrupo(m.id, destino)))
}

/**
 * Mueve un producto al grupo destino arrastrando a sus hermanos si ya pertenecía a
 * otro grupo. Se usa en la creación, donde la intención es "este producto nuevo es
 * una variante de esa familia" (unirse al grupo completo, sin dejar huérfanos).
 */
export async function moverAlGrupo(p: Producto, grupo: string): Promise<void> {
  if (p.grupo_variante === grupo) return

  if (p.grupo_variante) {
    await fusionarGrupos(p.grupo_variante, grupo)
    return
  }

  await productosApi.vincularGrupo(p.id, grupo)
}
