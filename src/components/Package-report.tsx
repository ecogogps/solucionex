'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PackageData {
  id: string;
  guia_numero: string;
  tipo: string;
  estado: string;
  direccion: string;
  valor_pedido: number;
  total_a_cobrar?: number; // Agregado para soportar el total a cobrar
  metodo_pago: string;
  operador_id: string | null;
  empresa_id: string;
  created_at: string;
  telefono?: string;
  empresas?: { nombre: string };
  operadores?: { nombres: string };
}

export const exportPackagesToPDF = (packages: PackageData[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayPackages = packages.filter(pkg => {
    const pkgDate = new Date(pkg.created_at);
    pkgDate.setHours(0, 0, 0, 0);
    return pkgDate.getTime() === today.getTime();
  });

  if (todayPackages.length === 0) {
    return { success: false, message: "No hay paquetes registrados el día de hoy." };
  }

  const doc = new jsPDF({ orientation: 'landscape' });
  const dateStr = today.toLocaleDateString('es-EC');

  doc.setFontSize(18);
  doc.text(`Reporte de Paquetes - ${dateStr}`, 14, 15);
  doc.setFontSize(10);

  const tableRows = todayPackages.map(pkg => [
    pkg.empresas?.nombre || 'N/A',
    pkg.operadores?.nombres || 'Sin asignar',
    pkg.tipo,
    pkg.guia_numero,
    pkg.total_a_cobrar !== undefined && pkg.total_a_cobrar !== null
      ? `$${pkg.total_a_cobrar}`
      : 'error', // Fallback estricto a 'error' si no está definido
    pkg.metodo_pago,
    pkg.direccion,
    pkg.telefono || 'N/A'
  ]);

  autoTable(doc, {
    startY: 28,
    head: [['Empresa', 'Operador', 'Tipo', 'Guía', 'Total a Cobrar', 'Pago', 'Dirección', 'Teléfono']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [13, 13, 84], textColor: [255, 255, 255] },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      6: { cellWidth: 50 } 
    }
  });

  doc.save(`reporte-paquetes-${dateStr}.pdf`);
  return { success: true, message: "El reporte se ha descargado correctamente." };
};
