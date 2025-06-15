import { NextApiRequest, NextApiResponse } from 'next';
import { auth } from '@/lib/auth'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await auth();
  
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  if (req.method === 'POST') {
    try {
      const { imageUrl } = req.body; // URL venant de Cloudinary

      if (!imageUrl) {
        return res.status(400).json({ error: 'URL de l\'image requise' });
      }

      // Vérifier le nombre de photos existantes
      const existingPhotos = await prisma.photo.count({
        where: { userId: user.id }
      });

      if (existingPhotos >= 6) {
        return res.status(400).json({ error: 'Maximum 6 photos autorisées' });
      }

      const photo = await prisma.photo.create({
        data: {
          userId: user.id,
          url: imageUrl,
          isPrimary: existingPhotos === 0 // Première photo = photo principale
        }
      });

      return res.status(201).json(photo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erreur lors de l\'ajout de la photo' });
    }
  }

  return res.status(405).json({ error: 'Méthode non autorisée' });
}