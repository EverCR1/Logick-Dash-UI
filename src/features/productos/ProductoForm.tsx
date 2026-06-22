import { useState, useEffect, useRef, useMemo, type ReactNode, type FormEvent } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2, Star, Trash2, ImagePlus, Wand2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { ProductoImagenes } from './ProductoImagenes'
import { productosApi, catalogosApi } from '@/lib/api'
import { generarSkuDesdeNombre } from '@/lib/sku'
import type { Producto } from '@/types/producto'

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
    notas_internas: '', proveedor_id: p.proveedor_id ? String(p.proveedor_id) : '', estado: p.estado,
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
  }, [open, producto])

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
        categorias,
      }
      if (editar) return productosApi.actualizar(producto!.id, payload)
      // Crear: primero el producto, luego subir las imágenes seleccionadas
      const creado = await productosApi.crear(payload)
      if (nuevasImgs.length) {
        const subidas = await productosApi.subirImagenes(creado.id, nuevasImgs)
        const elegida = subidas[principalIdx] ?? subidas[0]
        if (elegida) await productosApi.imagenPrincipal(creado.id, elegida.id)
      }
      return creado
    },
    onSuccess: () => {
      toast.success(editar ? 'Producto actualizado' : 'Producto creado')
      queryClient.invalidateQueries({ queryKey: ['productos'] })
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

        <Campo label="Marca" error={errores.marca}>
          <input className="form-input" value={form.marca} onChange={(e) => set('marca', e.target.value)} />
        </Campo>
        <Campo label="Color" error={errores.color}>
          <input className="form-input" value={form.color} onChange={(e) => set('color', e.target.value)} />
        </Campo>

        <Campo label="Proveedor" req error={errores.proveedor_id}>
          <Select
            value={form.proveedor_id}
            onValueChange={(v) => set('proveedor_id', v)}
            placeholder="Seleccionar…"
            options={proveedores.map((p) => ({ value: String(p.id), label: p.nombre }))}
          />
        </Campo>
        <Campo label="Estado" req error={errores.estado}>
          <Select value={form.estado} onValueChange={(v) => set('estado', v)}
            options={[{ value: 'activo', label: 'Activo' }, { value: 'inactivo', label: 'Inactivo' }]} />
        </Campo>

        <Campo label="Categorías" req error={errores.categorias} col2>
          <MultiSelect
            options={opcionesCat.map((c) => ({ value: c.id, label: c.nombre }))}
            selected={categorias}
            onChange={(s) => { setCategorias(s); setErrores((e) => ({ ...e, categorias: '' })) }}
            placeholder="Seleccionar categorías…"
          />
        </Campo>

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
        <Campo label="Descripción" error={errores.descripcion} col2>
          <textarea className="form-textarea" value={form.descripcion} onChange={(e) => set('descripcion', e.target.value)} />
        </Campo>
        <Campo label="Especificaciones" error={errores.especificaciones} col2>
          <textarea className="form-textarea" value={form.especificaciones} onChange={(e) => set('especificaciones', e.target.value)} />
        </Campo>

        <div className="form-section-title">Imágenes</div>
        {editar && producto ? (
          <ProductoImagenes productoId={producto.id} imagenes={producto.imagenes ?? []} />
        ) : (
          <ImagenesNuevas files={nuevasImgs} onChange={setNuevasImgs} principal={principalIdx} setPrincipal={setPrincipalIdx} />
        )}
      </form>
    </Modal>
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
