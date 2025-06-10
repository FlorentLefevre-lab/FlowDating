// src/app/api/stream/debug/route.ts - API de debug Stream

import { StreamChat } from 'stream-chat';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

export async function GET() {
  try {
    console.log('🔍 === DEBUG STREAM CONFIG ===');
    
    // Vérifications basiques
    const checks = {
      apiKey: !!process.env.NEXT_PUBLIC_STREAM_API_KEY,
      apiSecret: !!process.env.STREAM_API_SECRET,
      apiKeyLength: process.env.NEXT_PUBLIC_STREAM_API_KEY?.length || 0,
      apiSecretLength: process.env.STREAM_API_SECRET?.length || 0,
    };
    
    console.log('📊 Checks config:', checks);

    if (!process.env.NEXT_PUBLIC_STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Clés Stream manquantes',
        checks
      });
    }

    // Test de création d'instance
    let serverClient;
    try {
      serverClient = StreamChat.getInstance(
        process.env.NEXT_PUBLIC_STREAM_API_KEY,
        process.env.STREAM_API_SECRET
      );
      console.log('✅ Instance serveur créée');
    } catch (instanceError) {
      console.error('❌ Erreur instance serveur:', instanceError);
      return NextResponse.json({
        success: false,
        error: 'Erreur création instance Stream',
        details: instanceError instanceof Error ? instanceError.message : instanceError,
        checks
      });
    }

    // Test de génération de token
    const testUserId = 'test-user-' + Date.now();
    let token;
    try {
      token = serverClient.createToken(testUserId);
      console.log('✅ Token test généré');
    } catch (tokenError) {
      console.error('❌ Erreur génération token:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Erreur génération token',
        details: tokenError instanceof Error ? tokenError.message : tokenError,
        checks
      });
    }

    // Test de création d'utilisateur
    try {
      await serverClient.upsertUser({
        id: testUserId,
        name: 'Test User',
        role: 'user',
      });
      console.log('✅ Utilisateur test créé');
      
      // Supprimer l'utilisateur test
      await serverClient.deleteUser(testUserId, { mark_messages_deleted: true });
      console.log('✅ Utilisateur test supprimé');
      
    } catch (userError) {
      console.error('❌ Erreur utilisateur test:', userError);
      return NextResponse.json({
        success: false,
        error: 'Erreur création utilisateur test',
        details: userError instanceof Error ? userError.message : userError,
        checks
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration Stream OK',
      checks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erreur debug Stream:', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur générale',
      details: error instanceof Error ? error.message : error
    }, { status: 500 });
  }
}