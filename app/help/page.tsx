'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  BellIcon,
  QuestionMarkCircleIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { Card, Button } from '@/components/ui';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  items: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: 'account',
    title: 'Compte & Profil',
    icon: UserCircleIcon,
    items: [
      {
        question: 'Comment modifier mon profil ?',
        answer: 'Accédez à "Mon profil" depuis le menu, puis utilisez les différents onglets pour modifier vos informations, photos et préférences.',
      },
      {
        question: 'Comment changer ma photo principale ?',
        answer: 'Dans l\'onglet Photos, cliquez sur une photo et sélectionnez "Définir comme principale" pour la mettre en avant.',
      },
      {
        question: 'Puis-je masquer mon profil temporairement ?',
        answer: 'Oui, dans les paramètres, vous pouvez suspendre votre compte. Votre profil ne sera plus visible mais vos données seront conservées.',
      },
      {
        question: 'Comment supprimer mon compte ?',
        answer: 'Dans les paramètres, section "Zone de danger", vous trouverez l\'option pour supprimer définitivement votre compte.',
      },
    ],
  },
  {
    id: 'matching',
    title: 'Matchs & Likes',
    icon: HeartIcon,
    items: [
      {
        question: 'Comment fonctionne le matching ?',
        answer: 'Quand deux personnes se likent mutuellement, un match est créé et vous pouvez commencer à discuter.',
      },
      {
        question: 'Qu\'est-ce qu\'un Super Like ?',
        answer: 'Un Super Like montre à l\'autre personne que vous êtes particulièrement intéressé. Elle sera notifiée et votre profil sera mis en avant.',
      },
      {
        question: 'Combien de likes puis-je envoyer par jour ?',
        answer: 'Les utilisateurs gratuits ont 5 likes par jour. Les membres Premium ont des likes illimités.',
      },
      {
        question: 'Puis-je annuler un like ou un pass ?',
        answer: 'Les membres Premium peuvent revenir en arrière et annuler leur dernière action.',
      },
    ],
  },
  {
    id: 'messages',
    title: 'Messagerie',
    icon: ChatBubbleLeftRightIcon,
    items: [
      {
        question: 'Comment envoyer un message ?',
        answer: 'Vous ne pouvez envoyer des messages qu\'aux personnes avec qui vous avez matché. Accédez à vos matchs et cliquez sur une conversation.',
      },
      {
        question: 'Puis-je envoyer des photos ?',
        answer: 'Oui, dans une conversation, cliquez sur l\'icône photo pour partager des images.',
      },
      {
        question: 'Comment bloquer quelqu\'un ?',
        answer: 'Dans la conversation, cliquez sur le menu (...) et sélectionnez "Bloquer". La personne ne pourra plus vous contacter.',
      },
      {
        question: 'Comment signaler un comportement inapproprié ?',
        answer: 'Utilisez l\'option "Signaler" dans le menu de la conversation ou du profil. Notre équipe examinera le signalement.',
      },
    ],
  },
  {
    id: 'premium',
    title: 'Premium & Paiements',
    icon: CreditCardIcon,
    items: [
      {
        question: 'Quels sont les avantages Premium ?',
        answer: 'Likes illimités, voir qui vous a liké, Super Likes, Boosts, filtres avancés et bien plus encore.',
      },
      {
        question: 'Comment m\'abonner à Premium ?',
        answer: 'Cliquez sur "Premium" dans le menu pour voir les offres disponibles et souscrire.',
      },
      {
        question: 'Puis-je annuler mon abonnement ?',
        answer: 'Oui, vous pouvez annuler à tout moment. Vous garderez les avantages jusqu\'à la fin de la période payée.',
      },
      {
        question: 'Les paiements sont-ils sécurisés ?',
        answer: 'Oui, tous les paiements sont traités via Stripe avec un chiffrement SSL/TLS.',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Confidentialité & Sécurité',
    icon: ShieldCheckIcon,
    items: [
      {
        question: 'Qui peut voir mon profil ?',
        answer: 'Seuls les utilisateurs connectés correspondant à vos critères de recherche peuvent voir votre profil.',
      },
      {
        question: 'Mes données sont-elles protégées ?',
        answer: 'Oui, nous respectons le RGPD et vos données sont chiffrées et stockées de manière sécurisée.',
      },
      {
        question: 'Puis-je télécharger mes données ?',
        answer: 'Oui, conformément au RGPD, vous pouvez demander une copie de vos données dans les paramètres.',
      },
      {
        question: 'Comment fonctionne la géolocalisation ?',
        answer: 'Nous utilisons votre ville pour vous montrer des profils proches. Votre position exacte n\'est jamais partagée.',
      },
    ],
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: BellIcon,
    items: [
      {
        question: 'Comment gérer mes notifications ?',
        answer: 'Dans les paramètres, section Notifications, vous pouvez activer/désactiver chaque type de notification.',
      },
      {
        question: 'Je ne reçois pas de notifications, que faire ?',
        answer: 'Vérifiez que les notifications sont activées dans les paramètres de l\'app et de votre appareil.',
      },
    ],
  },
];

export default function HelpPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<string>('account');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (categoryId: string, index: number) => {
    const key = `${categoryId}-${index}`;
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const currentCategory = faqCategories.find(c => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
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
            <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <QuestionMarkCircleIcon className="w-6 h-6 text-primary-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Centre d'aide</h1>
            <p className="text-sm text-gray-600">Trouvez des réponses à vos questions</p>
          </div>
        </motion.div>

        {/* Catégories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex overflow-x-auto gap-2 mb-6 pb-2"
        >
          {faqCategories.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {category.title}
              </button>
            );
          })}
        </motion.div>

        {/* FAQ Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="divide-y divide-gray-100">
            {currentCategory?.items.map((item, index) => {
              const isExpanded = expandedItems.has(`${activeCategory}-${index}`);
              return (
                <div key={index} className="p-3">
                  <button
                    onClick={() => toggleItem(activeCategory, index)}
                    className="w-full flex items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium text-gray-800 pr-4">{item.question}</span>
                    <ChevronDownIcon
                      className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-100">
                          {item.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </Card>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <Card className="p-4 bg-gradient-to-r from-primary-50 to-secondary-50 border-primary-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <EnvelopeIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-800 mb-1">
                  Vous n'avez pas trouvé votre réponse ?
                </h3>
                <p className="text-xs text-gray-600 mb-3">
                  Notre équipe support est là pour vous aider.
                </p>
                <Button
                  variant="gradient"
                  size="sm"
                  onClick={() => window.location.href = 'mailto:support@flowdating.com'}
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  Contacter le support
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 grid grid-cols-2 gap-3"
        >
          <Card
            className="p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/premium')}
          >
            <div className="flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Découvrir Premium</p>
                <p className="text-xs text-gray-500">Débloquez toutes les fonctionnalités</p>
              </div>
            </div>
          </Card>
          <Card
            className="p-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => router.push('/profile')}
          >
            <div className="flex items-center gap-2">
              <UserCircleIcon className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">Mon profil</p>
                <p className="text-xs text-gray-500">Gérer mes informations</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
