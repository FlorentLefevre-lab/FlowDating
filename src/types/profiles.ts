// types/profiles.ts - Types et interfaces pour le système de profil

export interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface UserPreferences {
  id?: string;
  userId?: string;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender: string | null;
  lookingFor?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  department?: string | null;
  region?: string | null;
  postcode?: string | null;
  
  // Informations personnelles
  gender: string | null;
  profession: string | null;
  maritalStatus: string | null;
  zodiacSign: string | null;
  dietType: string | null;
  religion: string | null;
  ethnicity: string | null;
  
  // Collections
  interests: string[];
  photos: Photo[];
  preferences?: UserPreferences;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

// Types pour les données de formulaire
export interface BasicInfoFormData {
  name: string;
  age: number | null;
  bio: string;
  location: string;
  department?: string;
  region?: string;
  postcode?: string;
  profession: string;
}

export interface PersonalInfoFormData {
  gender: string;
  profession: string;
  maritalStatus: string;
  zodiacSign: string;
  dietType: string;
  religion: string;
  ethnicity: string;
  interests: string[];
}

export interface PreferencesFormData {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender: string;
  lookingFor: string;
}

// Types pour les composants
export interface ProfileFormProps {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export interface PhotosManagerProps {
  photos: Photo[];
  onMessage: (message: string, type: MessageType) => void;
  onPhotosChange?: () => void;
}

export interface SettingsPanelProps {
  profile: UserProfile | null;
  photos: Photo[];
  session: any;
  onMessage: (message: string, type?: MessageType) => void;
}

// Types pour les messages et notifications
export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  id: string;
  type: MessageType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Types pour les onglets
export type TabType = 'overview' | 'edit' | 'personal' | 'photos' | 'preferences' | 'settings';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  color: string;
  description: string;
  badge?: string | number;
}

// Types pour l'API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
  };
}

export interface PhotoUploadResponse {
  id: string;
  url: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}// types/profiles.ts - Types et interfaces pour le système de profil

// ==================== INTERFACES DE BASE ====================

export interface Photo {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt?: string;
  order?: number;
}

export interface UserPreferences {
  id?: string;
  userId?: string;
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender: string | null;
  lookingFor?: string;
  interests?: string[];
  dealBreakers?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  department?: string | null;
  region?: string | null;
  postcode?: string | null;
  
  // Informations personnelles
  gender: string | null;
  profession: string | null;
  maritalStatus: string | null;
  zodiacSign: string | null;
  dietType: string | null;
  religion: string | null;
  ethnicity: string | null;
  height?: number | null;
  education?: string | null;
  
  // Collections
  interests: string[];
  photos: Photo[];
  preferences?: UserPreferences;
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isVerified?: boolean;
  isActive?: boolean;
  completionPercentage?: number;
}

// ==================== TYPES DE FORMULAIRES ====================

export interface BasicInfoFormData {
  name: string;
  age: number | null;
  bio: string;
  location: string;
  department?: string;
  region?: string;
  postcode?: string;
  profession: string;
}

export interface PersonalInfoFormData {
  gender: string;
  profession: string;
  maritalStatus: string;
  zodiacSign: string;
  dietType: string;
  religion: string;
  ethnicity: string;
  height?: number;
  education?: string;
  interests: string[];
}

export interface PreferencesFormData {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  gender: string;
  lookingFor: string;
  interests?: string[];
  dealBreakers?: string[];
}

// ==================== TYPES POUR LES COMPOSANTS ====================

export interface ProfileFormProps {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

export interface PhotosManagerProps {
  photos: Photo[];
  maxPhotos?: number;
  onMessage: (message: string, type: MessageType) => void;
  onPhotosChange?: () => void;
  uploadConfig?: {
    maxSize: number;
    allowedTypes: string[];
    cloudinaryConfig?: CloudinaryConfig;
  };
}

export interface SettingsPanelProps {
  profile: UserProfile | null;
  photos: Photo[];
  session: any;
  onMessage: (message: string, type?: MessageType) => void;
}

// ==================== CONFIGURATION CLOUDINARY ====================

export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
  };
}

