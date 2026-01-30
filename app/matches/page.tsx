// ===============================
// app/matches/page.tsx - Page interface matches
// ===============================

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Heart,
  MessageCircle,
  MapPin,
  Briefcase,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
  Search,
  Filter,
  Activity,
  Zap,
  Archive,
  SortAsc,
  SortDesc,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  X,
  Ruler,
  Scale,
  Palette,
  Cigarette,
  Wine,
  Baby,
  PawPrint,
  GraduationCap,
  User,
  Utensils,
  Gem
} from 'lucide-react';
import { useMatches } from '@/hooks/useMatches';
import { Match } from '@/types/matches';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Skeleton,
  SimpleLoading,
  SimpleError,
  PhotoCarousel
} from '@/components/ui';
import './matches.css';

// ===============================
// COMPOSANTS
// ===============================

// Interface pour les donnees du profil complet
interface FullUserProfile {
  id: string;
  name: string;
  age?: number;
  bio?: string;
  location?: string;
  profession?: string;
  gender?: string;
  interests?: string[];
  image?: string;
  photos?: { url: string; isPrimary: boolean }[];
  preferences?: any;
  // Informations personnelles
  maritalStatus?: string;
  zodiacSign?: string;
  dietType?: string;
  religion?: string;
  ethnicity?: string;
  // Caractéristiques physiques
  height?: number;
  weight?: number;
  bodyType?: string;
  eyeColor?: string;
  hairColor?: string;
  // Style de vie
  smoking?: string;
  drinking?: string;
  drugs?: string;
  children?: string;
  pets?: string;
  education?: string;
}

