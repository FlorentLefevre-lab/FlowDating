// ===========================================
// ÉTAPE 13: Page Chat
// FICHIER: src/app/chat/page.tsx
// ===========================================

import { Metadata } from 'next';
import ChatSystem from '@/components/chat/ChatSystem';
import { AuthProtection } from '@/components/auth/AuthProtection';
import { EmailProtection } from '@/components/auth/EmailProtection';

export const metadata: Metadata = {
  title: 'Messages - Votre App',
  description: 'Chattez avec vos matchs',
};

export default function ChatPage() {
  return (
    <AuthProtection>
      <EmailProtection>
        <ChatSystem />
      </EmailProtection>
    </AuthProtection>
  );
}