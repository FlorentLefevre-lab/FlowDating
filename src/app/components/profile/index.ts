// components/profile/index.ts - Fichier d'index pour faciliter les imports

export { default as ProfileManager } from './ProfileManager';
export { default as ProfileOverview } from './ProfileOverview';
export { default as BasicInfoForm } from './BasicInfoForm';
export { default as PersonalInfoForm } from './PersonalInfoForm';
export { default as PhotosManager } from './PhotosManager';
export { default as PreferencesForm } from './PreferencesForm';
export { default as SettingsPanel } from './SettingsPanel';

// Réexport des types
export type {
  UserProfile,
  Photo,
  UserPreferences,
  ProfileFormProps,
  PhotosManagerProps,
  SettingsPanelProps,
  MessageType,
  TabType
} from '../../types/profiles';

// Réexport des constantes
export {
  GENDERS,
  PROFESSIONS,
  MARITAL_STATUS,
  ZODIAC_SIGNS,
  DIET_TYPES,
  RELIGIONS,
  ETHNICITIES,
  INTEREST_OPTIONS,
  LOOKING_FOR_OPTIONS,
  DISTANCE_OPTIONS
} from '../../constants/profileData';