// ==================== TYPES POUR LES MESSAGES ====================

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationMessage {
  id: string;
  type: MessageType;
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

// ==================== TYPES POUR LES ONGLETS ====================

export type TabType = 'overview' | 'edit' | 'personal' | 'photos' | 'preferences' | 'settings' | 'privacy';

export interface TabConfig {
  id: TabType;
  label: string;
  icon: any;
  color: string;
  description: string;
  badge?: string | number;
  disabled?: boolean;
  requiredFields?: string[];
}

// ==================== TYPES POUR L'API ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasMore?: boolean;
    timestamp?: string;
  };
}

export interface PhotoUploadResponse {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  order?: number;
  createdAt: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

// ==================== ENUMS ET CONSTANTES ====================

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum MaritalStatus {
  SINGLE = 'single',
  DIVORCED = 'divorced',
  WIDOWED = 'widowed',
  SEPARATED = 'separated',
  COMPLICATED = 'complicated'
}

export enum DietType {
  OMNIVORE = 'omnivore',
  VEGETARIAN = 'vegetarian',
  VEGAN = 'vegan',
  PESCATARIAN = 'pescatarian',
  KETO = 'keto',
  PALEO = 'paleo',
  GLUTEN_FREE = 'gluten_free',
  OTHER = 'other'
}

export enum Religion {
  CHRISTIANITY = 'christianity',
  ISLAM = 'islam',
  JUDAISM = 'judaism',
  HINDUISM = 'hinduism',
  BUDDHISM = 'buddhism',
  ATHEIST = 'atheist',
  AGNOSTIC = 'agnostic',
  SPIRITUAL = 'spiritual',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say'
}

export enum ZodiacSign {
  ARIES = 'aries',
  TAURUS = 'taurus',
  GEMINI = 'gemini',
  CANCER = 'cancer',
  LEO = 'leo',
  VIRGO = 'virgo',
  LIBRA = 'libra',
  SCORPIO = 'scorpio',
  SAGITTARIUS = 'sagittarius',
  CAPRICORN = 'capricorn',
  AQUARIUS = 'aquarius',
  PISCES = 'pisces'
}

export enum Education {
  HIGH_SCHOOL = 'high_school',
  BACHELOR = 'bachelor',
  MASTER = 'master',
  PHD = 'phd',
  TRADE_SCHOOL = 'trade_school',
  SOME_COLLEGE = 'some_college',
  OTHER = 'other'
}

// ==================== TYPES UTILITAIRES ====================

export type ProfileUpdatePayload = Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt' | 'photos' | 'preferences'>>;

export type PhotoUpdatePayload = {
  id?: string;
  url?: string;
  alt?: string;
  isPrimary?: boolean;
  order?: number;
};

export interface ProfileValidationRules {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  age: {
    required: boolean;
    min: number;
    max: number;
  };
  bio: {
    required: boolean;
    maxLength: number;
  };
  photos: {
    required: boolean;
    min: number;
    max: number;
  };
}

// ==================== TYPES POUR LES HOOKS ====================

export interface UseProfileReturn {
  profile: UserProfile | null;
  photos: Photo[];
  loading: boolean;
  error: string | null;
  updateProfile: (data: ProfileUpdatePayload) => Promise<void>;
  uploadPhoto: (file: File) => Promise<PhotoUploadResponse>;
  deletePhoto: (photoId: string) => Promise<void>;
  setPrimaryPhoto: (photoId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface UseNotificationsReturn {
  notifications: NotificationMessage[];
  addNotification: (notification: Omit<NotificationMessage, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

// ==================== TYPES POUR LA GÉOLOCALISATION ====================

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  department?: string;
  region?: string;
  country?: string;
  postcode?: string;
}

export interface GeolocationResult {
  success: boolean;
  location?: LocationData;
  error?: string;
}

// ==================== TYPES POUR LES STATISTIQUES ====================

export interface ProfileStats {
  completionPercentage: number;
  missingFields: string[];
  photoCount: number;
  profileViews?: number;
  likes?: number;
  matches?: number;
  lastActivity?: string;
}

// ==================== EXPORT PAR DÉFAUT ====================

export default {
  Gender,
  MaritalStatus,
  DietType,
  Religion,
  ZodiacSign,
  Education,
} as const;