// Composant Modal pour afficher le profil complet
const ProfileModal = ({
  userId,
  userName,
  onClose,
  onOpenChat
}: {
  userId: string;
  userName: string;
  onClose: () => void;
  onOpenChat: () => void;
}) => {
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('ProfileModal rendered for:', userName, userId);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        const data = await response.json();

        if (data.success && data.user) {
          console.log('API Response - user data:', data.user);
          console.log('Height:', data.user.height);
          console.log('BodyType:', data.user.bodyType);
          console.log('Smoking:', data.user.smoking);
          setProfile(data.user);
        } else {
          setError(data.error || 'Erreur lors du chargement du profil');
        }
      } catch (err) {
        setError('Impossible de charger le profil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  // Fermer avec Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const getGenderLabel = (gender?: string) => {
    switch (gender) {
      case 'MALE': return 'Homme';
      case 'FEMALE': return 'Femme';
      case 'NON_BINARY': return 'Non-binaire';
      case 'OTHER': return 'Autre';
      default: return 'Non specifie';
    }
  };

  const getLabel = (value?: string, type?: string) => {
    if (!value) return null;
    const labels: Record<string, Record<string, string>> = {
      bodyType: {
        'mince': 'Mince', 'athletique': 'Athlétique', 'normal': 'Normal',
        'quelques-kilos': 'Quelques kilos en plus', 'ronde': 'Rond(e)', 'musclé': 'Musclé(e)'
      },
      eyeColor: {
        'marron': 'Marron', 'bleu': 'Bleu', 'vert': 'Vert', 'noisette': 'Noisette',
        'gris': 'Gris', 'noir': 'Noir', 'ambre': 'Ambre', 'vairons': 'Vairons'
      },
      hairColor: {
        'noir': 'Noir', 'brun': 'Brun', 'chatain': 'Châtain', 'blond': 'Blond',
        'roux': 'Roux', 'gris': 'Gris', 'blanc': 'Blanc', 'colore': 'Coloré', 'chauve': 'Chauve'
      },
      smoking: {
        'non-fumeur': 'Non-fumeur', 'fumeur-occasionnel': 'Fumeur occasionnel',
        'fumeur': 'Fumeur', 'en-cours-arret': 'En cours d\'arrêt', 'vapoteur': 'Vapoteur'
      },
      drinking: {
        'jamais': 'Jamais', 'occasionnellement': 'Occasionnellement',
        'sociales': 'En soirées', 'regulierement': 'Régulièrement'
      },
      drugs: {
        'jamais': 'Jamais', 'occasionnellement': 'Occasionnellement',
        'sociales': 'En soirées', 'prefer-not-to-say': 'Préfère ne pas dire'
      },
      children: {
        'aucun-en-veut': 'N\'en a pas, en veut', 'aucun-ne-veut-pas': 'N\'en a pas, n\'en veut pas',
        'aucun-indecis': 'N\'en a pas, indécis', 'en-a-en-veut-plus': 'En a, en veut d\'autres',
        'en-a-ne-veut-plus': 'En a, n\'en veut plus'
      },
      pets: {
        'aucun': 'Aucun', 'chien': 'Chien', 'chat': 'Chat', 'chien-chat': 'Chien et chat',
        'oiseau': 'Oiseau', 'poisson': 'Poisson', 'rongeur': 'Rongeur', 'reptile': 'Reptile', 'autres': 'Autres'
      },
      education: {
        'brevet': 'Brevet', 'cap-bep': 'CAP/BEP', 'bac': 'Baccalauréat',
        'bac-plus-2': 'Bac +2', 'licence': 'Licence', 'master': 'Master', 'doctorat': 'Doctorat', 'autre': 'Autre'
      },
      maritalStatus: {
        'SINGLE': 'Célibataire', 'DIVORCED': 'Divorcé(e)', 'WIDOWED': 'Veuf(ve)',
        'SEPARATED': 'Séparé(e)', 'celibataire': 'Célibataire', 'divorce': 'Divorcé(e)',
        'veuf': 'Veuf(ve)', 'separe': 'Séparé(e)', 'complique': 'C\'est compliqué'
      },
      zodiacSign: {
        'belier': 'Bélier', 'taureau': 'Taureau', 'gemeaux': 'Gémeaux', 'cancer': 'Cancer',
        'lion': 'Lion', 'vierge': 'Vierge', 'balance': 'Balance', 'scorpion': 'Scorpion',
        'sagittaire': 'Sagittaire', 'capricorne': 'Capricorne', 'verseau': 'Verseau', 'poissons': 'Poissons'
      },
      dietType: {
        'omnivore': 'Omnivore', 'vegetarien': 'Végétarien', 'vegan': 'Vegan',
        'pescetarien': 'Pescétarien', 'flexitarien': 'Flexitarien', 'halal': 'Halal', 'casher': 'Casher'
      },
      religion: {
        'atheisme': 'Athéisme', 'agnosticisme': 'Agnosticisme', 'christianisme': 'Christianisme',
        'catholicisme': 'Catholicisme', 'islam': 'Islam', 'judaisme': 'Judaïsme',
        'bouddhisme': 'Bouddhisme', 'hindouisme': 'Hindouisme', 'spiritualite': 'Spiritualité'
      }
    };
    return type && labels[type] ? (labels[type][value] || value) : value;
  };

  return (
    <div
      className="modal-overlay flex-center p-4"
      onClick={onClose}
    >
      <Card
        className="max-w-2xl w-full max-h-[95vh] overflow-hidden modal-content"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        {/* Header avec carousel de photos */}
        <div className="relative">
          {isLoading ? (
            <div className="w-full h-64 bg-gradient-to-br from-pink-200 to-purple-200 flex-center">
              <div className="spinner-lg"></div>
            </div>
          ) : profile?.photos && profile.photos.length > 0 ? (
            <PhotoCarousel
              photos={profile.photos}
              height="h-64"
              objectFit="contain"
              showArrows={profile.photos.length > 1}
              showIndicators={profile.photos.length > 1}
              counterPosition="top-left"
              overlay={
                <>
                  {/* Gradient en bas pour la lisibilité */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  {/* Badge genre */}
                  {profile?.gender && (
                    <Badge variant="secondary" className="absolute bottom-4 left-4 bg-white/90 pointer-events-auto">
                      {getGenderLabel(profile.gender)}
                    </Badge>
                  )}
                </>
              }
            />
          ) : profile?.image ? (
            <img
              src={profile.image}
              alt={profile?.name || userName}
              className="w-full h-64 object-contain"
            />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-pink-400 to-purple-600 flex-center">
              <span className="text-white text-5xl font-bold">
                {(profile?.name || userName)?.charAt(0) || '?'}
              </span>
            </div>
          )}

          {/* Bouton fermer */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 z-30 bg-white/90 hover:bg-white rounded-full shadow-lg"
          >
            <X className="w-5 h-5 text-gray-700" />
          </Button>
        </div>

        {/* Contenu du profil */}
        <CardContent className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 200px - 70px)' }}>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <SimpleError message={error} />
          ) : profile ? (
            <div className="space-y-6">
              {/* Nom et age */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {profile.name}
                  {profile.age && <span className="text-gray-600 font-normal">, {profile.age} ans</span>}
                </h2>
              </div>

              {/* Infos principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.profession && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <Briefcase className="w-5 h-5 text-pink-500" />
                    <span>{profile.profession}</span>
                  </div>
                )}
                {profile.location && (
                  <div className="flex items-center space-x-3 text-gray-700">
                    <MapPin className="w-5 h-5 text-pink-500" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    A propos
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Caractéristiques physiques */}
              {(profile.height || profile.weight || profile.bodyType || profile.eyeColor || profile.hairColor) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Caractéristiques physiques
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.height && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Ruler className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{profile.height} cm</span>
                      </div>
                    )}
                    {profile.weight && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Scale className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{profile.weight} kg</span>
                      </div>
                    )}
                    {profile.bodyType && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <User className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.bodyType, 'bodyType')}</span>
                      </div>
                    )}
                    {profile.eyeColor && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Eye className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">Yeux {getLabel(profile.eyeColor, 'eyeColor')?.toLowerCase()}</span>
                      </div>
                    )}
                    {profile.hairColor && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Palette className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">Cheveux {getLabel(profile.hairColor, 'hairColor')?.toLowerCase()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Style de vie */}
              {(profile.smoking || profile.drinking || profile.drugs || profile.children || profile.pets || profile.education) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Style de vie
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.smoking && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Cigarette className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.smoking, 'smoking')}</span>
                      </div>
                    )}
                    {profile.drinking && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Wine className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.drinking, 'drinking')}</span>
                      </div>
                    )}
                    {profile.drugs && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Gem className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">Drogues: {getLabel(profile.drugs, 'drugs')}</span>
                      </div>
                    )}
                    {profile.children && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Baby className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.children, 'children')}</span>
                      </div>
                    )}
                    {profile.pets && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <PawPrint className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.pets, 'pets')}</span>
                      </div>
                    )}
                    {profile.education && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <GraduationCap className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.education, 'education')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informations personnelles */}
              {(profile.maritalStatus || profile.zodiacSign || profile.dietType || profile.religion) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Informations personnelles
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {profile.maritalStatus && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.maritalStatus, 'maritalStatus')}</span>
                      </div>
                    )}
                    {profile.zodiacSign && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Star className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.zodiacSign, 'zodiacSign')}</span>
                      </div>
                    )}
                    {profile.dietType && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Utensils className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.dietType, 'dietType')}</span>
                      </div>
                    )}
                    {profile.religion && (
                      <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                        <Sparkles className="w-4 h-4 text-pink-500" />
                        <span className="text-sm">{getLabel(profile.religion, 'religion')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Interets */}
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <h3 className="text-caption uppercase tracking-wide mb-3">
                    Centres d'interet
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="default" className="badge-primary">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </CardContent>

        {/* Footer avec bouton */}
        <div className="p-3 border-t bg-gray-50">
          <Button
            onClick={onOpenChat}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Envoyer un message
          </Button>
        </div>
      </Card>
    </div>
  );
};

