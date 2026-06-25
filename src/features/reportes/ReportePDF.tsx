import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { brand } from '@/config/brand'

export interface ReporteColumna { label: string; align?: 'right' }
export interface ReporteTabla { titulo?: string; columnas: ReporteColumna[]; filas: (string | number)[][] }
export interface ReporteKpi { label: string; value: string }
export interface ReporteExportData { titulo: string; rango?: string; kpis?: ReporteKpi[]; tablas: ReporteTabla[] }

const C = {
  text: '#18181b', muted: '#71717a', faint: '#a1a1aa',
  border: '#e4e4e7', soft: '#f4f4f5', white: '#ffffff', accent: '#15803d',
}

const s = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.text, paddingTop: 28, paddingBottom: 40, paddingHorizontal: 40, backgroundColor: C.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: C.accent, paddingBottom: 14, marginBottom: 16 },
  logo: { width: 150, height: 50, objectFit: 'contain' },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.text, textAlign: 'right' },
  docRango: { fontSize: 9, color: C.muted, textAlign: 'right', marginTop: 3 },
  docGen: { fontSize: 8, color: C.faint, textAlign: 'right', marginTop: 2 },

  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  kpi: { borderWidth: 1, borderColor: C.border, borderRadius: 6, padding: 8, minWidth: 110, backgroundColor: C.soft },
  kpiLabel: { fontSize: 7.5, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  kpiValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: C.text },

  tablaTitulo: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 8, marginBottom: 6 },
  th: { flexDirection: 'row', backgroundColor: C.soft, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8 },
  thTxt: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.faint, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  cell: { fontSize: 8.5 },
  footer: { position: 'absolute', bottom: 22, left: 40, right: 40, borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt: { fontSize: 7.5, color: C.faint },
})

function Tabla({ tabla }: { tabla: ReporteTabla }) {
  return (
    <View wrap>
      {tabla.titulo && <Text style={s.tablaTitulo}>{tabla.titulo}</Text>}
      <View style={s.th} fixed>
        {tabla.columnas.map((c, i) => (
          <Text key={i} style={[s.thTxt, { flex: c.align === 'right' ? 0.8 : 1.4, textAlign: c.align ?? 'left' }]}>{c.label}</Text>
        ))}
      </View>
      {tabla.filas.map((fila, r) => (
        <View key={r} style={s.row} wrap={false}>
          {fila.map((val, i) => {
            const col = tabla.columnas[i]
            return <Text key={i} style={[s.cell, { flex: col?.align === 'right' ? 0.8 : 1.4, textAlign: col?.align ?? 'left' }]}>{String(val)}</Text>
          })}
        </View>
      ))}
    </View>
  )
}

export function ReportePDF({ data }: { data: ReporteExportData }) {
  const generado = new Date().toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' })
  return (
    <Document title={data.titulo} author={brand.name}>
      <Page size="LETTER" style={s.page}>
        <View style={s.header} fixed>
          <Image style={s.logo} src={window.location.origin + brand.logo} />
          <View>
            <Text style={s.docTitle}>{data.titulo}</Text>
            {data.rango && <Text style={s.docRango}>{data.rango}</Text>}
            <Text style={s.docGen}>Generado: {generado}</Text>
          </View>
        </View>

        {data.kpis && data.kpis.length > 0 && (
          <View style={s.kpis}>
            {data.kpis.map((k, i) => (
              <View key={i} style={s.kpi}>
                <Text style={s.kpiLabel}>{k.label}</Text>
                <Text style={s.kpiValue}>{k.value}</Text>
              </View>
            ))}
          </View>
        )}

        {data.tablas.map((t, i) => <Tabla key={i} tabla={t} />)}

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>{brand.empresa.razon}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
