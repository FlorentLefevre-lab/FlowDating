// app/profile/page.tsx
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import ProfileManager from '../../components/ProfileManager';

export default async function ProfilePage() {
  console.log("🏠 Page Profile - Vérification session côté serveur...")
  
  const session = await getServerSession(authOptions);
  
  console.log("📋 Session trouvée:", !!session)
  console.log("👤 User ID:", session?.user?.id)
  
  if (!session) {
    console.log("❌ Pas de session, redirection vers /auth/login")
    redirect('/auth/login'); // 🔥 CHANGÉ: /auth/signin → /auth/login
  }

  console.log("✅ Session valide, affichage du profil")
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileManager />
    </div>
  );
}