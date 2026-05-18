import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vcpfjtazrgfpzwjlaqlk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcGZqdGF6cmdmcHp3amxhcWxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzM4ODQwOCwiZXhwIjoyMDkyOTY0NDA4fQ.-gfqPoG-3b4AfpEVzr2TMoIjbqk1miCla3StDNMadUs'
)

const BUCKET = 'paquetes'
const CARPETAS = ['image-metodo', 'image-paquete-retirado', 'images', 'paquete-entregado-novedad', 'paquete-entregado']
const FECHA_LIMITE = new Date('2026-05-14T00:00:00Z') // conserva desde el 14 en adelante

async function eliminarImagenesAntiguas() {
  for (const carpeta of CARPETAS) {
    let offset = 0
    const LIMIT = 100

    while (true) {
      const { data: archivos, error } = await supabase.storage
        .from(BUCKET)
        .list(carpeta, { limit: LIMIT, offset })

      if (error) { console.error(`Error listando ${carpeta}:`, error); break }
      if (!archivos || archivos.length === 0) break

      // Filtrar solo archivos anteriores al 14/05/2026
      const antiguos = archivos.filter(f => {
        const fecha = new Date(f.created_at)
        return fecha < FECHA_LIMITE
      })

      if (antiguos.length > 0) {
        const paths = antiguos.map(f => `${carpeta}/${f.name}`)
        const { error: delError } = await supabase.storage.from(BUCKET).remove(paths)
        if (delError) console.error(`Error borrando en ${carpeta}:`, delError)
        else console.log(`✅ ${paths.length} archivos eliminados de ${carpeta}`)
      } else {
        console.log(`⏭️ Sin archivos antiguos en ${carpeta}`)
      }

      if (archivos.length < LIMIT) break
      offset += LIMIT
    }
  }

  console.log('🏁 Listo')
}

eliminarImagenesAntiguas()
