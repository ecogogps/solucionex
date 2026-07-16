'use client';

import { MyWalletView } from '@/components/MyWalletView';

export default function BusinessWalletPage() {
  return (
    <div className="p-4 lg:p-8 flex justify-center">
      <div className="w-full max-w-3xl space-y-6">
        <h2 className="text-2xl font-bold">Tmax Pay</h2>
        <MyWalletView rol="empresa" />
      </div>
    </div>
  );
}