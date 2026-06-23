import { supabase } from './supabase';

/**
 * Genera una URL firmada de 1 hora de validez para un comprobante en el bucket privado.
 * Si el path ya contiene un protocolo absoluto (http/https), lo retorna de forma directa.
 */
export async function getSignedComprobanteUrl(path: string): Promise<string> {
  if (!path) {
    throw new Error("El path del comprobante está vacío.");
  }

  // Soporte para URLs completas heredadas
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const { data, error } = await supabase.storage
    .from('comprobantes-billetera')
    .createSignedUrl(path, 3600); // 1 hora de validez

  if (error) throw error;
  if (!data?.signedUrl) {
    throw new Error("No se pudo resolver la URL firmada del archivo.");
  }

  return data.signedUrl;
}
