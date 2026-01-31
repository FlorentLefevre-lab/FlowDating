// src/lib/zodiac.ts - Fonctions de calcul du zodiaque et de l'âge

import { ZODIAC_SIGNS } from '@/constants/profileData';

// Plages de dates pour chaque signe du zodiaque
const ZODIAC_DATES: Array<{
  sign: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}> = [
  { sign: 'capricorne', startMonth: 1, startDay: 1, endMonth: 1, endDay: 19 },
  { sign: 'verseau', startMonth: 1, startDay: 20, endMonth: 2, endDay: 18 },
  { sign: 'poissons', startMonth: 2, startDay: 19, endMonth: 3, endDay: 20 },
  { sign: 'belier', startMonth: 3, startDay: 21, endMonth: 4, endDay: 19 },
  { sign: 'taureau', startMonth: 4, startDay: 20, endMonth: 5, endDay: 20 },
  { sign: 'gemeaux', startMonth: 5, startDay: 21, endMonth: 6, endDay: 20 },
  { sign: 'cancer', startMonth: 6, startDay: 21, endMonth: 7, endDay: 22 },
  { sign: 'lion', startMonth: 7, startDay: 23, endMonth: 8, endDay: 22 },
  { sign: 'vierge', startMonth: 8, startDay: 23, endMonth: 9, endDay: 22 },
  { sign: 'balance', startMonth: 9, startDay: 23, endMonth: 10, endDay: 22 },
  { sign: 'scorpion', startMonth: 10, startDay: 23, endMonth: 11, endDay: 21 },
  { sign: 'sagittaire', startMonth: 11, startDay: 22, endMonth: 12, endDay: 21 },
  { sign: 'capricorne', startMonth: 12, startDay: 22, endMonth: 12, endDay: 31 },
];

/**
 * Calcule le signe du zodiaque à partir d'une date de naissance
 * @param birthDate - Date de naissance
 * @returns La valeur du signe (ex: 'belier', 'taureau', etc.)
 */
export function calculateZodiacSign(birthDate: Date): string {
  const month = birthDate.getMonth() + 1; // getMonth() retourne 0-11
  const day = birthDate.getDate();

  for (const zodiac of ZODIAC_DATES) {
    if (
      (month === zodiac.startMonth && day >= zodiac.startDay) ||
      (month === zodiac.endMonth && day <= zodiac.endDay)
    ) {
      return zodiac.sign;
    }
  }

  return 'capricorne'; // Par défaut (ne devrait jamais arriver)
}

/**
 * Calcule l'âge exact à partir d'une date de naissance
 * @param birthDate - Date de naissance
 * @returns L'âge en années
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  // Si l'anniversaire n'est pas encore passé cette année, on enlève 1 an
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Retourne le label complet du signe du zodiaque avec emoji
 * @param sign - La valeur du signe (ex: 'belier')
 * @returns Le label avec emoji (ex: 'Bélier ♈')
 */
export function getZodiacLabel(sign: string): string {
  const zodiacSign = ZODIAC_SIGNS.find(z => z.value === sign);
  return zodiacSign?.label || sign;
}

/**
 * Calcule à la fois l'âge et le signe du zodiaque
 * @param birthDate - Date de naissance (Date ou string ISO)
 * @returns Un objet avec l'âge et le signe du zodiaque
 */
export function calculateAgeAndZodiac(birthDate: Date | string): { age: number; zodiacSign: string; zodiacLabel: string } {
  const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const zodiacSign = calculateZodiacSign(date);

  return {
    age: calculateAge(date),
    zodiacSign,
    zodiacLabel: getZodiacLabel(zodiacSign),
  };
}

/**
 * Vérifie si une date de naissance correspond à un âge minimum
 * @param birthDate - Date de naissance
 * @param minAge - Âge minimum requis (défaut: 18)
 * @returns true si l'âge est supérieur ou égal au minimum
 */
export function isOldEnough(birthDate: Date, minAge: number = 18): boolean {
  return calculateAge(birthDate) >= minAge;
}

/**
 * Retourne la date maximum de naissance pour avoir au moins minAge ans
 * @param minAge - Âge minimum requis (défaut: 18)
 * @returns La date maximum de naissance au format ISO
 */
export function getMaxBirthDate(minAge: number = 18): string {
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear() - minAge,
    today.getMonth(),
    today.getDate()
  );
  return maxDate.toISOString().split('T')[0];
}
