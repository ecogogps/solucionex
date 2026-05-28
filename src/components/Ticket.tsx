'use client';

import React from 'react';
import { QRGenerator } from '@/components/QRGenerator';
import { cn } from '@/lib/utils';

interface TicketProps {
  data: {
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
  };
  className?: string;
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
  'anulado_retornar': 'Anulado - Retornar',
  'no_listo': 'AÚN NO LISTO'
};

export function Ticket({ data, className }: TicketProps) {
  if (!data) return null;

  return (
    <div className={cn("bg-white text-black p-6 font-sans shadow-lg mx-auto w-full max-w-[320px] rounded-sm", className)}>
      <div className="space-y-4">
        {/* Header/Logo Placeholder */}
        <div className="text-center border-b-2 border-black pb-3">
          <div className="text-2xl font-black tracking-tighter">SOLUCIONEX</div>
          <div className="text-[10px] font-bold uppercase">Logística y Distribución</div>
        </div>

        {/* Guía */}
        <div className="text-center bg-gray-100 py-2 border-b border-black">
          <div className="text-[10px] font-bold uppercase">Guía de remisión N°:</div>
          <div className="text-xl font-mono font-bold">#{data.guia_numero}</div>
        </div>

        {/* Datos Principales */}
        <div className="space-y-2 text-[11px]">
          <div className="flex border-b border-gray-200 pb-1">
            <span className="w-16 shrink-0 font-bold uppercase">Empresa:</span>
            <div className="flex flex-col">
              <span className="font-semibold">{data.empresas?.nombre || 'N/A'}</span>
              {data.empresas?.ruc && <span className="text-[9px]">DOC: {data.empresas.ruc}</span>}
            </div>
          </div>

          <div className="flex border-b border-gray-200 pb-1">
            <span className="w-16 shrink-0 font-bold uppercase">Operador:</span>
            <span className="font-semibold">{data.operadores?.nombres || 'No asignado'}</span>
          </div>

          <div className="flex border-b border-gray-200 pb-1">
            <span className="w-16 shrink-0 font-bold uppercase">Paquete:</span>
            <span className="font-semibold capitalize">{data.tipo}</span>
          </div>

          {/* Box valor y pago */}
          <div className="flex items-center gap-2 py-2 px-3 bg-gray-50 border border-black rounded-md mt-2">
            <div className="flex-1">
              <span className="block font-bold uppercase text-[9px]">Valor pedido:</span>
              <span className="text-xl font-black leading-none">${data.valor_pedido}</span>
            </div>
            <div className="flex-1 text-right border-l border-black pl-2">
              <span className="block font-bold uppercase text-[9px]">Pago:</span>
              <span className="text-xs font-bold capitalize">{data.metodo_pago}</span>
            </div>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center pt-2">
            <QRGenerator value={data.id} size={140} />
            <span className="font-bold text-[8px] uppercase mt-1">Escanear para Retiro</span>
          </div>

          {/* Dirección y Teléfono */}
          <div className="pt-2 space-y-2">
            <div>
              <span className="font-bold uppercase text-[9px] block">Dirección:</span>
              <span className="text-xs leading-tight block">{data.direccion}</span>
            </div>
            <div className="text-center border-y border-dashed border-black py-2">
              <span className="font-bold uppercase text-[9px] block">Teléfono:</span>
              <span className="text-base font-black tracking-widest">{data.telefono || 'N/A'}</span>
            </div>
          </div>

          {/* Nota */}
          {data.nota && (
            <div className="bg-gray-50 p-2 border border-gray-200 rounded">
              <span className="font-bold uppercase text-[9px] block mb-1">Nota:</span>
              <div className="text-xs font-bold leading-tight">
                {data.nota.split(/\s*-\s*/).filter(Boolean).map((item, i) => (
                  <div key={i}>- {item.trim()}</div>
                ))}
              </div>
            </div>
          )}

          {/* Estado */}
          <div className="pt-1">
            <span className="font-bold uppercase text-[9px] block mb-1">Estado:</span>
            <div className="text-[10px] font-bold uppercase bg-gray-200 px-2 py-1 rounded text-center">
              {statusMap[data.estado] || data.estado}
            </div>
          </div>

          {data.novedad && (
            <div className="border border-red-200 p-2 bg-red-50">
              <span className="font-bold uppercase text-[9px] text-red-600 block mb-1">Novedad:</span>
              <p className="text-[10px] leading-tight">{data.novedad}</p>
            </div>
          )}
        </div>

        <div className="text-center pt-4 border-t border-gray-100">
          <span className="font-bold text-[9px] uppercase opacity-50">
            Tmax System V1.0
          </span>
        </div>
      </div>
    </div>
  );
}
