import { Modal } from '@/components/ui/Modal'
import { fmtFecha } from '@/lib/format'
import { ACCION_BADGE } from './AuditoriaPage'
import type { Auditoria } from '@/types/auditoria'

function Valores({ titulo, datos }: { titulo: string; datos: Record<string, unknown> | null }) {
  if (!datos || Object.keys(datos).length === 0) return null
  return (
    <div className="form-field col-2">
      <label>{titulo}</label>
      <div style={{ fontSize: 12, background: 'var(--surface-2)', borderRadius: 8, padding: '8px 10px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(datos).map(([k, v]) => (
              <tr key={k}>
                <td style={{ padding: '2px 8px 2px 0', color: 'var(--text-soft)', whiteSpace: 'nowrap', verticalAlign: 'top', fontWeight: 600 }}>{k}</td>
                <td style={{ padding: '2px 0', wordBreak: 'break-word' }}>{v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function DetalleAuditoria({ open, onClose, log }: {
  open: boolean; onClose: () => void; log: Auditoria | null
}) {
  const badge = log ? (ACCION_BADGE[log.accion] ?? { label: log.accion }) : null

  return (
    <Modal open={open} onOpenChange={(o) => !o && onClose()} title="Detalle del registro" size="lg"
      footer={<button type="button" className="btn" onClick={onClose}>Cerrar</button>}>
      {log && (
        <div className="form-grid">
          <div className="form-field">
            <label>Acción</label>
            <div><span className="badge" data-tone={badge?.tone}><span className="b-dot" />{badge?.label}</span></div>
          </div>
          <div className="form-field">
            <label>Módulo</label>
            <div style={{ fontSize: 13, textTransform: 'capitalize' }}>{log.modulo}</div>
          </div>
          <div className="form-field">
            <label>Usuario</label>
            <div style={{ fontSize: 13 }}>{log.usuario_nombre || '—'}{log.usuario_rol ? <span className="muted" style={{ textTransform: 'capitalize' }}> · {log.usuario_rol}</span> : ''}</div>
          </div>
          <div className="form-field">
            <label>Fecha</label>
            <div style={{ fontSize: 13 }}>{fmtFecha(log.created_at, true)}</div>
          </div>
          <div className="form-field">
            <label>Tabla / Registro</label>
            <div style={{ fontSize: 13 }}>{log.tabla ?? '—'}{log.registro_id ? ` #${log.registro_id}` : ''}</div>
          </div>
          <div className="form-field">
            <label>IP</label>
            <div style={{ fontSize: 13 }} className="mono">{log.ip_address ?? '—'}</div>
          </div>

          <div className="form-field col-2">
            <label>Descripción</label>
            <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{log.descripcion || '—'}</div>
          </div>

          <Valores titulo="Valores anteriores" datos={log.valores_anteriores} />
          <Valores titulo="Valores nuevos" datos={log.valores_nuevos} />
        </div>
      )}
    </Modal>
  )
}
