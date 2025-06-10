import { z } from 'zod';

export const profileSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  age: z.number().min(18, 'Âge minimum 18 ans').max(100, 'Âge maximum 100 ans').optional().nullable(),
  bio: z.string().max(500, 'Bio limitée à 500 caractères').optional().nullable(),
  location: z.string().max(100, 'Localisation trop longue').optional().nullable(),
  interests: z.array(z.string()).max(10, 'Maximum 10 centres d\'intérêt').optional()
});

export const preferencesSchema = z.object({
  minAge: z.number().min(18, 'Âge minimum 18 ans').max(99, 'Âge maximum 99 ans'),
  maxAge: z.number().min(18, 'Âge minimum 18 ans').max(99, 'Âge maximum 99 ans'),
  maxDistance: z.number().min(1, 'Distance minimum 1 km').max(500, 'Distance maximum 500 km'),
  gender: z.string().optional().nullable()
}).refine(data => data.minAge <= data.maxAge, {
  message: "L'âge minimum ne peut pas être supérieur à l'âge maximum",
  path: ["minAge"]
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type PreferencesFormData = z.infer<typeof preferencesSchema>;
