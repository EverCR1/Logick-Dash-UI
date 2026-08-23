import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Star, Trash2, ImagePlus, Wand2, Plus, Layers, X, ChevronsLeft } from 'lucide-react'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ProductoImagenes } from './ProductoImagenes'
import { CrearProveedorRapido } from './CrearProveedorRapido'
import { CrearCategoriaRapida } from './CrearCategoriaRapida'
import { VariantesVinculadas } from './VariantesVinculadas'
import { CopiarVariante } from './CopiarVariante'
import { VincularEnCreacion } from './VincularEnCreacion'
import { grupoDestino, moverAlGrupo } from './variantes-utils'
import { EjesVariantes } from './variantes/EjesVariantes'
import { MatrizVariantes, type CampoFila, type FilaVariante } from './variantes/MatrizVariantes'
import { ResumenVariantes } from './variantes/ResumenVariantes'
import { GrupoDestino } from './variantes/GrupoDestino'
import { ImagenesVariante, IMAGENES_VACIAS, type ImagenesDeVariante } from './variantes/ImagenesVariante'
import { SubidaImagenes, type TrabajoImagen } from './variantes/SubidaImagenes'
import { combinaciones, esEjeColor, nombreDeCombinacion, repartir, skusDeCombinaciones, type Eje } from './variantes/combinaciones'
import { productosApi, catalogosApi } from '@/lib/api'
import { generarSkuDesdeNombre } from '@/lib/sku'
import type { Producto, ProductoAtributo } from '@/types/producto'

/** Qué se está creando. Al editar no aplica: se edita un producto concreto. */
type Modo = 'simple' | 'variantes' | 'existente'

type ErroresPorVariante = Record<string, Partial<Record<CampoFila, string>>>

/** Tope del backend (StoreGrupoProductosRequest::MAX_VARIANTES). */
const MAX_VARIANTES = 200

type FormState = Record<string, string>

/**
 * Firma del contenido editable del formulario. Comparar dos huellas dice si el
 * usuario tocó algo, sin instrumentar cada onChange.
 */
function huella(
  form: FormState, categorias: number[], atributos: ProductoAtributo[],
  tieneVariantes: boolean, grupo: string | null, imagenes: number, aVincular: Producto[],
  ejes: Eje[] = [], filas: Record<string, FilaVariante> = {},
): string {
  return JSON.stringify([
    form, categorias, atributos, tieneVariantes, grupo, imagenes,
    aVincular.map((p) => p.id), ejes, filas,
  ])
}

const VACIO: FormState = {
  sku: '', nombre: '', marca: '', color: '', codigo_barras: '', ubicacion: '', garantia: '',
  descripcion: '', especificaciones: '', notas_internas: '',
  proveedor_id: '', estado: 'activo',
  precio_compra: '', precio_venta: '', precio_oferta: '', stock: '', stock_minimo: '',
}

function desdeProducto(p: Producto): FormState {
  return {
    sku: p.sku ?? '', nombre: p.nombre ?? '', marca: p.marca ?? '', color: p.color ?? '',
    codigo_barras: p.codigo_barras ?? '', ubicacion: p.ubicacion ?? '', garantia: p.garantia ?? '',
    descripcion: p.descripcion ?? '', especificaciones: p.especificaciones ?? '',
    notas_internas: p.notas_internas ?? '', proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '', estado: p.estado,
    precio_compra: String(p.precio_compra ?? ''), precio_venta: String(p.precio_venta ?? ''),
    precio_oferta: p.precio_oferta ? String(p.precio_oferta) : '',
    stock: String(p.stock ?? ''), stock_minimo: String(p.stock_minimo ?? ''),
  }
}

/**
 * Alta y edición de productos, en página propia.
 *
 * Vivía en un modal, pero el formulario ya tiene cinco secciones y va a crecer
 * con la matriz de variantes. Una ruta propia da el espacio, permite compartir
 * el enlace, hace que el botón atrás funcione y saca a "nueva categoría" y
 * "nuevo proveedor" de ser modales dentro de otro modal.
 */
