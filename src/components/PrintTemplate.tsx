'use client';

import React from 'react';
import Image from 'next/image';
import { QRGenerator } from '@/components/QRGenerator';

interface PaquetePrintData {
  id: string;
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  telefono: string;
  valor_pedido: number;
  metodo_pago: string;
  nota?: string;
  novedad?: string;
  empresas?: { nombre: string; direccion?: string; ruc?: string };
  operadores?: { nombres: string };
  created_at?: string; // Campo para fecha y hora de creación
}

const statusMap: Record<string, string> = {
  'pedido_listo': 'PEDIDO LISTO',
  'entregado': 'ENTREGADO CON EXITO',
  'entregado_novedad': 'ENTREGADO CON NOVEDAD',
  'en_ruta': 'En Transito a Destino',
  'llegado': 'Paquete llego al Destino',
  'camino_a_retirar': 'Estoy en camino a retirar',
  'llegado_a_origen': 'Llegado a origen',
  'paquete_retirado': 'Paquete retirado de origen',
  'demorado_despacho': 'Demorado Despacho',
  'demorado_operador': 'Demorado Operador',
  'buscando_operador': 'Buscando Operador',
  'pendiente': 'Pendiente',
  'cancelado': 'No ejecutado',
  'anulado_retornar': 'Anulado - Retornar'
};

// Función auxiliar para dar formato de fecha DD/MM/AAAA HH:MM
function formatFecha(fechaStr?: string): string {
  if (!fechaStr) return '';
  try {
    const fecha = new Date(fechaStr);
    if (isNaN(fecha.getTime())) return fechaStr;

    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const horas = String(fecha.getHours()).padStart(2, '0');
    const minutos = String(fecha.getMinutes()).padStart(2, '0');

    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  } catch {
    return fechaStr;
  }
}

