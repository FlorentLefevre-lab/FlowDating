import React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MessageCircle, Heart, User, Settings, Compass } from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { usePathname } from 'next/navigation';

export const Navbar: React.FC = () => {
  const { data: session } = useSession();
  const { matches } = useMatches();
  const pathname = usePathname();

  // Calculer le total de messages non lus
  const totalUnreadMessages = matches.reduce((total, match) => total + match.unreadCount, 0);

  if (!session) return null;

  const navItems = [
    {
      href: '/discover',
      icon: Compass,
      label: 'Découvrir',
      badge: null
    },
    {
      href: '/chat',
      icon: MessageCircle,
      label: 'Messages',
      badge: totalUnreadMessages > 0 ? totalUnreadMessages : null
    },
    {
      href: '/matches',
      icon: Heart,
      label: 'Matches',
      badge: null
    },
    {
      href: '/profile',
      icon: User,
      label: 'Profil',
      badge: null
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href}
              href={item.href} 
              className={`flex flex-col items-center p-2 relative transition-colors ${
                isActive 
                  ? 'text-blue-500' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                {item.badge && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </div>
                )}
              </div>
              <span className={`text-xs mt-1 ${isActive ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar; 