export default function ProductoFormPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const editar = !!id

  // Llegando desde "Agregar variante": el grupo queda fijado y `desde` señala
  // la variante hermana de la que se copian los datos compartidos.
  const grupoFijado = !editar ? searchParams.get('grupo') : null
  const idModelo = !editar ? searchParams.get('desde') : null

  const { data: modelo } = useQuery({
    queryKey: ['producto-detalle', Number(idModelo)],
    queryFn: () => productosApi.obtener(Number(idModelo)),
    enabled: !!idModelo,
  })

  // Al editar, el producto se carga por id: el detalle trae proveedor,
  // categorías, imágenes y atributos, que es todo lo que el formulario necesita.
  const { data: producto, isLoading: cargandoProducto, isError: errorProducto } = useQuery({
    queryKey: ['producto-detalle', Number(id)],
    queryFn: () => productosApi.obtener(Number(id)),
    enabled: editar,
  })

  const [form, setForm] = useState<FormState>(VACIO)
  const [categorias, setCategorias] = useState<number[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  // Imágenes seleccionadas antes de crear el producto (solo modo "nuevo")
  const [nuevasImgs, setNuevasImgs] = useState<File[]>([])
  const [principalIdx, setPrincipalIdx] = useState(0)
  // El SKU se autogenera desde el nombre hasta que el usuario lo edite a mano
  const [skuManual, setSkuManual] = useState(false)
  // Modales de creación rápida (proveedor / categoría)
  const [crearProv, setCrearProv] = useState(false)
  const [crearCat, setCrearCat] = useState(false)
  // Variantes y atributos
  const [tieneVariantes, setTieneVariantes] = useState(false)
  const [grupoVariante, setGrupoVariante] = useState<string | null>(null)
  const [atributos, setAtributos] = useState<ProductoAtributo[]>([])
  // Productos existentes a vincular al grupo cuando se crea (se aplican al guardar)
  const [aVincular, setAVincular] = useState<Producto[]>([])

  // ── Creación de varias variantes de una vez ─────────────────────────────────
  const [modo, setModo] = useState<Modo>('simple')
  const [ejes, setEjes] = useState<Eje[]>([])
  const [filas, setFilas] = useState<Record<string, FilaVariante>>({})
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set())
  const [erroresVariantes, setErroresVariantes] = useState<ErroresPorVariante>({})
  const [imagenesPorVariante, setImagenesPorVariante] = useState<Record<string, ImagenesDeVariante>>({})
  const [editandoImagenes, setEditandoImagenes] = useState<string | null>(null)
  // Subidas pendientes tras crear el lote; mientras existan, el panel las corre
  const [trabajos, setTrabajos] = useState<TrabajoImagen[] | null>(null)
  const destinoTrasSubir = useRef<string>('/productos')

  const combos = useMemo(() => combinaciones(ejes), [ejes])
  const enMatriz = !editar && modo === 'variantes'
  const hayEjeColor = enMatriz && ejes.some((e) => esEjeColor(e.nombre))

  // Los valores base alimentan las filas nuevas, pero no pueden estar en las
  // dependencias del efecto que las genera: cada tecla en el precio base
  // reiniciaría la matriz entera.
  const formRef = useRef(form)
  formRef.current = form

  // Genera las filas al cambiar las combinaciones, conservando lo ya editado:
  // añadir un valor a un atributo no debe borrar los precios ya puestos.
  useEffect(() => {
    if (!enMatriz) return
    const skus = skusDeCombinaciones(formRef.current.sku, combos)

    setFilas((previas) => {
      const siguientes: Record<string, FilaVariante> = {}
      for (const combo of combos) {
        siguientes[combo.clave] = previas[combo.clave] ?? {
          incluida: true,
          sku: skus[combo.clave],
          codigo_barras: '',
          precio_compra: formRef.current.precio_compra,
          precio_venta: formRef.current.precio_venta,
          precio_oferta: formRef.current.precio_oferta,
          stock: formRef.current.stock,
          stock_minimo: formRef.current.stock_minimo,
        }
      }
      return siguientes
    })
  }, [combos, enMatriz])

  /**
   * Prellena con los datos compartidos de la variante hermana al llegar desde
   * "Agregar variante". Es el paso que antes había que hacer a mano: buscar el
   * producto, copiar nombre, descripción, proveedor y categorías.
   *
   * No se copian SKU, precios, stock, color ni código de barras: son justo lo
   * que distingue a la variante nueva.
   */
  useEffect(() => {
    if (!modelo || !grupoFijado) return

    const inicioForm: FormState = {
      ...VACIO,
      nombre: modelo.nombre ?? '',
      descripcion: modelo.descripcion ?? '',
      especificaciones: modelo.especificaciones ?? '',
      marca: modelo.marca ?? '',
      garantia: modelo.garantia ?? '',
      ubicacion: modelo.ubicacion ?? '',
      notas_internas: modelo.notas_internas ?? '',
      proveedor_id: modelo.proveedor_id ? String(modelo.proveedor_id) : '',
      estado: modelo.estado,
    }
    const inicioCats = modelo.categorias?.map((c) => c.id) ?? []

    setForm(inicioForm)
    setCategorias(inicioCats)
    setGrupoVariante(grupoFijado)
    setTieneVariantes(true)
    setModo('existente')
    // El SKU tiene que ser propio: no se autogenera desde un nombre ya usado
    setSkuManual(true)
    // Los atributos son lo que distingue: se empieza con uno en blanco
    setAtributos([{ nombre: '', valor: '' }])

    // Llegar con datos precargados no es un cambio del usuario: si se arrepiente
    // y sale enseguida, no debe saltarle el aviso de cambios sin guardar.
    inicial.current = huella(inicioForm, inicioCats, [{ nombre: '', valor: '' }], true, grupoFijado, 0, [])
  }, [modelo, grupoFijado])

  const setCampoFila = useCallback((clave: string, campo: CampoFila, valor: string) => {
    setFilas((f) => ({ ...f, [clave]: { ...f[clave], [campo]: valor } }))
    setErroresVariantes((e) => (e[clave] ? { ...e, [clave]: { ...e[clave], [campo]: undefined } } : e))
  }, [])

  const setIncluida = useCallback((clave: string, incluida: boolean) => {
    setFilas((f) => ({ ...f, [clave]: { ...f[clave], incluida } }))
  }, [])

  /** Marca o desmarca un grupo entero: "todas", "ninguna" o las de un valor. */
  const setIncluirVarias = useCallback((claves: string[], incluida: boolean) => {
    setFilas((f) => {
      const siguiente = { ...f }
      for (const clave of claves) {
        if (siguiente[clave]) siguiente[clave] = { ...siguiente[clave], incluida }
      }
      return siguiente
    })
  }, [])

  /** Lleva el valor base de una columna a todas las filas. */
  const propagar = useCallback((campo: CampoFila) => {
    const valor = formRef.current[campo] ?? ''
    setFilas((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, { ...v, [campo]: valor }])))
  }, [])

  const alternarTarjeta = useCallback((clave: string) => {
    setAbiertas((s) => {
      const n = new Set(s)
      n.has(clave) ? n.delete(clave) : n.add(clave)
      return n
    })
  }, [])

  // Combinaciones que realmente se van a crear, en el orden del payload: onError
  // las necesita para devolver los errores del backend a su fila.
  const combosIncluidos = combos.filter((c) => filas[c.clave]?.incluida !== false)

  /** Variantes con imágenes propias, candidatas a "usar las mismas que…". */
  const fuentesDeImagenes = combosIncluidos
    .filter((c) => (imagenesPorVariante[c.clave]?.archivos.length ?? 0) > 0)
    .map((c) => ({
      clave: c.clave,
      nombre: nombreDeCombinacion(form.nombre, c),
      cuantas: imagenesPorVariante[c.clave].archivos.length,
    }))

  /**
   * Convierte lo elegido en la matriz en subidas concretas, ya con los ids de
   * los productos creados. Las copias resuelven su origen a un id real.
   */
  const armarTrabajos = (creados: Producto[]): TrabajoImagen[] => {
    const idPorClave = new Map(combosIncluidos.map((c, i) => [c.clave, creados[i]?.id]))

    return combosIncluidos.flatMap((combo) => {
      const imgs = imagenesPorVariante[combo.clave]
      const productoId = idPorClave.get(combo.clave)
      if (!imgs || !productoId) return []

      const base = { clave: combo.clave, productoId, nombre: nombreDeCombinacion(form.nombre, combo) }

      if (imgs.mismasQue) {
        const origen = idPorClave.get(imgs.mismasQue)
        return origen ? [{ ...base, archivos: [], principal: 0, copiarDe: origen }] : []
      }
      return imgs.archivos.length ? [{ ...base, archivos: imgs.archivos, principal: imgs.principal }] : []
    })
  }

  // Huella del formulario recién cargado. Comparar contra ella dice si hay
  // cambios sin guardar, sin tener que marcar "sucio" en cada onChange.
  // null = no hay borrador que proteger (aún no carga, o ya se guardó).
  const inicial = useRef<string | null>(null)

  // Puebla el formulario: vacío al crear, con los datos cuando llega el detalle
  useEffect(() => {
    if (editar && !producto) return
    const inicioForm = producto ? desdeProducto(producto) : VACIO
    const inicioCats = producto?.categorias.map((c) => c.id) ?? []
    const attrs = (producto?.atributos ?? []).map((a) => ({ nombre: a.nombre, valor: a.valor }))
    const inicioGrupo = producto?.grupo_variante ?? null

    setForm(inicioForm)
    setCategorias(inicioCats)
    setErrores({})
    setNuevasImgs([])
    setPrincipalIdx(0)
    // Al editar respetamos el SKU existente; al crear se autogenera con el nombre
    setSkuManual(!!producto)
    // Variantes / atributos
    setAtributos(attrs)
    setGrupoVariante(inicioGrupo)
    setTieneVariantes(!!inicioGrupo || attrs.length > 0)
    setAVincular([])

    // La huella se calcula de lo mismo que se acaba de cargar, así que justo
    // después de poblar el formulario no hay cambios pendientes.
    inicial.current = huella(inicioForm, inicioCats, attrs, !!inicioGrupo || attrs.length > 0, inicioGrupo, 0, [])
  }, [editar, producto])

  // Margen estimado: ((precio efectivo - compra) / compra) * 100.
  // El precio efectivo es el de oferta cuando está ingresado (es el que realmente
  // se cobra), y si no, el de venta normal.
  const margen = useMemo(() => {
    const c = parseFloat(form.precio_compra)
    const oferta = parseFloat(form.precio_oferta)
    const v = oferta > 0 ? oferta : parseFloat(form.precio_venta)
    return c > 0 && v > 0 ? ((v - c) / c) * 100 : null
  }, [form.precio_compra, form.precio_venta, form.precio_oferta])
  const margenTono = margen == null ? undefined : margen >= 30 ? 'pos' : margen >= 15 ? 'warn' : 'neg'

  const addAtributo = () => setAtributos((a) => [...a, { nombre: '', valor: '' }])
  const setAtributo = (i: number, campo: 'nombre' | 'valor', valor: string) =>
    setAtributos((a) => a.map((x, idx) => (idx === i ? { ...x, [campo]: valor } : x)))
  const quitarAtributo = (i: number) => setAtributos((a) => a.filter((_, idx) => idx !== i))
  const toggleVariantes = (on: boolean) => {
    setTieneVariantes(on)
    if (!on) { setAtributos([]); setGrupoVariante(null); setAVincular([]) }
    else if (atributos.length === 0) setAtributos([{ nombre: '', valor: '' }])
  }

  /**
   * Cambiar de modo limpia lo que pertenece al modo anterior: dejar una matriz
   * a medias al pasar a "un producto" enviaría variantes que ya no se piden.
   */
  const cambiarModo = (nuevo: Modo) => {
    setModo(nuevo)
    setErrores({})
    setErroresVariantes({})
    if (nuevo !== 'variantes') { setEjes([]); setFilas({}); setAbiertas(new Set()); setImagenesPorVariante({}) }
    // El grupo fijado por la URL sobrevive al cambio de modo: es el destino, no
    // una elección del formulario.
    if (nuevo !== 'existente') { setAtributos([]); setGrupoVariante(grupoFijado); setAVincular([]) }
    setTieneVariantes(nuevo === 'existente' || !!grupoFijado)
    if (nuevo === 'existente' && atributos.length === 0) setAtributos([{ nombre: '', valor: '' }])
    if (nuevo === 'variantes' && ejes.length === 0) setEjes([{ nombre: '', valores: [] }])
  }

  // Copiar datos de un producto existente (al crear una variante). Deja SKU, precios y stock en blanco.
  const aplicarCopia = (p: Producto) => {
    setForm((f) => ({
      ...f,
      nombre: p.nombre ?? '',
      descripcion: p.descripcion ?? '',
      especificaciones: p.especificaciones ?? '',
      marca: p.marca ?? '',
      garantia: p.garantia ?? '',
      color: p.color ?? '',
      proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '',
    }))
    setCategorias(p.categorias?.map((c) => c.id) ?? [])
    setGrupoVariante(p.grupo_variante ?? null)
    setTieneVariantes(true)
    setSkuManual(true) // el usuario debe ingresar un SKU propio para la variante
    setErrores({})
  }

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores-activos'],
    queryFn: catalogosApi.proveedoresActivos,
    staleTime: 1000 * 60 * 10,
  })
  const { data: opcionesCat = [] } = useQuery({
    queryKey: ['categorias-opciones'],
    queryFn: catalogosApi.categorias,
    staleTime: 1000 * 60 * 10,
  })

  const hayCambios = inicial.current !== null
    && inicial.current !== huella(form, categorias, atributos, tieneVariantes, grupoVariante, nuevasImgs.length, aVincular, ejes, filas)

  // Cerrar la pestaña o recargar con el formulario a medias
  useEffect(() => {
    if (!hayCambios) return
    const avisar = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [hayCambios])

  const set = (campo: string, valor: string) => {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErrores((e) => ({ ...e, [campo]: '' }))
  }

  // Nombre: si el SKU no fue editado a mano, se regenera automáticamente
  const onNombre = (valor: string) => {
    setErrores((e) => ({ ...e, nombre: '', ...(skuManual ? {} : { sku: '' }) }))
    setForm((f) => ({ ...f, nombre: valor, ...(skuManual ? {} : { sku: generarSkuDesdeNombre(valor) }) }))
  }
  const onSku = (valor: string) => { set('sku', valor); setSkuManual(true) }
  const regenerarSku = () => {
    setForm((f) => ({ ...f, sku: generarSkuDesdeNombre(f.nombre) }))
    setErrores((e) => ({ ...e, sku: '' }))
    setSkuManual(false)
  }

  // ── Preview de nombre_completo (calculado automáticamente en backend) ────────
  // Replica ligera de la lógica del backend para mostrar al usuario cómo se verá.
  const PALABRAS_DE = ['capacidad', 'cantidad', 'material']
  const PALABRAS_VARIANTES = new Set([
    'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl',
    'pequeño', 'pequeña', 'mediano', 'mediana', 'grande',
    'chico', 'chica', 'estándar', 'plus',
    'talla', 'tamaño', 'size',
    'negro', 'blanco', 'rojo', 'azul', 'verde', 'amarillo', 'naranja', 'rosa',
    'morado', 'púrpura', 'gris', 'plateado', 'dorado', 'café', 'marrón',
    'turquesa', 'cian', 'magenta', 'beige', 'crema', 'nude', 'transparente',
    'oscuro', 'claro', 'pastel', 'mate', 'brillante', 'metálico',
    'color', 'shade', 'tonalidad',
    '64gb', '128gb', '256gb', '512gb', '1tb', '2tb', '4tb',
    '16gb', '32gb', '8gb', '4gb', '2gb', '1gb',
    'gb', 'tb', 'mb', 'capacidad', 'storage', 'almacenamiento',
    'cuero', 'tela', 'lino', 'algodón', 'poliéster', 'nylon', 'seda',
    'madera', 'aluminio', 'acero', 'hierro', 'cobre', 'plástico', 'vidrio',
    'goma', 'caucho', 'titanio', 'carbono', 'material', 'tipo',
  ])

  const generarNombreCompletoPreview = () => {
    const partes = [form.nombre.trim()]

    atributos.forEach((attr) => {
      const nombre = attr.nombre.trim()
      const valor = attr.valor.trim()
      if (nombre && valor) {
        if (PALABRAS_DE.includes(nombre.toLowerCase())) {
          partes.push(`de ${valor}`)
        } else {
          partes.push(`${nombre} ${valor}`)
        }
      }
    })

    const resultado = partes.join(' ')
    return form.color ? `${resultado} - ${form.color}` : resultado
  }

  const previewNombreCompleto = generarNombreCompletoPreview()

  const detectarPalabrasVariantes = () => {
    const nombreLower = form.nombre.toLowerCase()
    return Array.from(PALABRAS_VARIANTES).some(palabra => nombreLower.includes(palabra))
  }

  const tieneAdvertencia = tieneVariantes && detectarPalabrasVariantes()

  const guardar = useMutation({
    mutationFn: async () => {
      // Matriz de variantes: un solo lote transaccional, sin pasar por la
      // creación individual. Todas comparten los datos base y se diferencian
      // por su combinación de atributos.
      if (enMatriz) {
        const { productos } = await productosApi.crearGrupo({
          // Con grupo fijado, el lote se suma al que ya existe en vez de crear uno
          grupo_variante: grupoFijado,
          base: {
            nombre: form.nombre.trim(),
            descripcion: form.descripcion.trim() || null,
            especificaciones: form.especificaciones.trim() || null,
            marca: form.marca.trim() || null,
            garantia: form.garantia.trim() || null,
            ubicacion: form.ubicacion.trim() || null,
            notas_internas: form.notas_internas.trim() || null,
            proveedor_id: Number(form.proveedor_id),
            estado: form.estado as 'activo' | 'inactivo',
            categorias,
          },
          variantes: combosIncluidos.map((combo) => {
            const fila = filas[combo.clave]
            const { color, atributos } = repartir(combo.atributos)
            return {
              sku: fila.sku.trim(),
              codigo_barras: fila.codigo_barras.trim() || null,
              // Sin atributo Color, todas heredan el color base del formulario
              color: color ?? (form.color.trim() || null),
              precio_compra: Number(fila.precio_compra),
              precio_venta: Number(fila.precio_venta),
              precio_oferta: fila.precio_oferta ? Number(fila.precio_oferta) : null,
              stock: Number(fila.stock),
              stock_minimo: Number(fila.stock_minimo),
              atributos,
            }
          }),
        })
        return { producto: productos[0], creadas: productos.length, creados: productos }
      }

      // Grupo final: el copiado/existente; si no, el de algún producto en cola que ya
      // pertenezca a un grupo (para no romperlo); y si ninguno tiene, uno nuevo.
      const grupoFinal = tieneVariantes
        ? (grupoVariante || (!editar && aVincular.length > 0
            ? grupoDestino(aVincular, `grupo-${form.sku.trim() || Date.now()}`)
            : null))
        : null
      const payload = {
        sku: form.sku.trim(),
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        especificaciones: form.especificaciones.trim() || null,
        marca: form.marca.trim() || null,
        color: form.color.trim() || null,
        proveedor_id: Number(form.proveedor_id),
        precio_compra: Number(form.precio_compra),
        precio_venta: Number(form.precio_venta),
        precio_oferta: form.precio_oferta ? Number(form.precio_oferta) : null,
        estado: form.estado as 'activo' | 'inactivo',
        stock: Number(form.stock),
        stock_minimo: Number(form.stock_minimo),
        codigo_barras: form.codigo_barras.trim() || null,
        ubicacion: form.ubicacion.trim() || null,
        garantia: form.garantia.trim() || null,
        notas_internas: form.notas_internas.trim() || null,
        grupo_variante: grupoFinal,
        categorias,
        // Solo tocar atributos si es creación o ya cargó el detalle (evita borrarlos al editar antes de cargar)
        ...((!editar || producto) && {
          atributos: tieneVariantes
            ? atributos.filter((a) => a.nombre.trim() && a.valor.trim()).map((a) => ({ nombre: a.nombre.trim(), valor: a.valor.trim() }))
            : [],
        }),
      }
      if (editar) return { producto: await productosApi.actualizar(producto!.id, payload), creadas: 1, creados: null }
      // Crear: primero el producto, luego subir las imágenes seleccionadas
      const creado = await productosApi.crear(payload)
      if (nuevasImgs.length) {
        const subidas = await productosApi.subirImagenes(creado.id, nuevasImgs)
        const elegida = subidas[principalIdx] ?? subidas[0]
        if (elegida) await productosApi.imagenPrincipal(creado.id, elegida.id)
      }
      // Vincular los productos en cola al mismo grupo (arrastrando a sus hermanos si ya tenían grupo)
      if (grupoFinal && aVincular.length > 0) {
        await Promise.all(aVincular.map((p) => moverAlGrupo(p, grupoFinal)))
      }
      return { producto: creado, creadas: 1, creados: null }
    },
    onSuccess: ({ producto: guardado, creadas, creados }) => {
      toast.success(
        editar ? 'Producto actualizado'
          : creadas > 1 ? `${creadas} variantes creadas`
            : 'Producto creado',
      )
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      if (editar && producto) queryClient.invalidateQueries({ queryKey: ['producto-detalle', producto.id] })
      // Ya no hay borrador que proteger: desarma el aviso antes de navegar
      inicial.current = null

      // Con variantes, las imágenes se suben después de que la transacción
      // cerró: se abre el panel de progreso y la navegación espera a que termine.
      if (creados) {
        const pendientes = armarTrabajos(creados)
        destinoTrasSubir.current = `/productos/${guardado.id}`
        if (pendientes.length > 0) { setTrabajos(pendientes); return }
      }

      // Al crear se abre la ficha del producto nuevo, reemplazando el formulario
      // en el historial para que "atrás" no lo devuelva a medio llenar.
      if (editar) salir()
      else navigate(`/productos/${guardado.id}`, { replace: true })
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const apiErrors: Record<string, string[]> = err.response.data?.errors ?? {}
        const generales: Record<string, string> = {}
        const porVariante: ErroresPorVariante = {}

        Object.entries(apiErrors).forEach(([clave, mensajes]) => {
          // "variantes.3.sku" vuelve a la fila 3 del lote enviado; sin esto el
          // usuario vería "el SKU está repetido" sin saber en cuál de 27 filas.
          const enLote = clave.match(/^variantes\.(\d+)\.(\w+)$/)
          if (enLote && enMatriz) {
            const combo = combosIncluidos[Number(enLote[1])]
            if (combo) {
              porVariante[combo.clave] = { ...porVariante[combo.clave], [enLote[2] as CampoFila]: mensajes[0] }
              return
            }
          }
          // "base.nombre" corresponde al campo "nombre" del formulario
          generales[clave.replace(/^base\./, '')] = mensajes[0]
        })

        setErrores(generales)
        setErroresVariantes(porVariante)

        const cuantas = Object.keys(porVariante).length
        toast.error(cuantas > 0
          ? `Revisa ${cuantas} ${cuantas === 1 ? 'variante' : 'variantes'} con errores`
          : 'Revisa los campos marcados')
      } else {
        toast.error('No se pudo guardar el producto')
      }
    },
  })

  const validar = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.sku.trim()) e.sku = enMatriz ? 'El SKU base es obligatorio' : 'El SKU es obligatorio'
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.proveedor_id) e.proveedor_id = 'Selecciona un proveedor'
    if (categorias.length === 0) e.categorias = 'Selecciona al menos una categoría'

    // En la matriz los precios y el stock viven en cada fila; los del formulario
    // son solo el valor por defecto de las filas nuevas.
    if (!enMatriz) {
      if (form.precio_compra === '') e.precio_compra = 'Requerido'
      if (form.precio_venta === '') e.precio_venta = 'Requerido'
      if (form.stock === '') e.stock = 'Requerido'
      if (form.stock_minimo === '') e.stock_minimo = 'Requerido'
    }

    setErrores(e)
    if (Object.keys(e).length > 0) return false

    if (!enMatriz) return true
    return validarMatriz()
  }

  /** Revisa la matriz y marca cada fila incompleta en su propio campo. */
  const validarMatriz = (): boolean => {
    if (combos.length === 0) {
      toast.error('Define al menos un atributo con sus valores')
      return false
    }
    if (combos.length > MAX_VARIANTES) {
      toast.error(`Son ${combos.length} combinaciones y el máximo es ${MAX_VARIANTES}`)
      return false
    }
    if (combosIncluidos.length === 0) {
      toast.error('Marca al menos una combinación para crear')
      return false
    }

    const requeridos: CampoFila[] = ['sku', 'precio_compra', 'precio_venta', 'stock', 'stock_minimo']
    const porVariante: ErroresPorVariante = {}

    for (const combo of combosIncluidos) {
      const fila = filas[combo.clave]
      for (const campo of requeridos) {
        if (String(fila?.[campo] ?? '').trim() === '') {
          porVariante[combo.clave] = { ...porVariante[combo.clave], [campo]: 'Requerido' }
        }
      }
    }

    // Un SKU repetido lo rechazaría el backend entero: mejor avisarlo aquí,
    // señalando ambas filas en vez de devolver un error de lote sin ubicación.
    const vistos = new Map<string, string>()
    for (const combo of combosIncluidos) {
      const sku = (filas[combo.clave]?.sku ?? '').trim().toLowerCase()
      if (!sku) continue
      if (vistos.has(sku)) {
        porVariante[combo.clave] = { ...porVariante[combo.clave], sku: 'SKU repetido en el lote' }
        const previo = vistos.get(sku)!
        porVariante[previo] = { ...porVariante[previo], sku: 'SKU repetido en el lote' }
      } else {
        vistos.set(sku, combo.clave)
      }
    }

    setErroresVariantes(porVariante)
    const cuantas = Object.keys(porVariante).length
    if (cuantas > 0) {
      toast.error(`Faltan datos en ${cuantas} ${cuantas === 1 ? 'variante' : 'variantes'}`)
      // Se abren las tarjetas con error para que en móvil se vea qué falta
      setAbiertas(new Set(Object.keys(porVariante)))
      return false
    }

    return true
  }

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!validar()) return
    guardar.mutate()
  }

  /**
   * Salir avisando si hay cambios sin guardar.
   *
   * En un modal el cancelar era explícito; en una página se puede salir por la
   * flecha, por el botón atrás o cerrando la pestaña. Esto cubre las salidas
   * deliberadas y el cierre de pestaña; navegar por el menú lateral no pasa por
   * aquí, porque el router de la app no es de tipo data router y `useBlocker`
   * no está disponible.
   */
  const volver = () => {
    if (hayCambios && !window.confirm('Hay cambios sin guardar. ¿Salir de todos modos?')) return
    salir()
  }

  /**
   * Atrás si hay a dónde volver dentro de la app, y si no al listado.
   * Entrando por URL directa —un enlace compartido, un marcador— no hay
   * historial propio y `navigate(-1)` sacaría al usuario del dashboard.
   */
  const salir = () => {
    const dentroDeLaApp = (window.history.state?.idx ?? 0) > 0
    if (dentroDeLaApp) navigate(-1)
    else navigate(editar && producto ? `/productos/${producto.id}` : '/productos')
  }

  if (editar && cargandoProducto) {
    return (
      <div className="empty" style={{ padding: 100 }}>
        <Loader2 size={26} className="spin" style={{ color: 'var(--accent)' }} />
        <div>Cargando producto…</div>
      </div>
    )
  }

  if (editar && (errorProducto || !producto)) {
    return (
      <div className="card">
        <div className="empty" style={{ padding: 80 }}>
          <div>No se pudo cargar el producto</div>
          <button className="btn" style={{ marginTop: 10 }} onClick={() => navigate('/productos')}>Volver a productos</button>
        </div>
      </div>
    )
  }

  const acciones = (
    <>
      <button type="button" className="btn" onClick={volver} disabled={guardar.isPending}>Cancelar</button>
      <button type="submit" form="producto-form" className="btn btn-primary" disabled={guardar.isPending}>
        {guardar.isPending && <Loader2 size={14} className="spin" />}
        {editar ? 'Guardar cambios' : 'Crear producto'}
      </button>
    </>
  )

  return (
    <>
    <div className="prod-form-page">
      {/* Cabecera fija: guardar siempre a la vista, sin volver al final del formulario */}
      <div className="prod-form-head">
        <button type="button" className="back-link" onClick={volver}><ChevronsLeft /> Productos</button>
        <div className="prod-form-titulo">
          <div className="page-title">{editar ? 'Editar producto' : 'Nuevo producto'}</div>
          <div className="page-sub">{editar ? producto?.sku : 'Completa la información del producto'}</div>
        </div>
        <div className="prod-form-acciones">{acciones}</div>
      </div>

      {/* Qué se está creando. La decisión va arriba porque cambia el resto del
          formulario: con variantes, precios y stock pasan a la matriz. */}
      {!editar && (
        <div className="modo-selector">
          {grupoFijado ? (
            <span className="modo-label">
              Se agregará al grupo <code>{grupoFijado}</code>
              {modelo && <span className="muted" style={{ fontWeight: 400 }}> · datos copiados de {modelo.nombre_completo || modelo.nombre}</span>}
            </span>
          ) : (
            <span className="modo-label">¿Qué vas a crear?</span>
          )}
          <div className="modo-opciones">
            {(grupoFijado
              // Con grupo fijado no tiene sentido "un producto suelto": lo que se
              // elige es cuántas variantes sumar, una o varias.
              ? ([
                ['existente', 'Una variante', 'Se suma al grupo'],
                ['variantes', 'Varias variantes', 'Con su matriz de combinaciones'],
              ] as const)
              : ([
                ['simple', 'Un producto', 'Un producto sin variantes'],
                ['variantes', 'Un producto con variantes', 'Varias de una vez, con su matriz'],
                ['existente', 'Una variante de uno existente', 'Se suma a un grupo ya creado'],
              ] as const)
            ).map(([valor, titulo, ayuda]) => (
              <button
                key={valor}
                type="button"
                className="modo-opcion"
                data-on={modo === valor}
                onClick={() => cambiarModo(valor)}
              >
                <span className="modo-opcion-titulo">{titulo}</span>
                <span className="modo-opcion-ayuda">{ayuda}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="prod-form-layout">
      <form id="producto-form" onSubmit={onSubmit} className="form-grid prod-form-main">
        <Campo
          label={enMatriz ? 'SKU base' : 'SKU'}
          req
          error={errores.sku}
          hint={enMatriz
            ? 'Cada variante lo lleva con su sufijo (ABC-128GB-NEG)'
            : skuManual ? 'Editado manualmente' : 'Se genera automáticamente desde el nombre'}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="form-input" value={form.sku} onChange={(e) => onSku(e.target.value)} aria-invalid={!!errores.sku} placeholder="ABC-123" style={{ flex: 1 }} />
            <button type="button" className="btn" title="Generar SKU desde el nombre" onClick={regenerarSku} disabled={!form.nombre.trim()}><Wand2 size={14} /></button>
          </div>
        </Campo>
        {/* El código de barras es único por producto: en la matriz vive en cada fila */}
        {!enMatriz && (
          <Campo label="Código de barras" error={errores.codigo_barras}>
            <input className="form-input" value={form.codigo_barras} onChange={(e) => set('codigo_barras', e.target.value)} aria-invalid={!!errores.codigo_barras} />
          </Campo>
        )}

        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => onNombre(e.target.value)} aria-invalid={!!errores.nombre} placeholder="Nombre del producto" />
          {tieneAdvertencia && (
            <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: 'color-mix(in oklch, var(--warn) 12%, var(--bg-elev-2))', border: '1px solid color-mix(in oklch, var(--warn) 30%, var(--border))', borderRadius: 8, fontSize: '12px', color: 'var(--warn)', display: 'flex', alignItems: 'flex-start', gap: 8, lineHeight: 1.4 }}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>⚠️</span>
              <span>El nombre parece incluir información de variantes. Usa solo el nombre base (ej: "Camiseta") y deja que los atributos se agreguen automáticamente.</span>
            </div>
          )}
          {previewNombreCompleto && (
            <div className="nombre-sug" style={{ marginTop: 8, cursor: 'default' }}>
              <span className="nombre-sug-txt">
                Se mostrará como: <b>{previewNombreCompleto}</b>
              </span>
            </div>
          )}
        </Campo>

        <Campo label="Descripción" error={errores.descripcion} col2>
          <textarea className="form-textarea" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>

        <Campo label="Marca" error={errores.marca}>
          <input className="form-input" value={form.marca} onChange={(e) => set('marca', e.target.value)} />
        </Campo>
        {/* Con un atributo llamado Color, lo gobierna la matriz y este campo sobra */}
        {!hayEjeColor && (
          <Campo label="Color" error={errores.color}
            hint={enMatriz ? 'Se aplica a todas las variantes' : undefined}>
            <input className="form-input" value={form.color} onChange={(e) => set('color', e.target.value)} />
          </Campo>
        )}

        <Campo label="Proveedor" req error={errores.proveedor_id}>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Select
                value={form.proveedor_id}
                onValueChange={(v) => set('proveedor_id', v)}
                placeholder="Seleccionar…"
                options={proveedores.map((p) => ({ value: String(p.id), label: p.nombre }))}
              />
            </div>
            <button type="button" className="btn" title="Crear proveedor" onClick={() => setCrearProv(true)}><Plus size={14} /></button>
          </div>
        </Campo>
        <Campo label="Estado" req error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)}
            options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>

        <div className="form-field col-2">
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Categorías<span className="req"> *</span></span>
            <button type="button" className="btn btn-sm" onClick={() => setCrearCat(true)}><Plus size={13} /> Nueva</button>
          </label>
          <MultiSelect
            options={opcionesCat.map((c) => ({ value: c.id, label: c.nombre, nivel: c.nivel }))}
            selected={categorias}
            onChange={(s) => { setCategorias(s); setErrores((e) => ({ ...e, categorias: '' })) }}
            placeholder="Seleccionar categorías…"
            searchable
            searchPlaceholder="Buscar categoría…"
          />
          {errores.categorias && <span className="form-error">{errores.categorias}</span>}
        </div>

        {/* En la matriz estos campos son el punto de partida de cada fila nueva,
            no el precio del producto: cada variante puede tener el suyo. */}
        <div className="form-section-title">
          {enMatriz ? 'Precios e inventario — valores por defecto' : 'Precios e inventario'}
        </div>
        {enMatriz && (
          <div className="col-2 muted" style={{ fontSize: 12, marginTop: -4 }}>
            Se usan al generar cada variante. Para cambiarlos en todas a la vez,
            edítalos aquí y pulsa el icono de copiar en la columna de la tabla.
          </div>
        )}
        <Campo label="Precio compra" req error={errores.precio_compra}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.precio_compra} onChange={(e) => set('precio_compra', e.target.value)} aria-invalid={!!errores.precio_compra} />
        </Campo>
        <Campo label="Precio venta" req error={errores.precio_venta}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} aria-invalid={!!errores.precio_venta} />
        </Campo>
        <Campo label="Precio oferta" error={errores.precio_oferta}>
          <input type="number" step="0.01" min="0" className="form-input" value={form.precio_oferta} onChange={(e) => set('precio_oferta', e.target.value)} placeholder="Opcional" />
        </Campo>
        <div className="form-field">
          <label>Margen estimado</label>
          <div className="margen-box">
            {margen == null
              ? <span className="muted">—</span>
              : <span className="badge" data-tone={margenTono}><span className="b-dot" />{margen.toFixed(1)}%</span>}
            <span className="muted" style={{ fontSize: 11.5 }}>
              {parseFloat(form.precio_oferta) > 0 ? 'sobre el precio de oferta' : 'sobre el precio de venta'}
            </span>
          </div>
        </div>
        <Campo label="Garantía" error={errores.garantia}>
          <input className="form-input" value={form.garantia} onChange={(e) => set('garantia', e.target.value)} placeholder="Ej: 6 meses" />
        </Campo>
        <Campo label="Stock" req error={errores.stock}>
          <input type="number" min="0" className="form-input" value={form.stock} onChange={(e) => set('stock', e.target.value)} aria-invalid={!!errores.stock} />
        </Campo>
        <Campo label="Stock mínimo" req error={errores.stock_minimo}>
          <input type="number" min="0" className="form-input" value={form.stock_minimo} onChange={(e) => set('stock_minimo', e.target.value)} aria-invalid={!!errores.stock_minimo} />
        </Campo>
        <Campo label="Ubicación" error={errores.ubicacion} col2>
          <input className="form-input" value={form.ubicacion} onChange={(e) => set('ubicacion', e.target.value)} placeholder="Ej: Bodega A, Estante 3" />
        </Campo>

        <div className="form-section-title">Detalles</div>
        <Campo label="Especificaciones" error={errores.especificaciones} col2>
          <textarea className="form-textarea" value={form.especificaciones} onChange={(e) => set('especificaciones', e.target.value)} />
        </Campo>
        <Campo label="Notas internas" error={errores.notas_internas} col2 hint="Visibles solo para el equipo interno">
          <textarea className="form-textarea" value={form.notas_internas} onChange={(e) => set('notas_internas', e.target.value)} placeholder="Notas que no se muestran al cliente…" />
        </Campo>

        {/* El grupo destino ya viene decidido por la URL: se muestra enlazado en
            vez de dejar el buscador vacío, que parecía pedir buscarlo otra vez. */}
        {!editar && grupoFijado && (
          <div className="col-2"><GrupoDestino grupo={grupoFijado} /></div>
        )}

        {/* Matriz: los atributos que varían generan una fila por combinación */}
        {enMatriz && (
          <>
            <div className="form-section-title">
              <Layers size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Atributos que varían
            </div>
            <div className="col-2">
              <EjesVariantes ejes={ejes} onChange={setEjes} maximo={MAX_VARIANTES} />
            </div>
            {combos.length > 0 && (
              <div className="col-2">
                <MatrizVariantes
                  nombreBase={form.nombre}
                  combinaciones={combos}
                  filas={filas}
                  onCampo={setCampoFila}
                  onIncluida={setIncluida}
                  onIncluirVarias={setIncluirVarias}
                  onPropagar={propagar}
                  errores={erroresVariantes}
                  abiertas={abiertas}
                  onAlternar={alternarTarjeta}
                  imagenes={imagenesPorVariante}
                  onAbrirImagenes={setEditandoImagenes}
                />
              </div>
            )}
          </>
        )}

        {/* Al editar, o al crear una variante suelta de un grupo existente */}
        {!enMatriz && (
        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><Layers size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Variantes y atributos</span>
          {editar && (
            <label className="switch-inline">
              <input type="checkbox" checked={tieneVariantes} onChange={(e) => toggleVariantes(e.target.checked)} />
              <span>Pertenece a un grupo de variantes</span>
            </label>
          )}
        </div>
        )}
        {!enMatriz && tieneVariantes && (
          <div className="col-2 atributos-box">
            {/* Copiar de otro producto no aplica: los datos ya llegaron de la hermana */}
            {!editar && !grupoFijado && <CopiarVariante onCopiar={aplicarCopia} />}
            <div className="muted" style={{ fontSize: 12 }}>
              Define los atributos que distinguen esta variante (ej: <b>Capacidad</b> / 128GB, <b>Talla</b> / XL).
            </div>
            {atributos.length === 0 && <div className="muted" style={{ fontSize: 12.5 }}>Sin atributos. Agrega al menos uno.</div>}
            {atributos.map((a, i) => (
              <div key={i} className="atributo-row">
                <input className="form-input" value={a.nombre} onChange={(e) => setAtributo(i, 'nombre', e.target.value)} placeholder="Atributo (ej: Capacidad)" />
                <input className="form-input" value={a.valor} onChange={(e) => setAtributo(i, 'valor', e.target.value)} placeholder="Valor (ej: 128GB)" />
                <button type="button" className="icon-action" data-variant="delete" title="Quitar atributo" onClick={() => quitarAtributo(i)}><X size={15} /></button>
              </div>
            ))}
            <div>
              <button type="button" className="btn btn-sm" onClick={addAtributo}><Plus size={13} /> Agregar atributo</button>
            </div>
            {/* Con grupo fijado ya lo dice el panel de arriba */}
            {grupoVariante && !grupoFijado && <div className="muted" style={{ fontSize: 11 }}>Grupo: <code>{grupoVariante}</code></div>}

            {editar && producto && (
              <VariantesVinculadas
                productoId={producto.id}
                sku={form.sku}
                grupo={grupoVariante}
                onGrupoChange={(g) => { setGrupoVariante(g); if (g) setTieneVariantes(true) }}
              />
            )}
            {/* Buscar el grupo solo tiene sentido cuando no viene decidido */}
            {!editar && !grupoFijado && (
              <VincularEnCreacion seleccionados={aVincular} onChange={setAVincular} />
            )}
          </div>
        )}

      </form>

      {/* Las imágenes salen del flujo del formulario: en escritorio quedan fijas
          a un lado como referencia mientras se editan los demás campos. */}
      <aside className="prod-form-side">
        {/* Con matriz, el resumen va primero: es la última oportunidad de notar
            que el nombre base ya incluía la talla, o que sobra una combinación. */}
        {enMatriz && (
          <div className="card">
            <div className="card-header"><div className="card-title"><Layers size={15} style={{ color: 'var(--accent-text)' }} />Se creará</div></div>
            <div className="card-pad">
              <ResumenVariantes nombreBase={form.nombre} combinaciones={combos} filas={filas} />
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-header"><div className="card-title"><ImagePlus size={15} style={{ color: 'var(--accent-text)' }} />Imágenes</div></div>
          <div className="card-pad">
            {editar && producto ? (
              <ProductoImagenes productoId={producto.id} imagenes={producto.imagenes ?? []} />
            ) : enMatriz ? (
              // Lo normal es que cada variante tenga fotos distintas, así que
              // se eligen fila por fila y no hay una galería común aquí.
              <div className="muted" style={{ fontSize: 12.5 }}>
                Cada variante lleva sus propias imágenes: se eligen desde la columna
                <b> Imágenes</b> de la tabla. Se suben al terminar de crear el grupo.
              </div>
            ) : (
              <ImagenesNuevas files={nuevasImgs} onChange={setNuevasImgs} principal={principalIdx} setPrincipal={setPrincipalIdx} />
            )}
          </div>
        </div>
      </aside>
      </div>

      {/* En móvil la cabecera no cabe con las acciones: van a una barra inferior */}
      <div className="prod-form-barra">{acciones}</div>
    </div>

    {/* Imágenes de una variante concreta de la matriz */}
    {editandoImagenes && (
      <ImagenesVariante
        open
        onClose={() => setEditandoImagenes(null)}
        nombre={nombreDeCombinacion(form.nombre, combos.find((c) => c.clave === editandoImagenes)!)}
        valor={imagenesPorVariante[editandoImagenes] ?? IMAGENES_VACIAS}
        onChange={(valor) => setImagenesPorVariante((prev) => ({ ...prev, [editandoImagenes]: valor }))}
        fuentes={fuentesDeImagenes.filter((f) => f.clave !== editandoImagenes)}
      />
    )}

    {/* Subida posterior a la creación del lote */}
    {trabajos && (
      <SubidaImagenes
        trabajos={trabajos}
        onTerminar={() => { setTrabajos(null); navigate(destinoTrasSubir.current, { replace: true }) }}
      />
    )}

    <CrearProveedorRapido open={crearProv} onClose={() => setCrearProv(false)}
      onCreated={(p) => set('proveedor_id', String(p.id))} />
    <CrearCategoriaRapida open={crearCat} onClose={() => setCrearCat(false)}
      onCreated={(c) => { setCategorias((prev) => [...prev, c.id]); setErrores((e) => ({ ...e, categorias: '' })) }} />
    </>
  )
}

