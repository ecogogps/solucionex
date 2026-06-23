'use client';

import { MyWalletView } from '@/components/MyWalletView';

export default function OperatorWalletPage() {
  return (
    <div className="p-4 lg:p-8 flex justify-center">
      <div className="w-full max-w-2xl space-y-6 pb-24">
        <h2 className="text-2xl font-bold">Mi Billetera</h2>
        <MyWalletView rol="operador" />
      </div>
    </div>
  );
}