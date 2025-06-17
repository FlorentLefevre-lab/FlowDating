// =====================================================
// src/hooks/useChatModal.ts
// =====================================================
'use client'

import { useState, useCallback } from 'react'

interface ChatModalState {
  isOpen: boolean
  targetUserId: string | null
  targetUserName: string | null
  matchId: string | null
  channelId: string | null
  isCreatingChannel: boolean
  error: string | null
}

export function useChatModal() {
  const [state, setState] = useState<ChatModalState>({
    isOpen: false,
    targetUserId: null,
    targetUserName: null,
    matchId: null,
    channelId: null,
    isCreatingChannel: false,
    error: null
  })

  // Ouvrir le chat avec un utilisateur spécifique
  const openChat = useCallback(async (targetUserId: string, matchId: string, targetUserName?: string) => {
    setState(prev => ({ 
      ...prev, 
      isCreatingChannel: true, 
      error: null,
      targetUserId,
      targetUserName: targetUserName || null,
      matchId
    }))

    try {
      console.log(`🔄 [CHAT] Création/Ouverture channel avec ${targetUserName} (${targetUserId})`)

      // Créer ou récupérer le channel
      const response = await fetch('/api/chat/create-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: targetUserId, 
          matchId 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur création channel')
      }

      const { channelId } = await response.json()
      console.log(`✅ [CHAT] Channel créé/récupéré: ${channelId}`)

      // Ouvrir le modal avec le channelId
      setState({
        isOpen: true,
        targetUserId,
        targetUserName: targetUserName || null,
        matchId,
        channelId,
        isCreatingChannel: false,
        error: null
      })

    } catch (error) {
      console.error('❌ [CHAT] Erreur ouverture chat:', error)
      setState(prev => ({
        ...prev,
        isCreatingChannel: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }))
    }
  }, [])

  // Fermer le chat
  const closeChat = useCallback(() => {
    setState({
      isOpen: false,
      targetUserId: null,
      targetUserName: null,
      matchId: null,
      channelId: null,
      isCreatingChannel: false,
      error: null
    })
  }, [])

  // Ouvrir directement avec un channelId existant
  const openExistingChannel = useCallback((channelId: string, targetUserName?: string) => {
    setState({
      isOpen: true,
      targetUserId: null,
      targetUserName: targetUserName || null,
      matchId: null,
      channelId,
      isCreatingChannel: false,
      error: null
    })
  }, [])

  return {
    ...state,
    openChat,
    closeChat,
    openExistingChannel
  }
}