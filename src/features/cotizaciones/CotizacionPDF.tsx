import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { brand } from '@/config/brand'
import { estadoVisible, diasRestantes } from './cotizacion-estados'
import type { Cotizacion } from '@/types/cotizacion'

const C = {
  text: '#18181b', muted: '#71717a', faint: '#a1a1aa',
  border: '#e4e4e7', soft: '#f4f4f5', white: '#ffffff',
  accent: '#15803d', accentSoft: '#f0fdf4',
  warn: '#b45309', warnSoft: '#fffbeb',
  neg: '#dc2626',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: C.text, paddingTop: 0, paddingBottom: 46, paddingHorizontal: 0, backgroundColor: C.white },

  header: { paddingVertical: 24, paddingHorizontal: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: C.accent },
  logo: { width: 240, height: 84, objectFit: 'contain' },
  docTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.accent, textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5 },
  docNum: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.text, textAlign: 'right', marginTop: 3 },
  docFecha: { fontSize: 9, color: C.muted, textAlign: 'right', marginTop: 3 },

  body: { paddingHorizontal: 40, paddingTop: 20 },

  chips: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { backgroundColor: C.soft, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 9, fontSize: 8.5, color: C.muted },
  chipVigente: { backgroundColor: C.accentSoft, borderColor: '#bbf7d0', color: C.accent, fontFamily: 'Helvetica-Bold' },
  chipVencida: { backgroundColor: C.warnSoft, borderColor: '#fde68a', color: C.warn, fontFamily: 'Helvetica-Bold' },

  infoGrid: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  infoCard: { flex: 1, backgroundColor: C.soft, borderRadius: 6, padding: 12 },
  infoLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.faint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  infoValue: { fontSize: 10.5, color: C.text },

  seccion: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },

  th: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.soft, borderRadius: 4, paddingVertical: 7, paddingHorizontal: 8, marginBottom: 2 },
  thTxt: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },

  cImg: { width: 42 },
  foto: { width: 34, height: 34, objectFit: 'contain', borderRadius: 3 },
  /* Recuadro dibujado, no una imagen: un placeholder que se descarga puede
     fallar justo cuando algo ya falló. */
  sinFoto: { width: 34, height: 34, borderRadius: 3, borderWidth: 1, borderColor: C.border, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  sinFotoTxt: { fontSize: 5.5, color: C.faint, textAlign: 'center', letterSpacing: 0.2 },

  cDesc: { flex: 1, paddingRight: 8 },
  cDescTxt: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.text },
  cDescSub: { fontSize: 7.5, color: C.faint, marginTop: 2, textTransform: 'capitalize' },
  cCant: { width: 40, textAlign: 'center', fontSize: 9.5 },
  cPrecio: { width: 68, textAlign: 'right', fontSize: 9.5, color: C.muted },
  cDesc2: { width: 60, textAlign: 'right', fontSize: 9.5, color: C.muted },
  cTotal: { width: 72, textAlign: 'right', fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: C.text },

  totales: { marginTop: 16, marginLeft: 'auto', width: 240 },
  totRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totLabel: { fontSize: 10, color: C.muted },
  totVal: { fontSize: 10, color: C.text },
  grandRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 9, marginTop: 4, borderTopWidth: 1.5, borderTopColor: C.accent },
  grandLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.text },
  grandVal: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.accent },

  obs: { marginTop: 20, backgroundColor: C.soft, borderRadius: 6, padding: 12 },
  obsLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.faint, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  obsTxt: { fontSize: 9.5, color: C.text, lineHeight: 1.5 },

  aviso: { marginTop: 14, borderLeftWidth: 2, borderLeftColor: C.warn, backgroundColor: C.warnSoft, borderRadius: 3, paddingVertical: 9, paddingHorizontal: 11 },
  avisoTxt: { fontSize: 8.5, color: C.warn, lineHeight: 1.5 },

  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, alignItems: 'center' },
  footerTxt: { fontSize: 8, color: C.faint, textAlign: 'center' },
})