// Composant pour les statistiques
const StatsCard = ({ title, value, icon: Icon, gradient, subtitle }: {
  title: string;
  value: number | string;
  icon: any;
  gradient: string;
  subtitle?: string;
}) => (
  <div className={`${gradient} text-white rounded-lg p-4 stats-card`}>
    <div className="flex-between">
      <div>
        <p className="text-white/80 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
      </div>
      <Icon className="w-6 h-6 text-white/80" />
    </div>
  </div>
);

// Composant pour une carte de match avec état de chargement
const MatchCard = ({ match, onOpenChat, onOpenProfile, isOpeningChat }: {
  match: Match;
  onOpenChat: (match: Match) => Promise<void>;
  onOpenProfile: (match: Match) => void;
  isOpeningChat: boolean;
}) => {
  const getTimeAgo = (dateString: string | undefined | null) => {
    if (!dateString) return 'Inconnu';

    const now = new Date();
    const date = new Date(dateString);

    // Vérifier si la date est valide
    if (isNaN(date.getTime())) return 'Inconnu';

    const diffMs = now.getTime() - date.getTime();

    // Si dans le futur (problème de synchronisation), afficher "À l'instant"
    if (diffMs < 0) return 'À l\'instant';

    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffSeconds < 60) return 'À l\'instant';
    if (diffMinutes === 1) return 'il y a 1 min';
    if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
    if (diffHours === 1) return 'il y a 1h';
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    if (diffWeeks === 1) return 'il y a 1 semaine';
    if (diffWeeks < 4) return `il y a ${diffWeeks} semaines`;
    if (diffMonths === 1) return 'il y a 1 mois';
    if (diffMonths < 12) return `il y a ${diffMonths} mois`;

    return 'il y a longtemps';
  };

  const getStatusBadge = (match: Match) => {
    switch (match.status) {
      case 'active':
        return (
          <Badge className="badge-success">
            <Activity className="w-3 h-3 mr-1" />
            Actif
          </Badge>
        );
      case 'dormant':
        return (
          <Badge className="badge-warning">
            <Clock className="w-3 h-3 mr-1" />
            Endormi
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="badge-gray">
            <Archive className="w-3 h-3 mr-1" />
            Archivé
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="card-hover overflow-hidden match-card animate-fadeInUp">
      <div className="relative">
        {/* Zone cliquable pour ouvrir le profil */}
        <button
          onClick={() => onOpenProfile(match)}
          className="relative w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-t-lg overflow-hidden group"
          title={`Voir le profil de ${match.user.name}`}
        >
          {match.user.photo?.url ? (
            <img
              src={match.user.photo.url}
              alt={match.user.name}
              className="w-full h-48 object-contain"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-primary-400 to-secondary-600 flex-center">
              <span className="text-white text-4xl font-bold">
                {match.user.name?.charAt(0) || '?'}
              </span>
            </div>
          )}
          {/* Indicateur de clic au survol */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex-center">
            <span className="bg-white text-gray-800 px-4 py-2 rounded-full text-sm font-medium shadow-lg opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all duration-300">
              Voir le profil
            </span>
          </div>
        </button>

        <div className="absolute top-3 left-3 flex flex-col space-y-2 pointer-events-none">
          {/* Badge Admin/Moderator */}
          {(match.user.role === 'ADMIN' || match.user.role === 'MODERATOR') && (
            <Badge className={`${
              match.user.role === 'ADMIN'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
            } text-white border-0 shadow-lg`}>
              {match.user.role === 'ADMIN' ? '👑 Admin' : '🛡️ Mod'}
            </Badge>
          )}
          {match.isNew && (
            <Badge className="bg-yellow-500 text-white animate-bounce-gentle">
              Nouveau
            </Badge>
          )}
          {match.user.isOnline && (
            <Badge className="badge-online">
              En ligne
            </Badge>
          )}
        </div>

        <div className="absolute top-3 right-3 pointer-events-none">
          {getStatusBadge(match)}
        </div>

        {match.compatibility && (
          <div className="absolute bottom-3 right-3 pointer-events-none">
            <Badge className="glass text-primary-600 font-bold">
              {match.compatibility}% ♥
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 truncate">
              {match.user.name}
            </h3>
            <p className="text-gray-600">{match.user.age} ans</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Match</div>
            <div className="text-pink-600 font-medium">
              {getTimeAgo(match.createdAt)}
            </div>
          </div>
        </div>
        
        <div className="space-y-1 mb-3">
          {match.user.profession && (
            <div className="flex items-center text-sm text-gray-600">
              <Briefcase size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{match.user.profession}</span>
            </div>
          )}
          
          {match.user.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{match.user.location}</span>
            </div>
          )}

          {/* Statut de connexion */}
          {match.user.isOnline ? (
            <div className="flex items-center text-sm text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              <span>En ligne maintenant</span>
            </div>
          ) : match.user.lastSeen ? (
            <div className="flex items-center text-sm text-gray-500">
              <Clock size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">Vu {getTimeAgo(match.user.lastSeen)}</span>
            </div>
          ) : null}
        </div>

        {match.user.bio && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {match.user.bio}
          </p>
        )}

        {match.user.interests && match.user.interests.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {match.user.interests.slice(0, 3).map((interest, index) => (
              <Badge key={index} variant="secondary" className="badge-primary text-xs">
                {interest}
              </Badge>
            ))}
            {match.user.interests.length > 3 && (
              <Badge variant="secondary" className="badge-gray text-xs">
                +{match.user.interests.length - 3}
              </Badge>
            )}
          </div>
        )}

        <Button
          onClick={() => onOpenChat(match)}
          disabled={isOpeningChat}
          variant="gradient"
          className="w-full btn-match"
        >
          {isOpeningChat ? (
            <>
              <div className="spinner-sm mr-2"></div>
              <span>Ouverture...</span>
            </>
          ) : (
            <>
              <MessageCircle size={16} className="mr-2" />
              <span>Démarrer une conversation</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

// ===============================
// COMPOSANT PRINCIPAL
// ===============================
export default function MatchesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const {
    matches,
    stats,
    filteredMatches,
    filters,
    isLoading,
    isRefreshing,
    error,
    loadMatches,
    refreshMatches,
    updateFilters,
    clearFilters,
    getFilteredStats
  } = useMatches({
    autoRefresh: true,
    refreshInterval: 30000 // 30 secondes pour rafraîchir les statuts
  });

  const [showFilters, setShowFilters] = useState(false);
  const [openingChatMatchId, setOpeningChatMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // État pour forcer le re-render des temps relatifs
  const [, setTimeUpdate] = useState(0);

  // Rafraîchir l'affichage des temps toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUpdate(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Ouvrir le modal de profil
  const openProfile = (match: Match) => {
    console.log('Opening profile for:', match.user.name, match.user.id);
    setSelectedMatch(match);
  };

  // Fermer le modal de profil
  const closeProfile = () => {
    setSelectedMatch(null);
  };

  // Fonction optimisée pour ouvrir le chat
  const openChat = async (match: Match) => {
    try {
      setOpeningChatMatchId(match.id);
      console.log('🔄 [MATCHES] Ouverture chat pour match:', {
        matchId: match.id,
        userId: match.user.id,
        userName: match.user.name
      });

      // Optionnel: Pré-créer le channel côté serveur (améliore la vitesse)
      try {
        console.log('🔄 [MATCHES] Tentative de pré-création du channel...');
        const preCreateResponse = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: match.user.id, matchId: match.id })
        });

        if (preCreateResponse.ok) {
          const preCreateData = await preCreateResponse.json();
          console.log('✅ [MATCHES] Channel pré-créé:', preCreateData.channelId);
        } else {
          console.warn('⚠️ [MATCHES] Pré-création échouée, la page chat tentera de créer le channel');
        }
      } catch (preCreateError) {
        console.warn('⚠️ [MATCHES] Erreur pré-création (non bloquant):', preCreateError);
        // Cette erreur n'est pas bloquante
      }

      // Construire l'URL avec tous les paramètres nécessaires
      const chatUrl = `/chat?userId=${encodeURIComponent(match.user.id)}&matchId=${encodeURIComponent(match.id)}&userName=${encodeURIComponent(match.user.name || 'Utilisateur')}`;
      
      console.log('🎯 [MATCHES] Redirection vers:', chatUrl);
      
      // Redirection vers la page chat
      router.push(chatUrl);
      
    } catch (error) {
      console.error('❌ [MATCHES] Erreur ouverture chat:', error);
      
      // En cas d'erreur, redirection simple sans pré-création
      const fallbackUrl = `/chat?userId=${encodeURIComponent(match.user.id)}&matchId=${encodeURIComponent(match.id)}`;
      console.log('🔄 [MATCHES] Redirection fallback vers:', fallbackUrl);
      router.push(fallbackUrl);
      
    } finally {
      // Délai pour éviter que le loading disparaisse trop vite
      setTimeout(() => {
        setOpeningChatMatchId(null);
      }, 1000);
    }
  };

  // Redirection si non authentifié
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <SimpleLoading message="Chargement des matchs..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <SimpleError message={error} onRetry={() => loadMatches()} />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
        <div className="container mx-auto max-w-7xl p-4">
          {/* En-tête avec statistiques */}
          <Card className="p-6 mb-6 animate-slideInRight">
            <div className="flex-between mb-6">
              <div>
                <h1 className="text-heading flex items-center space-x-3">
                  <Heart className="text-primary-600 animate-pulse-gentle" />
                  <span>Mes Matchs</span>
                  <Sparkles className="text-yellow-500" size={24} />
                </h1>
                <p className="text-body mt-1">
                  Découvrez vos connexions et entamez des conversations
                </p>
              </div>
              <Button
                onClick={() => refreshMatches()}
                disabled={isRefreshing}
                variant="default"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
            </div>

            {/* Statistiques détaillées */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <StatsCard 
                title="Total" 
                value={stats.totalMatches} 
                icon={Heart} 
                gradient="gradient-stats-pink"
              />
              <StatsCard 
                title="Actifs" 
                value={stats.activeConversations} 
                icon={Activity} 
                gradient="gradient-stats-green"
              />
              <StatsCard 
                title="Endormis" 
                value={stats.dormantMatches} 
                icon={Clock} 
                gradient="gradient-stats-yellow"
              />
              <StatsCard 
                title="Nouveaux" 
                value={stats.newMatches} 
                icon={Star} 
                gradient="gradient-stats-blue"
              />
              <StatsCard 
                title="Cette semaine" 
                value={stats.thisWeekMatches} 
                icon={Zap} 
                gradient="gradient-stats-purple"
              />
              <StatsCard
                title="Temps réponse"
                value={stats.averageResponseTime}
                icon={TrendingUp}
                gradient="gradient-stats-gray"
              />
            </div>
          </Card>

          {/* Barre de recherche et filtres */}
          <Card className="p-4 mb-6">
            {/* Recherche */}
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Rechercher par nom, profession, ville..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="pl-10 input-search"
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="filter-button"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filtres
                {showFilters ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
              </Button>
            </div>

            {/* Filtres détaillés */}
            {showFilters && (
              <div className="border-t pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Filtre par statut */}
                  <div>
                    <label className="text-caption block mb-2">Statut</label>
                    <select
                      value={filters.status}
                      onChange={(e) => updateFilters({ status: e.target.value as any })}
                      className="select-base w-full"
                    >
                      <option value="all">Tous</option>
                      <option value="active">Actifs</option>
                      <option value="dormant">Endormis</option>
                      <option value="new">Nouveaux</option>
                    </select>
                  </div>

                  {/* Filtre par période */}
                  <div>
                    <label className="text-caption block mb-2">Période</label>
                    <select
                      value={filters.timeframe}
                      onChange={(e) => updateFilters({ timeframe: e.target.value as any })}
                      className="select-base w-full"
                    >
                      <option value="all">Toutes</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                    </select>
                  </div>

                  {/* Tri */}
                  <div>
                    <label className="text-caption block mb-2">Trier par</label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                      className="select-base w-full"
                    >
                      <option value="recent">Plus récents</option>
                      <option value="activity">Activité</option>
                      <option value="compatibility">Compatibilité</option>
                      <option value="name">Nom</option>
                      <option value="age">Âge</option>
                    </select>
                  </div>

                  {/* Ordre de tri */}
                  <div>
                    <label className="text-caption block mb-2">Ordre</label>
                    <Button
                      onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
                      variant="outline"
                      className="w-full flex-center"
                    >
                      {filters.sortOrder === 'asc' ? (
                        <SortAsc className="w-4 h-4 mr-2" />
                      ) : (
                        <SortDesc className="w-4 h-4 mr-2" />
                      )}
                      {filters.sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Résultats du filtrage */}
            <div className="flex-between mt-4 pt-4 border-t">
              <p className="text-caption">
                {filteredMatches.length} match{filteredMatches.length > 1 ? 's' : ''}
                {filters.searchQuery && ` pour "${filters.searchQuery}"`}
              </p>

              {(filters.status !== 'all' || filters.timeframe !== 'all' || filters.searchQuery) && (
                <Button
                  onClick={clearFilters}
                  variant="link"
                  className="text-primary-600"
                >
                  Réinitialiser les filtres
                </Button>
              )}
            </div>
          </Card>

          {/* Liste des matchs */}
          {filteredMatches.length === 0 ? (
            <Card className="p-8 text-center">
              <Heart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-subheading mb-2">
                Aucun match trouvé
              </h3>
              <p className="text-body mb-4">
                {filters.status !== 'all' || filters.searchQuery
                  ? 'Essayez de modifier vos filtres de recherche.'
                  : 'Continuez à swiper pour trouver vos âmes sœurs !'
                }
              </p>
              <Button
                onClick={() => router.push('/discover')}
                variant="gradient"
                size="lg"
              >
                Découvrir des profils
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onOpenChat={openChat}
                  onOpenProfile={openProfile}
                  isOpeningChat={openingChatMatchId === match.id}
                />
              ))}
            </div>
          )}

          {/* Bouton flottant */}
          <div className="fixed bottom-6 right-6 safe-bottom">
            <Button
              onClick={() => router.push('/discover')}
              variant="gradient"
              size="icon"
              className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl group"
              title="Découvrir de nouveaux profils"
            >
              <Plus size={24} className="group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modal de profil - rendu en dehors du conteneur principal */}
      {selectedMatch && (
        <ProfileModal
          userId={selectedMatch.user.id}
          userName={selectedMatch.user.name}
          onClose={closeProfile}
          onOpenChat={() => {
            closeProfile();
            openChat(selectedMatch);
          }}
        />
      )}
    </>
  );
}