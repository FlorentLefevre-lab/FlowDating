// components/profile/BasicInfoForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';
import { z } from 'zod';
import { UserProfile } from '../../types/profiles';

const basicInfoSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  age: z.coerce.number().min(18, 'Âge minimum 18 ans').max(100, 'Âge maximum 100 ans').optional().nullable(),
  bio: z.string().max(500, 'Bio limitée à 500 caractères').optional().nullable(),
  location: z.string().max(100, 'Localisation trop longue').optional().nullable(),
  interests: z.array(z.string()).max(10, 'Maximum 10 centres d\'intérêt').optional()
});

type BasicInfoFormData = z.infer<typeof basicInfoSchema>;

interface Props {
  profile: UserProfile | null;
  loading: boolean;
  onSubmit: (data: BasicInfoFormData) => Promise<void>;
  onCancel: () => void;
}

const BasicInfoForm: React.FC<Props> = ({ profile, loading, onSubmit, onCancel }) => {
  const [newInterest, setNewInterest] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<BasicInfoFormData>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: '',
      age: null,
      bio: '',
      location: '',
      interests: []
    }
  });

  const interests = watch('interests') || [];

  useEffect(() => {
    if (profile) {
      setValue('name', profile.name || '');
      setValue('age', profile.age);
      setValue('bio', profile.bio);
      setValue('location', profile.location);
      setValue('interests', profile.interests || []);
    }
  }, [profile, setValue]);

  const addInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim()) && interests.length < 10) {
      const newInterests = [...interests, newInterest.trim()];
      setValue('interests', newInterests);
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    const newInterests = interests.filter(i => i !== interest);
    setValue('interests', newInterests);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Informations de base
      </h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Nom complet *
            </label>
            <input
              {...register('name')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Votre nom complet"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Âge
            </label>
            <input
              type="number"
              min="18"
              max="100"
              {...register('age', { valueAsNumber: true })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Votre âge"
            />
            {errors.age && (
              <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Localisation
          </label>
          <input
            {...register('location')}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            placeholder="Ville, Pays"
          />
          {errors.location && (
            <p className="text-red-500 text-sm mt-1">{errors.location.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Bio
          </label>
          <textarea
            {...register('bio')}
            rows={4}
            maxLength={500}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
            placeholder="Parlez un peu de vous..."
          />
          {errors.bio && (
            <p className="text-red-500 text-sm mt-1">{errors.bio.message}</p>
          )}
        </div>

        {/* Centres d'intérêt */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Centres d'intérêt ({interests.length}/10)
          </label>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newInterest}
              onChange={(e) => setNewInterest(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Ajouter un centre d'intérêt"
              disabled={interests.length >= 10}
            />
            <button
              type="button"
              onClick={addInterest}
              disabled={interests.length >= 10}
              className="px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {interests.map((interest, index) => (
                <motion.span
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                >
                  {interest}
                  <button
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="text-pink-500 hover:text-pink-700 transition-colors"
                  >
                    ×
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 px-4 rounded-lg hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 font-medium transition-all"
          >
            {loading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
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

export default BasicInfoForm;