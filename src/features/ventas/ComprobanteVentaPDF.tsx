import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { brand } from '@/config/brand'
import { ESTADO_VENTA, METODO_LABEL, METODO_COLOR_PDF } from './venta-estados'
import type { Venta } from '@/types/venta'

const C = {
  text: '#18181b', muted: '#71717a', faint: '#a1a1aa',
  border: '#e4e4e7', soft: '#f4f4f5', white: '#ffffff',
  accent: '#15803d', accentSoft: '#f0fdf4',
  neg: '#dc2626',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: C.text, paddingTop: 0, paddingBottom: 40, paddingHorizontal: 0, backgroundColor: C.white },

  header: { paddingVertical: 24, paddingHorizontal: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: C.accent },
  logo: { width: 240, height: 84, objectFit: 'contain' },
  empresaTxt: { fontSize: 8.5, color: C.muted, lineHeight: 1.5 },
  empresaRazon: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 2 },
  docTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.accent, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  docNum: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.text, textAlign: 'right', marginTop: 3 },
  docFecha: { fontSize: 9, color: C.muted, textAlign: 'right', marginTop: 3 },

  body: { paddingHorizontal: 44, paddingTop: 22 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  chip: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9, fontSize: 8.5, color: C.muted },
  chipOk: { backgroundColor: C.accentSoft, borderColor: '#bbf7d0', color: C.accent, fontFamily: 'Helvetica-Bold' },

  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoCard: { flex: 1, backgroundColor: C.soft, borderRadius: 6, padding: 12 },
  infoLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.faint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 10.5, color: C.text },

  seccion: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },

  th: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 10, marginBottom: 2 },
  thTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  cNo: { width: 24, fontSize: 9, color: C.faint },
  cDesc: { flex: 1 },
  cDescTxt: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text },
  cDescSub: { fontSize: 8, color: C.faint, marginTop: 2, textTransform: 'capitalize' },
  cCant: { width: 50, textAlign: 'center', fontSize: 10 },
  cPrecio: { width: 80, textAlign: 'right', fontSize: 10, color: C.muted },
  cDesc2: { width: 70, textAlign: 'right', fontSize: 10, color: C.muted },
  cTotal: { width: 80, textAlign: 'right', fontSize: 10, fontFamily: 'Helvetica-Bold', color: C.text },

  totales: { marginTop: 16, marginLeft: 'auto', width: 240 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totLabel: { fontSize: 10, color: C.muted },
  totVal: { fontSize: 10, color: C.text },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 9, marginTop: 4, borderTopWidth: 1.5, borderTopColor: C.accent },
  grandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.text },
  grandVal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.accent },

  obs: { marginTop: 22, backgroundColor: C.soft, borderRadius: 6, padding: 12 },
  obsLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.faint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  obsTxt: { fontSize: 9.5, color: C.text, lineHeight: 1.5 },

  footer: { position: 'absolute', bottom: 24, left: 44, right: 44, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, alignItems: 'center' },
  footerTxt: { fontSize: 8, color: C.faint, textAlign: 'center' },
})

const fmt = (n: number | string) => 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fechaStr = (s?: string | null) => s ? new Date(s).toLocaleString('es-GT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export function ComprobanteVentaPDF({ venta }: { venta: Venta }) {
  const estado = ESTADO_VENTA[venta.estado]
  const metodoColor = METODO_COLOR_PDF[venta.metodo_pago] ?? { bg: C.soft, text: C.muted }
  return (
    <Document title={`Comprobante ${venta.numero_venta}`} author={brand.name}>
      <Page size="LETTER" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Image style={s.logo} src={window.location.origin + brand.logo} />
          <View>
            <Text style={s.docTitle}>Comprobante de pago</Text>
            <Text style={s.docNum}>{venta.numero_venta}</Text>
            <Text style={s.docFecha}>{fechaStr(venta.created_at)}</Text>
          </View>
        </View>

        <View style={s.body}>
          {/* Chips */}
          <View style={s.chips}>
            <Text style={[s.chip, estado?.tone === 'pos' ? s.chipOk : {}]}>{estado?.label ?? venta.estado}</Text>
            <Text style={[s.chip, { backgroundColor: metodoColor.bg, borderColor: metodoColor.bg, color: metodoColor.text, fontFamily: 'Helvetica-Bold' }]}>{METODO_LABEL[venta.metodo_pago] ?? venta.metodo_pago}</Text>
          </View>

          {/* Info cliente */}
          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{venta.cliente?.nombre ?? 'Consumidor final'}</Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>NIT</Text>
              <Text style={s.infoValue}>{venta.cliente?.nit ?? 'C/F'}</Text>
            </View>
          </View>

          {/* Items */}
          <Text style={s.seccion}>Detalle</Text>
          <View style={s.th}>
            <Text style={[s.thTxt, s.cNo]}>No.</Text>
            <Text style={[s.thTxt, s.cDesc]}>Descripción</Text>
            <Text style={[s.thTxt, s.cCant]}>Cant.</Text>
            <Text style={[s.thTxt, s.cPrecio]}>Precio</Text>
            <Text style={[s.thTxt, s.cDesc2]}>Desc.</Text>
            <Text style={[s.thTxt, s.cTotal]}>Total</Text>
          </View>
          {venta.detalles.map((d, i) => (
            <View key={i} style={s.row}>
              <Text style={s.cNo}>{i + 1}</Text>
              <View style={s.cDesc}>
                <Text style={s.cDescTxt}>{d.descripcion}</Text>
                <Text style={s.cDescSub}>{d.tipo}</Text>
              </View>
              <Text style={s.cCant}>{d.cantidad}</Text>
              <Text style={s.cPrecio}>{fmt(d.precio_unitario)}</Text>
              <Text style={s.cDesc2}>{Number(d.descuento) > 0 ? fmt(d.descuento) : '—'}</Text>
              <Text style={s.cTotal}>{fmt(d.total)}</Text>
            </View>
          ))}

          {/* Totales */}
          <View style={s.totales}>
            <View style={s.totRow}><Text style={s.totLabel}>Subtotal</Text><Text style={s.totVal}>{fmt(venta.subtotal)}</Text></View>
            {Number(venta.descuento_total) > 0 && (
              <View style={s.totRow}><Text style={[s.totLabel, { color: C.neg }]}>Descuento</Text><Text style={[s.totVal, { color: C.neg }]}>- {fmt(venta.descuento_total)}</Text></View>
            )}
            <View style={s.grandRow}><Text style={s.grandLabel}>Total</Text><Text style={s.grandVal}>{fmt(venta.total)}</Text></View>
          </View>

          {/* Observaciones */}
          {venta.observaciones ? (
            <View style={s.obs}>
              <Text style={s.obsLabel}>Observaciones</Text>
              <Text style={s.obsTxt}>{venta.observaciones}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{brand.empresa.razon} · {brand.empresa.direccion} · WhatsApp {brand.empresa.whatsapp}</Text>
          <Text style={[s.footerTxt, { marginTop: 2, fontFamily: 'Helvetica-Bold', color: C.muted }]}>{brand.empresa.lema}</Text>
        </View>
      </Page>
    </Document>
  )
}