const fmt = (n: number | string) => 'Q' + Number(n || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fechaCorta = (iso?: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'

interface Props {
  cotizacion: Cotizacion
  /** id de línea → data URL en PNG. Lo resuelve `resolverImagenes()` antes de renderizar. */
  imagenes: Record<number, string>
}

export function CotizacionPDF({ cotizacion: c, imagenes }: Props) {
  const badge = estadoVisible(c)
  const dias = diasRestantes(c.valido_hasta)
  const vencida = c.esta_vencida
  const clienteNombre = c.cliente?.nombre ?? c.nombre_cliente ?? 'Sin especificar'

  return (
    <Document title={`Cotización ${c.numero_cotizacion}`} author={brand.name}>
      <Page size="LETTER" style={s.page}>

        <View style={s.header}>
          <Image style={s.logo} src={window.location.origin + brand.logo} />
          <View>
            <Text style={s.docTitle}>Cotización</Text>
            <Text style={s.docNum}>{c.numero_cotizacion}</Text>
            <Text style={s.docFecha}>{fechaCorta(c.created_at)}</Text>
          </View>
        </View>

        <View style={s.body}>

          <View style={s.chips}>
            <Text style={[s.chip, vencida ? s.chipVencida : s.chipVigente]}>
              {vencida ? 'Vencida' : badge.label}
            </Text>
            <Text style={s.chip}>
              {vencida
                ? `Venció el ${fechaCorta(c.valido_hasta)}`
                : dias === 0 ? 'Válida solo hoy' : `Válida ${dias} día${dias === 1 ? '' : 's'} más`}
            </Text>
          </View>

          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Cliente</Text>
              <Text style={s.infoValue}>{clienteNombre}</Text>
            </View>
            <View style={s.infoCard}>
              <Text style={s.infoLabel}>Válida hasta</Text>
              <Text style={s.infoValue}>{fechaCorta(c.valido_hasta)}</Text>
            </View>
          </View>

          <Text style={s.seccion}>Detalle</Text>
          <View style={s.th}>
            <Text style={[s.thTxt, s.cImg]} />
            <Text style={[s.thTxt, s.cDesc]}>Descripción</Text>
            <Text style={[s.thTxt, s.cCant]}>Cant.</Text>
            <Text style={[s.thTxt, s.cPrecio]}>Precio</Text>
            <Text style={[s.thTxt, s.cDesc2]}>Desc.</Text>
            <Text style={[s.thTxt, s.cTotal]}>Total</Text>
          </View>

          {c.detalles.map((d) => (
            // wrap={false} evita que una fila se parta entre dos páginas y deje
            // la foto arriba y el precio abajo
            <View key={d.id} style={s.row} wrap={false}>
              <View style={s.cImg}>
                {imagenes[d.id] ? (
                  <Image style={s.foto} src={imagenes[d.id]} />
                ) : (
                  <View style={s.sinFoto}>
                    <Text style={s.sinFotoTxt}>sin{'\n'}imagen</Text>
                  </View>
                )}
              </View>
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

          <View style={s.totales}>
            <View style={s.totRow}><Text style={s.totLabel}>Subtotal</Text><Text style={s.totVal}>{fmt(c.subtotal)}</Text></View>
            {Number(c.descuento_total) > 0 && (
              <View style={s.totRow}><Text style={[s.totLabel, { color: C.neg }]}>Descuento</Text><Text style={[s.totVal, { color: C.neg }]}>- {fmt(c.descuento_total)}</Text></View>
            )}
            <View style={s.grandRow}><Text style={s.grandLabel}>Total</Text><Text style={s.grandVal}>{fmt(c.total)}</Text></View>
          </View>

          {c.observaciones ? (
            <View style={s.obs}>
              <Text style={s.obsLabel}>Observaciones</Text>
              <Text style={s.obsTxt}>{c.observaciones}</Text>
            </View>
          ) : null}

          <View style={s.aviso}>
            <Text style={s.avisoTxt}>
              Este documento es una cotización, no un comprobante de pago ni una factura.
              Los precios son válidos hasta el {fechaCorta(c.valido_hasta)} y están sujetos
              a disponibilidad de existencias al momento de confirmar el pedido.
            </Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{brand.empresa.razon} · {brand.empresa.direccion} · WhatsApp {brand.empresa.whatsapp}</Text>
          <Text style={[s.footerTxt, { marginTop: 2, fontFamily: 'Helvetica-Bold', color: C.muted }]}>{brand.empresa.lema}</Text>
        </View>
      </Page>
    </Document>
  )
}
