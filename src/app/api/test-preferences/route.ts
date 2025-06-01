import { NextRequest, NextResponse } from 'next/server';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🔥 Test préférences - Body reçu:', body);
    
    return NextResponse.json({ 
      success: true, 
      received: body,
      message: 'Test préférences fonctionne !' 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur test' }, { status: 500 });
  }
}