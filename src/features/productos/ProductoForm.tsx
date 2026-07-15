import { useState, useEffect, useRef, useMemo, type ReactNode, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Star, Trash2, ImagePlus, Wand2, Plus, Layers, X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ProductoImagenes } from './ProductoImagenes'
import { CrearProveedorRapido } from './CrearProveedorRapido'
import { CrearCategoriaRapida } from './CrearCategoriaRapida'
import { VariantesVinculadas } from './VariantesVinculadas'
import { CopiarVariante } from './CopiarVariante'
import { VincularEnCreacion } from './VincularEnCreacion'
import { productosApi, catalogosApi } from '@/lib/api'
import { generarSkuDesdeNombre } from '@/lib/sku'
import type { Producto, ProductoAtributo } from '@/types/producto'

interface ProductoFormProps {
  open: boolean
  onClose: () => void
  producto: Producto | null
}

type FormState = Record<string, string>

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

export function ProductoForm({ open, onClose, producto }: ProductoFormProps) {
  const queryClient = useQueryClient()
  const editar = !!producto

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

  // Resetea el formulario al abrir (vacío para crear, con datos para editar)
  useEffect(() => {
    if (!open) return
    setForm(producto ? desdeProducto(producto) : VACIO)
    setCategorias(producto?.categorias.map((c) => c.id) ?? [])
    setErrores({})
    setNuevasImgs([])
    setPrincipalIdx(0)
    // Al editar respetamos el SKU existente; al crear se autogenera con el nombre
    setSkuManual(!!producto)
    // Variantes / atributos
    const attrs = producto?.atributos ?? []
    setAtributos(attrs.map((a) => ({ nombre: a.nombre, valor: a.valor })))
    setGrupoVariante(producto?.grupo_variante ?? null)
    setTieneVariantes(!!producto?.grupo_variante || attrs.length > 0)
    setAVincular([])
  }, [open, producto])

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
    enabled: open,
  })
  const { data: opcionesCat = [] } = useQuery({
    queryKey: ['categorias-opciones'],
    queryFn: catalogosApi.categorias,
    staleTime: 1000 * 60 * 10,
    enabled: open,
  })
  // Al editar, el producto de la lista no trae 'atributos'; cargamos el detalle completo.
  const { data: detalle } = useQuery({
    queryKey: ['producto-detalle', producto?.id],
    queryFn: () => productosApi.obtener(producto!.id),
    enabled: open && editar,
  })

  // Poblar atributos / grupo de variante cuando llega el detalle completo
  useEffect(() => {
    if (!detalle) return
    const attrs = detalle.atributos ?? []
    setAtributos(attrs.map((a) => ({ nombre: a.nombre, valor: a.valor })))
    setGrupoVariante(detalle.grupo_variante ?? null)
    setTieneVariantes(!!detalle.grupo_variante || attrs.length > 0)
  }, [detalle])

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

  const guardar = useMutation({
    mutationFn: async () => {
      // Grupo final: el copiado/existente, o uno nuevo si hay productos en cola para vincular
      const grupoFinal = tieneVariantes
        ? (grupoVariante || (!editar && aVincular.length > 0 ? `grupo-${form.sku.trim() || Date.now()}` : null))
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
        ...((!editar || detalle) && {
          atributos: tieneVariantes
            ? atributos.filter((a) => a.nombre.trim() && a.valor.trim()).map((a) => ({ nombre: a.nombre.trim(), valor: a.valor.trim() }))
            : [],
        }),
      }
      if (editar) return productosApi.actualizar(producto!.id, payload)
      // Crear: primero el producto, luego subir las imágenes seleccionadas
      const creado = await productosApi.crear(payload)
      if (nuevasImgs.length) {
        const subidas = await productosApi.subirImagenes(creado.id, nuevasImgs)
        const elegida = subidas[principalIdx] ?? subidas[0]
        if (elegida) await productosApi.imagenPrincipal(creado.id, elegida.id)
      }
      // Vincular los productos en cola al mismo grupo
      if (grupoFinal && aVincular.length > 0) {
        await Promise.all(aVincular.map((p) => productosApi.vincularGrupo(p.id, grupoFinal)))
      }
      return creado
    },
    onSuccess: () => {
      toast.success(editar ? 'Producto actualizado' : 'Producto creado')
      queryClient.invalidateQueries({ queryKey: ['productos'] })
      if (editar && producto) queryClient.invalidateQueries({ queryKey: ['producto-detalle', producto.id] })
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const apiErrors: Record<string, string[]> = err.response.data?.errors ?? {}
        const mapped: Record<string, string> = {}
        Object.entries(apiErrors).forEach(([k, v]) => { mapped[k] = v[0] })
        setErrores(mapped)
        toast.error('Revisa los campos marcados')
      } else {
        toast.error('No se pudo guardar el producto')
      }
    },
  })

  const validar = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.sku.trim()) e.sku = 'El SKU es obligatorio'
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!form.proveedor_id) e.proveedor_id = 'Selecciona un proveedor'
    if (form.precio_compra === '') e.precio_compra = 'Requerido'
    if (form.precio_venta === '') e.precio_venta = 'Requerido'
    if (form.stock === '') e.stock = 'Requerido'
    if (form.stock_minimo === '') e.stock_minimo = 'Requerido'
    if (categorias.length === 0) e.categorias = 'Selecciona al menos una categoría'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const onSubmit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!validar()) return
    guardar.mutate()
  }

  return (
    <>
    <Modal
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={editar ? 'Editar producto' : 'Nuevo producto'}
      description={editar ? producto?.sku : 'Completa la información del producto'}
      size="lg"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
          <button type="submit" form="producto-form" className="btn btn-primary" disabled={guardar.isPending}>
            {guardar.isPending && <Loader2 size={14} className="spin" />}
            {editar ? 'Guardar cambios' : 'Crear producto'}
          </button>
        </>
      }
    >
      <form id="producto-form" onSubmit={onSubmit} className="form-grid">
        <Campo label="SKU" req error={errores.sku} hint={skuManual ? 'Editado manualmente' : 'Se genera automáticamente desde el nombre'}>
          <div style={{ display: 'flex', gap: 6 }}>
            <input className="form-input" value={form.sku} onChange={(e) => onSku(e.target.value)} aria-invalid={!!errores.sku} placeholder="ABC-123" style={{ flex: 1 }} />
            <button type="button" className="btn" title="Generar SKU desde el nombre" onClick={regenerarSku} disabled={!form.nombre.trim()}><Wand2 size={14} /></button>
          </div>
        </Campo>
        <Campo label="Código de barras" error={errores.codigo_barras}>
          <input className="form-input" value={form.codigo_barras} onChange={(e) => set('codigo_barras', e.target.value)} aria-invalid={!!errores.codigo_barras} />
        </Campo>

        <Campo label="Nombre" req error={errores.nombre} col2>
          <input className="form-input" value={form.nombre} onChange={(e) => onNombre(e.target.value)} aria-invalid={!!errores.nombre} placeholder="Nombre del producto" />
        </Campo>

        <Campo label="Descripción" error={errores.descripcion} col2>
          <textarea className="form-textarea" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>

        <Campo label="Marca" error={errores.marca}>
          <input className="form-input" value={form.marca} onChange={(e) => set('marca', e.target.value)} />
        </Campo>
        <Campo label="Color" error={errores.color}>
          <input className="form-input" value={form.color} onChange={(e) => set('color', e.target.value)} />
        </Campo>

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

        <div className="form-section-title">Precios e inventario</div>
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

        <div className="form-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><Layers size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Variantes y atributos</span>
          <label className="switch-inline">
            <input type="checkbox" checked={tieneVariantes} onChange={(e) => toggleVariantes(e.target.checked)} />
            <span>Pertenece a un grupo de variantes</span>
          </label>
        </div>
        {tieneVariantes && (
          <div className="col-2 atributos-box">
            {!editar && <CopiarVariante onCopiar={aplicarCopia} />}
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
            {grupoVariante && <div className="muted" style={{ fontSize: 11 }}>Grupo: <code>{grupoVariante}</code></div>}

            {editar && producto && (
              <VariantesVinculadas
                productoId={producto.id}
                sku={form.sku}
                grupo={grupoVariante}
                onGrupoChange={(g) => { setGrupoVariante(g); if (g) setTieneVariantes(true) }}
              />
            )}
            {!editar && (
              <VincularEnCreacion seleccionados={aVincular} onChange={setAVincular} />
            )}
          </div>
        )}

        <div className="form-section-title">Imágenes</div>
        {editar && producto ? (
          <ProductoImagenes productoId={producto.id} imagenes={producto.imagenes ?? []} />
        ) : (
          <ImagenesNuevas files={nuevasImgs} onChange={setNuevasImgs} principal={principalIdx} setPrincipal={setPrincipalIdx} />
        )}
      </form>
    </Modal>

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
