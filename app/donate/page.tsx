'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeftIcon,
  HeartIcon,
  SparklesIcon,
  RocketLaunchIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  BoltIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Card, Button } from '@/components/ui';

const donationTiers = [
  { amount: 5, label: 'Supporter', emoji: '☕', description: 'Un cafe pour l\'equipe' },
  { amount: 10, label: 'Fan', emoji: '💝', description: 'Aide au developpement' },
  { amount: 25, label: 'Champion', emoji: '🌟', description: 'Soutien significatif' },
  { amount: 50, label: 'Hero', emoji: '🚀', description: 'Impact majeur' },
  { amount: 100, label: 'Legend', emoji: '👑', description: 'Contribution exceptionnelle' },
];

const milestones = [
  { icon: UserGroupIcon, title: '10 000 utilisateurs', description: 'Objectif communaute', progress: 65 },
  { icon: RocketLaunchIcon, title: 'App Mobile', description: 'iOS & Android natives', progress: 30 },
  { icon: GlobeAltIcon, title: 'Expansion Europe', description: 'Nouveaux pays', progress: 15 },
  { icon: ShieldCheckIcon, title: 'IA Anti-Fake', description: 'Detection des faux profils', progress: 45 },
];

const whyDonate = [
  {
    icon: HeartIconSolid,
    title: 'Un projet passion',
    description: 'Flow Dating est ne d\'une frustration avec les apps de rencontre existantes. Nous voulons creer quelque chose de different, de plus humain.',
  },
  {
    icon: SparklesIcon,
    title: '100% independant',
    description: 'Pas de venture capital, pas de pression pour monetiser agressivement. Vos dons nous permettent de rester libres et focuses sur vous.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Transparence totale',
    description: 'Chaque euro est investi dans le developpement, les serveurs et la securite. Nous publions regulierement nos depenses.',
  },
  {
    icon: UserGroupIcon,
    title: 'Communaute first',
    description: 'Les donateurs ont acces a un Discord prive, votent sur les prochaines fonctionnalites et testent en avant-premiere.',
  },
];

interface PaymentConfig {
  stripe: boolean;
  paypal: boolean;
  lightning: boolean;
}