export function PrintTemplate({ data }: { data: PaquetePrintData }) {
  if (!data) return null;

  const fechaFormateada = formatFecha(data.created_at);

  return (
    <>
      <style type="text/css" media="print">
        {`
          @page {
            size: 80mm auto;
            margin: 0mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 80mm !important;
            height: auto !important;
          }
          body * {
            visibility: hidden;
          }
          #ticket-impresion, #ticket-impresion * {
            visibility: visible;
          }
          #ticket-impresion {
            display: block !important;
            position: relative !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-inside: avoid;
            overflow: visible !important;
          }
          #ticket-impresion > div {
            page-break-inside: avoid;
          }
          /* Forzar que la imagen del logo se imprima correctamente */
          #ticket-impresion img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        `}
      </style>

      <div
        id="ticket-impresion"
        className="hidden print:block bg-white text-black font-sans"
        style={{ width: '80mm', padding: '4mm 2mm' }}
      >
        <div className="space-y-4">

          {/* Logo */}
          <div className="flex justify-center items-center border-b-2 border-black pb-2">
            <Image
              src="/logo/impresion logo.png"
              alt="Solucionex"
              width={200}
              height={80}
              style={{
                width: '45mm',
                height: 'auto',
                objectFit: 'contain',
              }}
              priority
            />
          </div>

          <div className="text-center pt-3">
          <span className="font-bold text-[11px] text-black">
            Desarrollado por Tmax System V 1.1.1
          </span>
        </div>

          {/* Guía de Remisión */}
          <div className="flex flex-col text-center bg-gray-100 p-2 border-b border-black">
            <span className="text-xs font-bold uppercase text-black">Guía de remisión N°:</span>
            <span className="text-2xl font-mono font-bold mt-1 text-black">#{data.guia_numero}</span>
            {fechaFormateada && (
              <div className="mt-1 pt-1 border-t border-dashed border-gray-400">
                <span className="block text-[9px] font-bold uppercase text-black">Emisión de Guía:</span>
                <span className="block text-xs font-semibold text-black">{fechaFormateada}</span>
              </div>
            )}
          </div>

          {/* Datos Principales */}
          <div className="flex flex-col gap-3 text-sm">
            <div className="space-y-2">
              <div className="flex border-b border-gray-300 pb-1">
                <span className="w-[90px] shrink-0 font-bold uppercase text-[11px] text-black">Origen:</span>
                <div className="flex flex-col">
                  <span className="font-semibold text-xs leading-tight break-words text-black">{data.empresas?.nombre || 'N/A'}</span>
                  {data.empresas?.direccion && (
                    <span className="text-[10px] leading-tight break-words text-black">{data.empresas.direccion}</span>
                  )}
                  {data.empresas?.ruc && (
                    <span className="text-[10px] leading-tight break-words text-black">DOCUMENTO: {data.empresas.ruc}</span>
                  )}
                </div>
              </div>

              <div className="flex border-b border-gray-300 pb-1">
                <span className="w-[90px] shrink-0 font-bold uppercase text-[11px] text-black">Paquete:</span>
                <span className="font-semibold text-xs capitalize leading-tight break-words text-black">{data.tipo}</span>
              </div>

              {/* Box valor y pago */}
              <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 border border-black rounded-lg mt-3">
                <div className="flex-1">
                  <span className="block font-bold uppercase text-[10px] text-black">Valor pedido:</span>
                  <span className="text-2xl font-black leading-none mt-1 text-black">${data.valor_pedido}</span>
                </div>
                <div className="flex-1 text-right border-l border-black pl-2">
                  <span className="block font-bold uppercase text-[10px] text-black">Pago:</span>
                  <span className="text-sm font-bold capitalize mt-1 block text-black">{data.metodo_pago}</span>
                </div>
              </div>

              {/* QR Code - Nueva Ubicación */}
              <div className="flex flex-col items-center pt-2 mt-1">
                <QRGenerator value={data.id} size={140} />
                <span className="font-bold text-[9px] uppercase text-black mt-1">Escanear para Retiro</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* Dirección */}
              <div className="flex flex-col">
                <span className="font-bold uppercase text-[11px] text-black mb-0.5">Destino:</span>
                <span className="text-sm font-medium leading-tight text-black">{data.direccion}</span>
              </div>

              {/* Operador (Ubicación actualizada abajo de Dirección) */}
              <div className="flex flex-col border-t border-gray-200 pt-2">
                <span className="font-bold uppercase text-[11px] text-black mb-0.5">Operador:</span>
                <span className="text-sm font-semibold leading-tight text-black">
                  {data.operadores?.nombres || 'No asignado'}
                </span>
              </div>

              {/* Nota */}
              {data.nota && (
                <div className="flex flex-col bg-gray-50 p-2 rounded border border-gray-200">
                  <span className="font-bold uppercase text-[11px] text-black mb-0.5">Nota:</span>
                  <ul className="list-none p-0 m-0">
                    {data.nota
                      .split(/\s*-\s*/)
                      .filter(Boolean)
                      .map((item, i) => (
                        <li key={i} className="font-bold text-base leading-tight text-black">
                          - {item.trim()}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Estado */}
              <div className="flex flex-col border-b border-gray-300 pb-2">
                <span className="font-bold uppercase text-[11px] text-black mb-1">Estado del paquete:</span>
                <span className="font-bold uppercase bg-gray-200 px-2 py-1 rounded text-xs text-center text-black">
                  {statusMap[data.estado] || data.estado}
                </span>
              </div>

              {/* Novedad */}
              {data.novedad && (
                <div className="flex flex-col border border-red-200 p-2 bg-red-50">
                  <span className="font-bold uppercase text-[11px] text-red-600 mb-0.5">Novedad:</span>
                  <p className="font-medium text-xs leading-tight text-black">{data.novedad}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        
        {/* Espacio para la cuchilla */}
        <div style={{ height: '12mm' }}></div>
      </div>
    </>
  );
}
