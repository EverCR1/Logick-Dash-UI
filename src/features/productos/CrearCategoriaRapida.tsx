import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { categoriasApi, catalogosApi } from '@/lib/api'
import type { Categoria } from '@/types/categoria'

const SIN_PADRE = 'none'

export function CrearCategoriaRapida({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: (c: Categoria) => void
}) {
  const queryClient = useQueryClient()
  const [nombre, setNombre] = useState('')
  const [parent, setParent] = useState(SIN_PADRE)
  const [error, setError] = useState('')

  useEffect(() => { if (open) { setNombre(''); setParent(SIN_PADRE); setError('') } }, [open])

  const { data: opcionesCat = [] } = useQuery({
    queryKey: ['categorias-opciones'], queryFn: catalogosApi.categorias, staleTime: 1000 * 60 * 10, enabled: open,
  })
  const opcionesPadre = [
    { value: SIN_PADRE, label: 'Sin categoría padre (nivel 0)' },
    ...opcionesCat.map((c) => ({ value: String(c.id), label: '— '.repeat(c.nivel) + c.nombre })),
  ]

  const guardar = useMutation({
    mutationFn: () => categoriasApi.crear({ nombre: nombre.trim(), descripcion: null, parent_id: parent !== SIN_PADRE ? Number(parent) : null, estado: 'activo' }),
    onSuccess: (cat) => {
      toast.success('Categoría creada')
      queryClient.invalidateQueries({ queryKey: ['categorias-opciones'] })
      onCreated(cat)
      onClose()
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        const e = err.response.data?.errors as Record<string, string[]> | undefined
        setError(e?.nombre?.[0] ?? 'Revisa los datos')
      } else toast.error('No se pudo crear la categoría')
    },
  })

  const submit = () => { if (!nombre.trim()) { setError('El nombre es obligatorio'); return } guardar.mutate() }

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Nueva categoría" description="Crea una categoría sin salir del formulario"
      footer={<>
        <button type="button" className="btn" onClick={onClose} disabled={guardar.isPending}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 size={14} className="spin" />} Guardar
        </button>
      </>}>
      <div className="form-grid">
        <div className="form-field col-2">
          <label>Nombre <span className="req"> *</span></label>
          <input className="form-input" value={nombre} autoFocus
            onChange={(e) => { setNombre(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
            placeholder="Nombre de la categoría" />
          {error && <span className="form-error">{error}</span>}
        </div>
        <div className="form-field col-2">
          <label>Categoría padre</label>
          <Select value={parent} onValueChange={setParent} options={opcionesPadre} />
        </div>
      </div>
    </Modal>
  )
}
