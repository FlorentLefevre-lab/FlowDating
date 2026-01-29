'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, X, AlertTriangle, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Photo {
  id: string
  url: string
  userId: string
  moderationStatus: string
  nsfwScore: number | null
  autoFlagged: boolean
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function PhotoModerationPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/moderation/photos?status=PENDING')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPhotos()
  }, [])

  const moderatePhoto = async (photoId: string, action: 'approve' | 'reject') => {
    setActionLoading(photoId)
    try {
      const res = await fetch(`/api/admin/moderation/photos/${photoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      if (!res.ok) throw new Error('Failed')
      setPhotos(prev => prev.filter(p => p.id !== photoId))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Moderation des photos</h1>
          <p className="text-muted-foreground">
            {photos.length} photo(s) en attente de moderation
          </p>
        </div>
        <Button variant="outline" onClick={fetchPhotos}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Aucune photo en attente</p>
            <p className="text-muted-foreground">Toutes les photos ont ete moderees</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <Card key={photo.id} className={photo.autoFlagged ? 'border-destructive' : ''}>
              <CardContent className="p-4">
                <div className="relative">
                  <img
                    src={photo.url}
                    alt="Photo a moderer"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  {photo.autoFlagged && (
                    <Badge className="absolute top-2 right-2 bg-destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Flagged
                    </Badge>
                  )}
                  {photo.nsfwScore !== null && (
                    <Badge
                      variant="secondary"
                      className="absolute bottom-2 left-2"
                    >
                      NSFW: {Math.round(photo.nsfwScore * 100)}%
                    </Badge>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/admin/users/${photo.userId}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {photo.user.name || photo.user.email}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(photo.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => moderatePhoto(photo.id, 'approve')}
                      disabled={actionLoading === photo.id}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approuver
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => moderatePhoto(photo.id, 'reject')}
                      disabled={actionLoading === photo.id}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Rejeter
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
