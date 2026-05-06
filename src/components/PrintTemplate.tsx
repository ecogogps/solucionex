'use client';

import React from 'react';

interface PaquetePrintData {
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  telefono: string;
  valor_pedido: number;
  metodo_pago: string;
  nota?: string;
  novedad?: string;
  empresas?: { nombre: string };
  operadores?: { nombres: string };
}

const statusMap: Record<string, string> = {
  'pedido_listo': 'PEDIDO LISTO',
  'entregado': 'ENTREGADO CON EXITO',
  'entregado_novedad': 'ENTREGADO CON NOVEDAD',
  'en_ruta': 'En Transito a Destino',
  'llegado': 'Paquete llego al Destino',
  'camino_a_retirar': 'Estoy en camino a retirar',
  'llegado_a_origen': 'Llegado a Origen',
  'paquete_retirado': 'Paquete retirado de origen',
  'demorado_despacho': 'Demorado Despacho',
  'demorado_operador': 'Demorado Operador',
  'buscando_operador': 'Buscando Operador',
  'pendiente': 'Pendiente',
  'cancelado': 'No ejecutado',
  'anulado_retornar': 'Anulado - Retornar'
};

export function PrintTemplate({ data }: { data: PaquetePrintData }) {
  if (!data) return null;

  return (
    <div className="hidden print:block p-12 bg-white text-black min-h-screen font-sans">
      <div className="border-4 border-black p-8 space-y-8">
        {/* Marca */}
        <div className="text-center border-b-4 border-black pb-6">
          <h1 className="text-5xl font-black tracking-tighter">SOLUCIONEX</h1>
        </div>

        {/* Guía de Remisión */}
        <div className="flex justify-between items-center bg-gray-100 p-4 border-b-2 border-black">
          <span className="text-xl font-bold uppercase">Guía de remisión N°:</span>
          <span className="text-3xl font-mono font-bold">#{data.guia_numero}</span>
        </div>

        {/* Datos Principales */}
        <div className="grid grid-cols-1 gap-6 text-lg">
          <div className="space-y-4">
            <div className="flex border-b border-gray-300 pb-2">
              <span className="w-48 font-bold uppercase text-sm text-gray-600">Nombre de la Empresa:</span>
              <span className="font-semibold">{data.empresas?.nombre || 'N/A'}</span>
            </div>
            
            <div className="flex border-b border-gray-300 pb-2">
              <span className="w-48 font-bold uppercase text-sm text-gray-600">Nombre del Operador:</span>
              <span className="font-semibold">{data.operadores?.nombres || 'No asignado'}</span>
            </div>

            <div className="flex border-b border-gray-300 pb-2">
              <span className="w-48 font-bold uppercase text-sm text-gray-600">Tipo de Paquete:</span>
              <span className="font-semibold capitalize">{data.tipo}</span>
            </div>

            <div className="flex items-center gap-4 py-4 px-6 bg-gray-50 border-2 border-black rounded-lg">
              <div className="flex-1">
                <span className="block font-bold uppercase text-xs text-gray-500">Valor del pedido:</span>
                <span className="text-4xl font-black">${data.valor_pedido}</span>
              </div>
              <div className="flex-1 text-right border-l-2 border-black pl-4">
                <span className="block font-bold uppercase text-xs text-gray-500">Método de Pago:</span>
                <span className="text-2xl font-bold capitalize">{data.metodo_pago}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex flex-col">
              <span className="font-bold uppercase text-sm text-gray-600 mb-1">Dirección:</span>
              <span className="text-xl font-medium">{data.direccion}</span>
            </div>

            <div className="flex border-b border-gray-300 pb-2">
              <span className="w-48 font-bold uppercase text-sm text-gray-600">Teléfono:</span>
              <span className="font-semibold">{data.telefono || 'N/A'}</span>
            </div>

            {data.nota && (
              <div className="flex flex-col bg-gray-50 p-3 rounded border border-gray-200">
                <span className="font-bold uppercase text-sm text-gray-600 mb-1">Nota:</span>
                <p className="italic">{data.nota}</p>
              </div>
            )}

            <div className="flex border-b border-gray-300 pb-2">
              <span className="w-48 font-bold uppercase text-sm text-gray-600">Estado del paquete:</span>
              <span className="font-bold uppercase bg-gray-200 px-2 py-1 rounded">
                {statusMap[data.estado] || data.estado}
              </span>
            </div>

            {data.novedad && (
              <div className="flex flex-col border-2 border-red-200 p-3 bg-red-50">
                <span className="font-bold uppercase text-sm text-red-600 mb-1">Novedad:</span>
                <p className="font-medium">{data.novedad}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}