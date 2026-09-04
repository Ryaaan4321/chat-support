'use client';

import React from 'react';
import { AppHeader } from '@/components/desk/app-header';
import { ManagerBoard } from '@/components/desk/manager-board';

export default function ManagerPage() {
  return (
    <div className="flex h-screen min-h-0 w-full max-w-full flex-col bg-[#F8FAFC] text-[#0F172A] overflow-hidden">
      <AppHeader />
      <ManagerBoard />
    </div>
  );
}
