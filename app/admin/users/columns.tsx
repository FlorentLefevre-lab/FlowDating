"use client"

import { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header"
import { Crown, Shield, User as UserIcon, Eye } from "lucide-react"

export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  age: number | null
  gender: string | null
  location: string | null
  accountStatus: string
  role: string
  isPremium: boolean
  isOnline: boolean
  lastSeen: string | null
  createdAt: string
  matchesCount: number
  photosCount: number
  reportsCount: number
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  SUSPENDED: "bg-yellow-100 text-yellow-800",
  BANNED: "bg-red-100 text-red-800",
  DELETED: "bg-gray-100 text-gray-800",
  PENDING_VERIFICATION: "bg-blue-100 text-blue-800",
}

const roleIcons: Record<string, React.ReactNode> = {
  ADMIN: <Shield className="h-4 w-4 text-purple-600" />,
  MODERATOR: <Shield className="h-4 w-4 text-blue-600" />,
  USER: <UserIcon className="h-4 w-4 text-gray-400" />,
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Utilisateur" />
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="flex items-center gap-3">
          <div className="relative">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || "User"}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            {user.isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {user.name || "Sans nom"}
              {user.isPremium && <Crown className="h-4 w-4 text-yellow-500" />}
            </div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const user = row.original
      const searchValue = value.toLowerCase()
      return (
        (user.name?.toLowerCase().includes(searchValue) ?? false) ||
        user.email.toLowerCase().includes(searchValue)
      )
    },
  },
  {
    accessorKey: "accountStatus",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statut" />
    ),
    cell: ({ row }) => {
      const status = row.getValue("accountStatus") as string
      return (
        <Badge className={statusColors[status] || "bg-gray-100"}>
          {status}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value === "all" || row.getValue(id) === value
    },
  },
  {
    accessorKey: "role",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Role" />
    ),
    cell: ({ row }) => {
      const role = row.getValue("role") as string
      return (
        <div className="flex items-center gap-1">
          {roleIcons[role]}
          <span className="text-sm">{role}</span>
        </div>
      )
    },
    filterFn: (row, id, value) => {
      return value === "all" || row.getValue(id) === value
    },
  },
  {
    accessorKey: "matchesCount",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Stats" />
    ),
    cell: ({ row }) => {
      const user = row.original
      return (
        <div className="text-sm">
          <div>{user.matchesCount} matches</div>
          {user.reportsCount > 0 && (
            <div className="text-destructive">
              {user.reportsCount} signalement{user.reportsCount > 1 ? "s" : ""}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Inscription" />
    ),
    cell: ({ row }) => {
      const date = row.getValue("createdAt") as string
      return (
        <div className="text-sm">
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })}
        </div>
      )
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original
      return (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/users/${user.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      )
    },
  },
]
