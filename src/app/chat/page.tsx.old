// src/app/chat/page.tsx - Gérer les paramètres URL et protection

'use client';

import { Suspense } from 'react';
import AuthGuard  from '@/components/auth/AuthGuard';
import DatingApp from '@/components/chat/DatingApp';

function ChatPageContent() {
  return (
    <AuthGuard>
      <DatingApp />
    </AuthGuard>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du chat...</p>
        </div>
      </div>
    }>
      <ChatPageContent />
    </Suspense>
  );
}