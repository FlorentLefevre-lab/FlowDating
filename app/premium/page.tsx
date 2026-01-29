'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  CheckIcon,
  SparklesIcon,
  HeartIcon,
  EyeIcon,
  BoltIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button, Card } from '@/components/ui';

const plans = [
  {
    name: 'Gratuit',
    price: '0',
    period: '',
    description: 'Pour découvrir l\'application',
    features: [
      { text: '5 likes par jour', included: true },
      { text: 'Voir les profils', included: true },
      { text: 'Messagerie limitée', included: true },
      { text: 'Likes illimités', included: false },
      { text: 'Voir qui vous a liké', included: false },
      { text: 'Super Likes', included: false },
      { text: 'Boost de profil', included: false },
    ],
    cta: 'Plan actuel',
    popular: false,
    disabled: true,
  },
  {
    name: 'Premium',
    price: '14.99',
    period: '/mois',
    description: 'Pour maximiser vos chances',
    features: [
      { text: 'Likes illimités', included: true },
      { text: 'Voir les profils', included: true },
      { text: 'Messagerie illimitée', included: true },
      { text: 'Voir qui vous a liké', included: true },
      { text: '5 Super Likes/jour', included: true },
      { text: '1 Boost/semaine', included: true },
      { text: 'Badge Premium', included: true },
    ],
    cta: 'Choisir Premium',
    popular: true,
    disabled: false,
  },
  {
    name: 'Premium+',
    price: '24.99',
    period: '/mois',
    description: 'L\'expérience ultime',
    features: [
      { text: 'Tout Premium inclus', included: true },
      { text: 'Super Likes illimités', included: true },
      { text: 'Boosts illimités', included: true },
      { text: 'Priorité dans les résultats', included: true },
      { text: 'Filtres avancés', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'Badge Premium+', included: true },
    ],
    cta: 'Choisir Premium+',
    popular: false,
    disabled: false,
  },
];

const features = [
  {
    icon: HeartIcon,
    title: 'Likes illimités',
    description: 'Likez autant de profils que vous voulez sans restriction',
  },
  {
    icon: EyeIcon,
    title: 'Voir vos admirateurs',
    description: 'Découvrez qui a liké votre profil avant de swiper',
  },
  {
    icon: BoltIcon,
    title: 'Boost de profil',
    description: 'Soyez vu par plus de personnes pendant 30 minutes',
  },
  {
    icon: SparklesIcon,
    title: 'Super Likes',
    description: 'Montrez votre intérêt de manière plus visible',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Contrôle total',
    description: 'Filtres avancés et options de confidentialité',
  },
  {
    icon: StarIcon,
    title: 'Badge Premium',
    description: 'Démarquez-vous avec un badge exclusif',
  },
];

export default function PremiumPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSubscribe = (planName: string) => {
    // TODO: Intégrer Stripe ou autre solution de paiement
    alert(`Abonnement ${planName} - Fonctionnalité à venir !`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50 to-pink-50">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
              <SparklesIcon className="w-4 h-4" />
              Premium
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Passez à la vitesse supérieure
            </h1>
            <p className="text-sm text-gray-600 max-w-xl mx-auto">
              Débloquez toutes les fonctionnalités et maximisez vos chances de trouver l'amour
            </p>
          </div>
        </motion.div>

        {/* Plans de tarification */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {plans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`p-4 relative ${
                plan.popular
                  ? 'border-2 border-primary-500 shadow-lg'
                  : 'border border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Populaire
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{plan.description}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-gray-900">{plan.price}€</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs">
                    <CheckIcon
                      className={`w-4 h-4 flex-shrink-0 ${
                        feature.included ? 'text-green-500' : 'text-gray-300'
                      }`}
                    />
                    <span className={feature.included ? 'text-gray-700' : 'text-gray-400'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.name)}
                disabled={plan.disabled}
                variant={plan.popular ? 'gradient' : 'outline'}
                size="sm"
                className="w-full"
              >
                {plan.cta}
              </Button>
            </Card>
          ))}
        </motion.div>

        {/* Fonctionnalités Premium */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-bold text-gray-900 text-center mb-4">
            Ce que vous obtenez avec Premium
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="p-3 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-xs text-gray-500">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </motion.div>

        {/* FAQ rapide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="p-4 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Questions fréquentes</h3>
            <div className="space-y-3 text-xs">
              <div>
                <p className="font-medium text-gray-700">Puis-je annuler à tout moment ?</p>
                <p className="text-gray-500">Oui, vous pouvez annuler votre abonnement à tout moment sans frais.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Comment fonctionne le Boost ?</p>
                <p className="text-gray-500">Le Boost place votre profil en tête des résultats pendant 30 minutes.</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Les paiements sont-ils sécurisés ?</p>
                <p className="text-gray-500">Oui, tous les paiements sont traités via Stripe, 100% sécurisé.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
