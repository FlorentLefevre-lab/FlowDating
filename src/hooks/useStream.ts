// src/hooks/useStream.ts - Version corrigée
import { useState, useEffect } from 'react';
import { StreamChat } from 'stream-chat';
import { StreamVideoClient } from '@stream-io/video-react-sdk';
import type { User, UseStreamReturn } from '@/types/stream';

export function useStream(currentUser: User, otherUser?: User): UseStreamReturn {
  const [chatClient, setChatClient] = useState<any>(null);
  const [videoClient, setVideoClient] = useState<any>(null);
  const [channel, setChannel] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser?.id) {
      console.log('❌ useStream: currentUser.id manquant');
      setLoading(false);
      return;
    }

    const initializeStream = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔄 === DÉBUT INITIALISATION STREAM ===');
        console.log('🔄 Current User:', { id: currentUser.id, name: currentUser.name });
        console.log('🔄 Other User:', otherUser ? { id: otherUser.id, name: otherUser.name } : 'AUCUN');
        console.log('🔄 API Key:', process.env.NEXT_PUBLIC_STREAM_API_KEY ? 'DÉFINIE' : 'MANQUANTE');

        // 1. Vérifications préalables
        if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
          throw new Error('🔑 NEXT_PUBLIC_STREAM_API_KEY manquante dans .env.local');
        }

        // 2. Récupérer le token (côté serveur crée automatiquement les users)
        console.log('🔄 Récupération token...');
        
        const tokenResponse = await fetch('/api/stream/token', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 
            userId: currentUser.id,
            otherUserId: otherUser?.id // 🔥 Passer l'autre utilisateur
          })
        });

        console.log('📊 Réponse token - Status:', tokenResponse.status);
        
        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('❌ Erreur réponse token:', errorText);
          throw new Error(`Erreur API token (${tokenResponse.status}): ${errorText}`);
        }

        const tokenData = await tokenResponse.json();

        if (!tokenData.token) {
          console.error('❌ Token manquant dans réponse:', tokenData);
          throw new Error('Token manquant dans la réponse API');
        }

        setToken(tokenData.token);
        console.log('✅ Token récupéré avec succès');

        // 3. Initialiser le client Stream
        console.log('🔄 Initialisation client Stream...');
        
        const chat = StreamChat.getInstance(process.env.NEXT_PUBLIC_STREAM_API_KEY);
        console.log('✅ Instance StreamChat créée');

        // 4. Connexion utilisateur (PAS d'upsert ici, c'est fait côté serveur)
        console.log('🔄 Connexion utilisateur Stream...');
        
        const streamUser = {
          id: currentUser.id,
          name: currentUser.name || 'Utilisateur',
          image: currentUser.image || '/default-avatar.png',
        };

        await chat.connectUser(streamUser, tokenData.token);
        console.log('✅ Utilisateur connecté à Stream');

        setChatClient(chat);
        console.log('✅ Chat client configuré');

        // 5. Créer le channel si nécessaire
        if (otherUser) {
          console.log('🔄 Création/récupération channel...');
          
          const channelId = [currentUser.id, otherUser.id].sort().join('-');
          console.log('🔄 Channel ID:', channelId);
          
          const chatChannel = chat.channel('messaging', channelId, {
            members: [currentUser.id, otherUser.id],
            name: `${currentUser.name || 'User'} & ${otherUser.name || 'User'}`,
            created_by_id: currentUser.id,
          });
          
          console.log('🔄 Watch channel...');
          await chatChannel.watch();
          setChannel(chatChannel);
          console.log('✅ Channel créé/récupéré:', channelId);
        }

        // 6. Client vidéo (initialisation plus sûre)
        console.log('🔄 Initialisation client vidéo...');
        
        try {
          const video = new StreamVideoClient({
            apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY,
            user: streamUser,
            token: tokenData.token
          });
          
          // Optionnel : connecter explicitement le client vidéo
          await video.connectUser(streamUser, tokenData.token);
          
          setVideoClient(video);
          console.log('✅ Client vidéo initialisé');
        } catch (videoError) {
          console.error('❌ Erreur client vidéo:', videoError);
          // Ne pas fail pour le vidéo, continuer sans
          console.warn('⚠️ Continuons sans client vidéo...');
        }

        setLoading(false);
        console.log('🎉 === STREAM INITIALISÉ AVEC SUCCÈS ===');
        
      } catch (err) {
        console.error('❌ === ERREUR GÉNÉRALE STREAM ===');
        console.error('❌ Erreur:', err);
        
        if (err instanceof Error) {
          console.error('❌ Message:', err.message);
          console.error('❌ Stack:', err.stack);
        }
        
        setError(err instanceof Error ? err.message : 'Erreur inconnue lors de l\'initialisation');
        setLoading(false);
      }
    };

    initializeStream();

    // Cleanup function
    return () => {
      console.log('🧹 Cleanup Stream...');
      
      if (chatClient) {
        chatClient.disconnectUser()
          .then(() => console.log('✅ Chat déconnecté'))
          .catch((err: any) => console.warn('⚠️ Erreur déconnexion chat:', err));
      }
      
      if (videoClient) {
        videoClient.disconnectUser()
          .then(() => console.log('✅ Vidéo déconnectée'))
          .catch((err: any) => console.warn('⚠️ Erreur déconnexion vidéo:', err));
      }
    };
  }, [currentUser?.id, otherUser?.id]);

  return { 
    chatClient, 
    videoClient, 
    channel, 
    token, 
    loading, 
    error 
  };
}