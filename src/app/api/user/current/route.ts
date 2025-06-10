// src/app/api/user/current/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'  // ✅ Nouveau import v5
import { prisma } from '../../../../lib/db'

export async function GET(request: NextRequest) {
  const session = await auth()  // ✅ Nouvelle syntaxe v5
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        age: true,
        bio: true,
        location: true,
        profession: true,
        gender: true,
        interests: true,
        createdAt: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}