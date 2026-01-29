'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Flag } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Report {
  id: string
  category: string
  description: string | null
  status: string
  priority: number
  createdAt: string
  reporter: {
    id: string
    name: string | null
    email: string
  }
  targetUser: {
    id: string
    name: string | null
    email: string
  }
}

const categoryLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: 'Contenu inapproprie',
  HARASSMENT: 'Harcelement',
  FAKE_PROFILE: 'Faux profil',
  SPAM: 'Spam',
  UNDERAGE: 'Mineur',
  SCAM: 'Arnaque',
  OTHER: 'Autre'
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  UNDER_REVIEW: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  DISMISSED: 'bg-gray-100 text-gray-800'
}

const priorityColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-600',
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-red-100 text-red-800'
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')

  // Dialog states
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [resolution, setResolution] = useState('')
  const [userAction, setUserAction] = useState('none')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchReports = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/admin/moderation/reports?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [statusFilter])

  const handleResolve = async (action: 'resolve' | 'dismiss') => {
    if (!selectedReport) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/admin/moderation/reports/${selectedReport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          resolution,
          userAction: action === 'resolve' ? userAction : undefined
        })
      })
      if (!res.ok) throw new Error('Failed')
      await fetchReports()
      setDialogOpen(false)
      setSelectedReport(null)
      setResolution('')
      setUserAction('none')
    } catch (error) {
      console.error('Error:', error)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Signalements</h1>
          <p className="text-muted-foreground">
            {reports.length} signalement(s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="PENDING">En attente</SelectItem>
              <SelectItem value="UNDER_REVIEW">En cours</SelectItem>
              <SelectItem value="RESOLVED">Resolus</SelectItem>
              <SelectItem value="DISMISSED">Rejetes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Aucun signalement</p>
            <p className="text-muted-foreground">Tous les signalements ont ete traites</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className={report.priority === 2 ? 'border-destructive' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-destructive" />
                      <Badge variant="outline">{categoryLabels[report.category] || report.category}</Badge>
                      <Badge className={priorityColors[report.priority]}>
                        {report.priority === 0 ? 'Bas' : report.priority === 1 ? 'Moyen' : 'Urgent'}
                      </Badge>
                      <Badge className={statusColors[report.status]}>{report.status}</Badge>
                    </div>

                    {report.description && (
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <strong>Signale:</strong>{' '}
                        <Link
                          href={`/admin/users/${report.targetUser.id}`}
                          className="text-primary-600 hover:underline"
                        >
                          {report.targetUser.name || report.targetUser.email}
                        </Link>
                      </span>
                      <span>
                        <strong>Par:</strong>{' '}
                        <Link
                          href={`/admin/users/${report.reporter.id}`}
                          className="text-primary-600 hover:underline"
                        >
                          {report.reporter.name || report.reporter.email}
                        </Link>
                      </span>
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>

                  {report.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedReport(report)
                          setDialogOpen(true)
                        }}
                      >
                        Traiter
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Resolution Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Traiter le signalement</DialogTitle>
            <DialogDescription>
              {selectedReport && (
                <>
                  {categoryLabels[selectedReport.category]} contre{' '}
                  {selectedReport.targetUser.name || selectedReport.targetUser.email}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Action sur l'utilisateur</label>
              <Select value={userAction} onValueChange={setUserAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune action</SelectItem>
                  <SelectItem value="warn">Avertissement</SelectItem>
                  <SelectItem value="suspend">Suspension (7 jours)</SelectItem>
                  <SelectItem value="ban">Bannissement</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Resolution</label>
              <Textarea
                placeholder="Note de resolution..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => handleResolve('dismiss')}
              disabled={actionLoading}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeter
            </Button>
            <Button
              onClick={() => handleResolve('resolve')}
              disabled={actionLoading}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Resoudre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
