// components/profile/PersonalInfoForm.tsx
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { UserProfile } from '../../types/profiles'; 
import { 
  GENDERS, 
  PROFESSIONS, 
  MARITAL_STATUS, 
  ZODIAC_SIGNS, 
  DIET_TYPES, 
  RELIGIONS, 
  ETHNICITIES 
} from '../../types/profiles';

const personalInfoSchema = z.object({
  gender: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  zodiacSign: z.string().optional().nullable(),
  dietType: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  ethnicity: z.string().optional().nullable()
});

type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;

interface Props {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: PersonalInfoFormData) => Promise<void>;
  onCancel: () => void;
}

const PersonalInfoForm: React.FC<Props> = ({ profile, loading, onSubmit, onCancel }) => {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm<PersonalInfoFormData>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      gender: '',
      profession: '',
      maritalStatus: '',
      zodiacSign: '',
      dietType: '',
      religion: '',
      ethnicity: ''
    }
  });

  useEffect(() => {
    if (profile) {
      setValue('gender', profile.gender || '');
      setValue('profession', profile.profession || '');
      setValue('maritalStatus', profile.maritalStatus || '');
      setValue('zodiacSign', profile.zodiacSign || '');
      setValue('dietType', profile.dietType || '');
      setValue('religion', profile.religion || '');
      setValue('ethnicity', profile.ethnicity || '');
    }
  }, [profile, setValue]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Informations personnelles
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Genre */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Genre
            </label>
            <select
              {...register('gender')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="">Sélectionnez votre genre</option>
              {GENDERS.map(gender => (
                <option key={gender.value} value={gender.value}>
                  {gender.label}
                </option>
              ))}
            </select>
          </div>

          {/* Profession */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Domaine professionnel
            </label>
            <select
              {...register('profession')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="">Sélectionnez votre domaine</option>
              {PROFESSIONS.map(profession => (
                <option key={profession.value} value={profession.value}>
                  {profession.label}
                </option>
              ))}
            </select>
          </div>

          {/* Statut marital */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Statut marital
            </label>
            <select
              {...register('maritalStatus')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="">Sélectionnez votre statut</option>
              {MARITAL_STATUS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Signe astrologique */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Signe astrologique
            </label>
            <select
              {...register('zodiacSign')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="">Sélectionnez votre signe</option>
              {ZODIAC_SIGNS.map(sign => (
                <option key={sign.value} value={sign.value}>
                  {sign.label}
                </option>
              ))}
            </select>
          </div>

          {/* Régime alimentaire */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Régime alimentaire
            </label>
            <select
              {...register('dietType')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="">Sélectionnez votre régime</option>
              {DIET_TYPES.map(diet => (
                <option key={diet.value} value={diet.value}>
                  {diet.label}
                </option>
              ))}
            </select>
          </div>

          {/* Religion */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Religion / Spiritualité
            </label>
            <select
              {...register('religion')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            >
              <option value="">Sélectionnez votre religion</option>
              {RELIGIONS.map(religion => (
                <option key={religion.value} value={religion.value}>
                  {religion.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Origine ethnique */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Origine ethnique (optionnel)
          </label>
          <select
            {...register('ethnicity')}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
          >
            <option value="">Sélectionnez votre origine</option>
            {ETHNICITIES.map(ethnicity => (
              <option key={ethnicity.value} value={ethnicity.value}>
                {ethnicity.label}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">ℹ️ À propos de ces informations</h4>
          <p className="text-sm text-blue-700">
            Ces informations nous aident à vous proposer des correspondances plus pertinentes.
            Vous pouvez choisir de ne pas renseigner certains champs si vous préférez.
          </p>
        </div>

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 font-medium transition-all"
          >
            {loading ? 'Sauvegarde...' : 'Sauvegarder les informations'}
          </motion.button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
};

export default PersonalInfoForm;