function Campo({ label, req, error, children, col2, hint }: {
  label: string; req?: boolean; error?: string; children: ReactNode; col2?: boolean; hint?: string
}) {
  return (
    <div className={'form-field' + (col2 ? ' col-2' : '')}>
      <label>{label}{req && <span className="req"> *</span>}</label>
      {children}
      {error ? <span className="form-error">{error}</span> : hint && <span className="muted" style={{ fontSize: 11 }}>{hint}</span>}
    </div>
  )
}

// Selección de imágenes antes de crear el producto (se suben al guardar)
function ImagenesNuevas({ files, onChange, principal, setPrincipal }: {
  files: File[]; onChange: (f: File[]) => void; principal: number; setPrincipal: (i: number) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const agregar = (picked: File[]) => {
    const validas = picked.filter((f) => {
      if (!f.type.startsWith('image/')) { toast.error(`${f.name}: no es una imagen`); return false }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name}: supera 5 MB`); return false }
      return true
    })
    if (validas.length) onChange([...files, ...validas])
  }
  const quitar = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx))
    if (principal === idx) setPrincipal(0)
    else if (principal > idx) setPrincipal(principal - 1)
  }
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    agregar(Array.from(e.target.files ?? []))
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="col-2" style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
        <button type="button" className="btn" onClick={() => inputRef.current?.click()}><ImagePlus size={14} /> Agregar imágenes</button>
        <span className="muted" style={{ fontSize: 11.5 }}>{files.length > 0 ? 'La estrella marca la imagen principal.' : 'Opcional · JPG, PNG, WebP · máx. 5 MB c/u'}</span>
      </div>

      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          {previews.map((src, idx) => (
            <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: principal === idx ? '2px solid var(--accent)' : '1px solid var(--border)' }}>
              <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 4 }}>
                <button type="button" className="icon-btn" title={principal === idx ? 'Imagen principal' : 'Marcar como principal'}
                  onClick={() => setPrincipal(idx)}
                  style={{ background: 'rgba(0,0,0,.55)', color: principal === idx ? '#f59e0b' : '#fff', width: 24, height: 24 }}>
                  <Star size={13} fill={principal === idx ? '#f59e0b' : 'none'} />
                </button>
                <button type="button" className="icon-btn" title="Quitar"
                  onClick={() => quitar(idx)}
                  style={{ background: 'rgba(0,0,0,.55)', color: '#fca5a5', width: 24, height: 24 }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
