'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircleIcon, HeartIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Card, Button } from '@/components/ui';
import Link from 'next/link';

function DonateSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id');
  const provider = searchParams.get('provider');
  const paypalToken = searchParams.get('token');

  // Capturer le paiement PayPal si nécessaire
  useEffect(() => {
    const capturePayPalPayment = async () => {
      if (provider === 'paypal' && paypalToken && !isCapturing) {
        setIsCapturing(true);
        try {
          const response = await fetch('/api/donate/paypal/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: paypalToken }),
          });

          const data = await response.json();

          if (!response.ok) {
            setCaptureError(data.error || 'Erreur lors de la confirmation du paiement');
          }
        } catch (error) {
          console.error('PayPal capture error:', error);
          setCaptureError('Erreur lors de la confirmation du paiement');
        } finally {
          setIsCapturing(false);
        }
      }
    };

    capturePayPalPayment();
  }, [provider, paypalToken, isCapturing]);

  if (captureError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h1>
          <p className="text-gray-600 mb-6">{captureError}</p>
          <Button onClick={() => router.push('/donate')} variant="outline">
            Retour aux dons
          </Button>
        </Card>
      </div>
    );
  }

  if (isCapturing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <HeartIconSolid className="w-8 h-8 text-pink-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Confirmation en cours...</h1>
          <p className="text-gray-600">Veuillez patienter pendant que nous confirmons votre don.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 text-center bg-white/80 backdrop-blur shadow-xl border-pink-100">
          {/* Animation de succès */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
            className="relative"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
              <CheckCircleIcon className="w-12 h-12 text-white" />
            </div>

            {/* Confettis animés */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute inset-0 pointer-events-none"
            >
              {['💖', '✨', '🎉', '💕', '⭐'].map((emoji, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 0, x: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [-20, -60],
                    x: [(i - 2) * 20, (i - 2) * 40],
                  }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 1.5 }}
                  className="absolute left-1/2 top-0 text-2xl"
                >
                  {emoji}
                </motion.span>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Merci infiniment !
            </h1>
            <p className="text-gray-600 mb-6">
              Votre don a ete recu avec succes. Vous faites partie des personnes qui rendent Flow Dating possible.
            </p>

            {/* Ce que votre don permet */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <SparklesIcon className="w-5 h-5 text-pink-500" />
                Votre don permet
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">•</span>
                  De maintenir les serveurs en ligne
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">•</span>
                  De developper de nouvelles fonctionnalites
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-pink-500">•</span>
                  De rester independants et sans pub
                </li>
              </ul>
            </div>

            {/* Avantages donateur */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <HeartIcon className="w-5 h-5 text-yellow-600" />
                Vos avantages donateur
              </h3>
              <p className="text-sm text-yellow-700">
                Un badge special sera bientot ajoute a votre profil ! Rejoignez aussi notre Discord pour acceder a la communaute des supporters.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link href="/discover" className="block">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white">
                  <HeartIconSolid className="w-5 h-5 mr-2" />
                  Continuer a decouvrir
                </Button>
              </Link>
              <Link href="/donate" className="block">
                <Button variant="outline" className="w-full">
                  Faire un autre don
                </Button>
              </Link>
            </div>
          </motion.div>
        </Card>

        {/* Message de partage */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-gray-500 mt-6"
        >
          Parlez de Flow Dating a vos amis, c'est le meilleur soutien !
        </motion.p>
      </motion.div>
    </div>
  );
}

// Loading fallback pour Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <HeartIconSolid className="w-8 h-8 text-pink-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Chargement...</h1>
      </Card>
    </div>
  );
}

export default function DonateSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DonateSuccessContent />
    </Suspense>
  );
}
