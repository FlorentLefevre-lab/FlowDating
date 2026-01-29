'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  Ban,
  Clock,
  Crown,
  Mail,
  MapPin,
  Shield,
  Trash2,
  User as UserIcon,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface UserDetail {
  id: string
  email: string
  name: string | null
  image: string | null
  age: number | null
  gender: string | null
  location: string | null
  bio: string | null
  accountStatus: string
  role: string
  isPremium: boolean
  isOnline: boolean
  lastSeen: string | null
  createdAt: string
  suspensionReason: string | null
  suspendedAt: string | null
  suspendedUntil: string | null
  photos: Array<{
    id: string
    url: string
    isPrimary: boolean
    moderationStatus: string
  }>
  _count: {
    likesGiven: number
    likesReceived: number
    matches: number
    reportsReceived: number
  }
  reportsReceived: Array<{
    id: string
    category: string
    description: string | null
    status: string
    createdAt: string
    reporter: { name: string | null; email: string }
  }>
  actionsReceived: Array<{
    id: string
    actionType: string
    details: any
    createdAt: string
    admin: { name: string | null; email: string }
  }>
}

type ActionType = 'suspend' | 'ban' | 'unban' | 'delete' | 'changeRole'

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  BANNED: 'bg-red-100 text-red-800'
}

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null)
  const [reason, setReason] = useState('')
  const [duration, setDuration] = useState('7')
  const [newRole, setNewRole] = useState('')

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${params.id}`)
      if (!res.ok) throw new Error('User not found')
      const data = await res.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error:', error)
      router.push('/admin/users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [params.id])

  const openActionDialog = (action: ActionType) => {
    setCurrentAction(action)
    setReason('')
    setDialogOpen(true)
  }

  const executeAction = async () => {
    if (!currentAction) return
    setActionLoading(true)

    try {
      const body: any = { action: currentAction, reason }
      if (currentAction === 'suspend') body.duration = parseInt(duration)
      if (currentAction === 'changeRole') body.newRole = newRole

      const method = currentAction === 'delete' ? 'DELETE' : 'PATCH'
      const res = await fetch(`/api/admin/users/${params.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Action failed')
      }

      if (currentAction === 'delete') {
        router.push('/admin/users')
      } else {
        await fetchUser()
      }
      setDialogOpen(false)
    } catch (error: any) {
      alert(error.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/users">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{user.name || 'Sans nom'}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge className={statusColors[user.accountStatus]}>
            {user.accountStatus}
          </Badge>
          {user.isPremium && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Crown className="h-3 w-3 mr-1" /> Premium
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="shrink-0">
                {user.photos[0]?.url ? (
                  <img
                    src={user.photos[0].url}
                    alt={user.name || 'User'}
                    className="h-32 w-32 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="space-y-2 flex-1">
                {user.age && <p><strong>Age:</strong> {user.age} ans</p>}
                {user.gender && <p><strong>Genre:</strong> {user.gender}</p>}
                {user.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {user.location}
                  </p>
                )}
                {user.bio && <p className="text-muted-foreground">{user.bio}</p>}
                <p className="text-sm text-muted-foreground">
                  Inscrit {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: fr })}
                </p>
                {user.lastSeen && (
                  <p className="text-sm text-muted-foreground">
                    Derniere connexion: {formatDistanceToNow(new Date(user.lastSeen), { addSuffix: true, locale: fr })}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold">{user._count.matches}</div>
                <div className="text-sm text-muted-foreground">Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{user._count.likesGiven}</div>
                <div className="text-sm text-muted-foreground">Likes donnes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{user._count.likesReceived}</div>
                <div className="text-sm text-muted-foreground">Likes recus</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{user._count.reportsReceived}</div>
                <div className="text-sm text-muted-foreground">Signalements</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {user.accountStatus === 'ACTIVE' && (
              <>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openActionDialog('suspend')}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Suspendre
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive"
                  onClick={() => openActionDialog('ban')}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Bannir
                </Button>
              </>
            )}
            {(user.accountStatus === 'SUSPENDED' || user.accountStatus === 'BANNED') && (
              <Button
                variant="outline"
                className="w-full justify-start text-green-600"
                onClick={() => openActionDialog('unban')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Reactiver
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => openActionDialog('changeRole')}
            >
              <Shield className="h-4 w-4 mr-2" />
              Changer le role ({user.role})
            </Button>
            <Button
              variant="destructive"
              className="w-full justify-start"
              onClick={() => openActionDialog('delete')}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer le compte
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Photos */}
      {user.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Photos ({user.photos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {user.photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt="Photo"
                    className="aspect-square rounded-lg object-cover"
                  />
                  <Badge
                    className={`absolute top-2 right-2 text-xs ${
                      photo.moderationStatus === 'APPROVED' ? 'bg-green-500' :
                      photo.moderationStatus === 'REJECTED' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}
                  >
                    {photo.moderationStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Reports */}
      {user.reportsReceived.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Signalements recus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user.reportsReceived.map((report) => (
                <div key={report.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{report.category}</Badge>
                    <Badge className={report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}>
                      {report.status}
                    </Badge>
                  </div>
                  {report.description && (
                    <p className="text-sm text-muted-foreground mb-2">{report.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Par {report.reporter.name || report.reporter.email} -{' '}
                    {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentAction === 'suspend' && 'Suspendre l\'utilisateur'}
              {currentAction === 'ban' && 'Bannir l\'utilisateur'}
              {currentAction === 'unban' && 'Reactiver l\'utilisateur'}
              {currentAction === 'delete' && 'Supprimer l\'utilisateur'}
              {currentAction === 'changeRole' && 'Changer le role'}
            </DialogTitle>
            <DialogDescription>
              {currentAction === 'delete' && 'Cette action est irreversible.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {currentAction === 'suspend' && (
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Duree de suspension" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 jour</SelectItem>
                  <SelectItem value="3">3 jours</SelectItem>
                  <SelectItem value="7">7 jours</SelectItem>
                  <SelectItem value="14">14 jours</SelectItem>
                  <SelectItem value="30">30 jours</SelectItem>
                </SelectContent>
              </Select>
            )}

            {currentAction === 'changeRole' && (
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Nouveau role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Utilisateur</SelectItem>
                  <SelectItem value="MODERATOR">Moderateur</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            )}

            {currentAction !== 'changeRole' && (
              <Textarea
                placeholder="Raison (optionnel)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={currentAction === 'delete' || currentAction === 'ban' ? 'destructive' : 'default'}
              onClick={executeAction}
              disabled={actionLoading || (currentAction === 'changeRole' && !newRole)}
            >
              {actionLoading ? 'Chargement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
