import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 API préférences test - Body reçu:', body);
    
    // Version test qui renvoie simplement les données reçues
    return NextResponse.json({ 
      success: true, 
      data: body,
      message: 'Test API préférences fonctionne !' 
    }, { status: 200 });
    
  } catch (error) {
    console.error('Erreur API préférences:', error);
    return NextResponse.json({ 
      error: 'Erreur interne' 
    }, { status: 500 });
  }
}