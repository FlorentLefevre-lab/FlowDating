'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Heart, Flag, Image, TrendingUp, Activity } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'

interface Stats {
  kpis: {
    totalUsers: number
    newUsersToday: number
    newUsersWeek: number
    newUsersMonth: number
    activeUsersToday: number
    activeUsersWeek: number
    totalMatches: number
    matchesToday: number
    matchesWeek: number
    totalLikes: number
    likesToday: number
    pendingPhotos: number
    pendingReports: number
  }
  charts: {
    userGrowth: Array<{ date: string; count: number }>
    matchesGrowth: Array<{ date: string; count: number }>
  }
  retention: {
    day1: number
    day7: number
  }
}

function KPICard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  color = 'text-primary-600'
}: {
  title: string
  value: string | number
  subValue?: string
  icon: React.ElementType
  trend?: 'up' | 'down'
  color?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend === 'up' && <span className="text-green-600">+</span>}
            {subValue}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) throw new Error('Failed to fetch stats')
        const data = await res.json()
        setStats(data.data)
      } catch (err) {
        setError('Erreur lors du chargement des statistiques')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">{error || 'Erreur de chargement'}</p>
      </div>
    )
  }

  const { kpis, charts, retention } = stats

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de l'activite de Flow Dating
        </p>
      </div>

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Utilisateurs"
          value={kpis.totalUsers}
          subValue={`${kpis.newUsersToday} aujourd'hui`}
          icon={Users}
          trend="up"
        />
        <KPICard
          title="Utilisateurs Actifs"
          value={kpis.activeUsersToday}
          subValue={`${kpis.activeUsersWeek} cette semaine`}
          icon={Activity}
          color="text-green-600"
        />
        <KPICard
          title="Matches"
          value={kpis.totalMatches}
          subValue={`${kpis.matchesToday} aujourd'hui`}
          icon={Heart}
          color="text-pink-600"
          trend="up"
        />
        <KPICard
          title="Likes"
          value={kpis.totalLikes}
          subValue={`${kpis.likesToday} aujourd'hui`}
          icon={TrendingUp}
          color="text-blue-600"
        />
      </div>

      {/* Moderation Alerts */}
      {(kpis.pendingPhotos > 0 || kpis.pendingReports > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {kpis.pendingPhotos > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="flex items-center gap-4 pt-6">
                <Image className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="font-semibold text-orange-900">
                    {kpis.pendingPhotos} photos en attente
                  </p>
                  <p className="text-sm text-orange-700">
                    Moderation requise
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          {kpis.pendingReports > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-4 pt-6">
                <Flag className="h-8 w-8 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">
                    {kpis.pendingReports} signalements en attente
                  </p>
                  <p className="text-sm text-red-700">
                    Action requise
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Croissance Utilisateurs (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                    formatter={(value: number) => [value, 'Nouveaux utilisateurs']}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#ec4899"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Matches Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Matches (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.matchesGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString('fr-FR')}
                    formatter={(value: number) => [value, 'Matches']}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention */}
      <Card>
        <CardHeader>
          <CardTitle>Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-8">
            <div>
              <p className="text-3xl font-bold text-primary-600">{retention.day1}%</p>
              <p className="text-sm text-muted-foreground">Jour 1</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-600">{retention.day7}%</p>
              <p className="text-sm text-muted-foreground">Jour 7</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