export default function DonatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | 'lightning'>('stripe');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    stripe: true,
    paypal: true,
    lightning: false,
  });

  const finalAmount = customAmount ? parseInt(customAmount) : selectedAmount;

  // Charger la configuration des methodes de paiement
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/donate/config');
        if (response.ok) {
          const config = await response.json();
          setPaymentConfig(config);
          // Choisir la premiere methode disponible
          if (config.stripe) setSelectedMethod('stripe');
          else if (config.paypal) setSelectedMethod('paypal');
          else if (config.lightning) setSelectedMethod('lightning');
        }
      } catch (err) {
        console.error('Failed to load payment config:', err);
      }
    };
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Afficher un message si le paiement a ete annule
  useEffect(() => {
    if (searchParams.get('canceled') === 'true') {
      setError('Paiement annule. Vous pouvez reessayer quand vous voulez.');
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/donate');
    }
  }, [searchParams]);

  const handleDonate = async () => {
    if (!finalAmount || finalAmount < 1) return;

    setIsLoading(true);
    setError(null);

    try {
      switch (selectedMethod) {
        case 'stripe': {
          // Appeler l'API pour creer une session Stripe
          const response = await fetch('/api/donate/stripe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: finalAmount,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la creation du paiement');
          }

          // Rediriger vers Stripe Checkout
          if (data.url) {
            window.location.href = data.url;
          }
          break;
        }

        case 'paypal': {
          // Appeler l'API pour creer une commande PayPal
          const response = await fetch('/api/donate/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: finalAmount,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Erreur lors de la creation du paiement PayPal');
          }

          // Rediriger vers PayPal
          if (data.approveUrl) {
            window.location.href = data.approveUrl;
          }
          break;
        }

        case 'lightning': {
          // Pour Lightning, on peut afficher un modal avec un QR code
          // ou rediriger vers un service comme BTCPay Server
          // Pour l'instant, on affiche un message
          setError('Les paiements Lightning arrivent bientot ! Utilisez Carte ou PayPal en attendant.');
          break;
        }
      }
    } catch (err) {
      console.error('Donation error:', err);
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto p-4 md:p-6 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="text-sm">Retour</span>
          </button>

          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-500/30"
            >
              <HeartIconSolid className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Soutenez Flow Dating
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Aidez-nous a construire l'app de rencontre que vous meritez.
              Chaque don compte et fait une vraie difference.
            </p>
          </div>
        </motion.div>

        {/* Notre Histoire */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="p-6 bg-white/80 backdrop-blur border-pink-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <SparklesIcon className="w-6 h-6 text-pink-500" />
              Notre Histoire
            </h2>
            <div className="prose prose-sm text-gray-600 space-y-3">
              <p>
                <strong className="text-gray-800">Flow Dating est ne d'une simple observation :</strong> les apps de rencontre actuelles sont devenues des machines a frustration. Swipe infini, likes payants, algorithmes opaques qui cachent les profils...
              </p>
              <p>
                Nous avons decide de creer quelque chose de different. Une app ou <span className="text-pink-600 font-medium">l'humain passe avant le profit</span>. Pas de dark patterns, pas de manipulations psychologiques, juste des vraies connexions.
              </p>
              <p>
                Aujourd'hui, Flow Dating est developpe par une petite equipe passionnee, sans investisseurs ni pression financiere. <span className="text-pink-600 font-medium">Vos dons sont notre unique source de financement independant</span> et nous permettent de rester fideles a nos valeurs.
              </p>
            </div>
          </Card>
        </motion.div>

        {/* Pourquoi Donner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Pourquoi nous soutenir ?
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {whyDonate.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Card className="p-4 h-full hover:shadow-md transition-shadow border-pink-100/50">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Objectifs / Roadmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Nos objectifs
          </h2>
          <Card className="p-4 bg-white/80 backdrop-blur border-pink-100">
            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <milestone.icon className="w-5 h-5 text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-gray-800 text-sm">{milestone.title}</span>
                      <span className="text-xs text-pink-600 font-semibold">{milestone.progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${milestone.progress}%` }}
                        transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Section Donation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-br from-white to-pink-50 border-pink-200 shadow-lg">
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center gap-2">
              <HeartIcon className="w-6 h-6 text-pink-500" />
              Faire un don
            </h2>

            {/* Montants predefinis */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Choisissez un montant</p>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {donationTiers.map((tier) => (
                  <button
                    key={tier.amount}
                    onClick={() => {
                      setSelectedAmount(tier.amount);
                      setCustomAmount('');
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      selectedAmount === tier.amount && !customAmount
                        ? 'border-pink-500 bg-pink-50 shadow-md'
                        : 'border-gray-200 hover:border-pink-300 bg-white'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{tier.emoji}</span>
                    <span className="font-bold text-gray-800 block">{tier.amount}€</span>
                    <span className="text-xs text-gray-500">{tier.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Montant personnalise */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Ou entrez un montant personnalise</p>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  placeholder="Montant en euros"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
              </div>
            </div>

            {/* Methode de paiement */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">Methode de paiement</p>
              <div className="grid grid-cols-3 gap-3">
                {/* Stripe */}
                <button
                  onClick={() => paymentConfig.stripe && setSelectedMethod('stripe')}
                  disabled={!paymentConfig.stripe}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ${
                    !paymentConfig.stripe
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : selectedMethod === 'stripe'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentConfig.stripe ? 'bg-[#635BFF]' : 'bg-gray-400'}`}>
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">Carte</span>
                  {!paymentConfig.stripe && (
                    <span className="text-[10px] text-gray-500 font-medium">Bientot</span>
                  )}
                  {selectedMethod === 'stripe' && paymentConfig.stripe && (
                    <CheckCircleIcon className="w-5 h-5 text-pink-500 absolute top-2 right-2" />
                  )}
                </button>

                {/* PayPal */}
                <button
                  onClick={() => paymentConfig.paypal && setSelectedMethod('paypal')}
                  disabled={!paymentConfig.paypal}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ${
                    !paymentConfig.paypal
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : selectedMethod === 'paypal'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentConfig.paypal ? 'bg-[#003087]' : 'bg-gray-400'}`}>
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">PayPal</span>
                  {!paymentConfig.paypal && (
                    <span className="text-[10px] text-gray-500 font-medium">Bientot</span>
                  )}
                  {selectedMethod === 'paypal' && paymentConfig.paypal && (
                    <CheckCircleIcon className="w-5 h-5 text-pink-500 absolute top-2 right-2" />
                  )}
                </button>

                {/* Lightning */}
                <button
                  onClick={() => paymentConfig.lightning && setSelectedMethod('lightning')}
                  disabled={!paymentConfig.lightning}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative ${
                    !paymentConfig.lightning
                      ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      : selectedMethod === 'lightning'
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${paymentConfig.lightning ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gray-400'}`}>
                    <BoltIcon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Bitcoin</span>
                  {!paymentConfig.lightning ? (
                    <span className="text-[10px] text-gray-500 font-medium">Bientot</span>
                  ) : (
                    <span className="text-[10px] text-orange-600 font-medium">Lightning</span>
                  )}
                  {selectedMethod === 'lightning' && paymentConfig.lightning && (
                    <CheckCircleIcon className="w-5 h-5 text-pink-500 absolute top-2 right-2" />
                  )}
                </button>
              </div>
            </div>

            {/* Message si aucune methode disponible */}
            {!paymentConfig.stripe && !paymentConfig.paypal && !paymentConfig.lightning && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">
                  Les paiements ne sont pas encore configures. Contactez-nous pour faire un don.
                </p>
              </div>
            )}

            {/* Message d'erreur */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Bouton de don */}
            <Button
              onClick={handleDonate}
              disabled={!finalAmount || finalAmount < 1 || isLoading || !paymentConfig[selectedMethod]}
              className="w-full py-4 text-lg font-bold bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white rounded-xl shadow-lg shadow-pink-500/30 transition-all hover:shadow-xl hover:shadow-pink-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Redirection en cours...
                </>
              ) : (
                <>
                  <HeartIconSolid className="w-5 h-5 mr-2" />
                  Donner {finalAmount || '...'}€ avec {selectedMethod === 'stripe' ? 'Carte' : selectedMethod === 'paypal' ? 'PayPal' : 'Lightning'}
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Paiement 100% securise. Les dons ne sont pas deductibles des impots.
            </p>
          </Card>
        </motion.div>

        {/* Avantages Donateurs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-purple-500" />
              Avantages Donateurs
            </h2>
            <ul className="space-y-3">
              {[
                'Badge "Supporter" visible sur votre profil',
                'Acces au Discord prive de la communaute',
                'Vote sur les prochaines fonctionnalites',
                'Acces anticipe aux nouvelles features',
                'Mention dans la page "Merci"',
                'Notre gratitude eternelle',
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        {/* Message de remerciement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="text-center"
        >
          <p className="text-gray-600 mb-2">
            Merci de faire partie de l'aventure Flow Dating
          </p>
          <p className="text-2xl">💖</p>
        </motion.div>
      </div>
    </div>
  );
}
