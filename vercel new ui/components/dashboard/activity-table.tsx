"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react"

const activityData = [
  {
    id: 1,
    user: {
      name: "ნინო ბერიძე",
      email: "nino.b@example.com",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=32&h=32&fit=crop&crop=face",
      initials: "ნბ",
    },
    module: "კლინიკა",
    amount: "₾2,450.00",
    status: "დასრულებული",
  },
  {
    id: 2,
    user: {
      name: "გიორგი კახიძე",
      email: "g.kakhidze@example.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face",
      initials: "გკ",
    },
    module: "უძრავი ქონება",
    amount: "₾185,000.00",
    status: "მოლოდინში",
  },
  {
    id: 3,
    user: {
      name: "მარიამ ჯავახიშვილი",
      email: "mariam.j@example.com",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop&crop=face",
      initials: "მჯ",
    },
    module: "POS",
    amount: "₾847.50",
    status: "დასრულებული",
  },
  {
    id: 4,
    user: {
      name: "დავით მამულაშვილი",
      email: "d.mamulashvili@example.com",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=face",
      initials: "დმ",
    },
    module: "კლინიკა",
    amount: "₾1,200.00",
    status: "გაუქმებული",
  },
  {
    id: 5,
    user: {
      name: "ანა წერეთელი",
      email: "a.tsereteli@example.com",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=32&h=32&fit=crop&crop=face",
      initials: "აწ",
    },
    module: "უძრავი ქონება",
    amount: "₾320,000.00",
    status: "დასრულებული",
  },
  {
    id: 6,
    user: {
      name: "ლევან გიორგაძე",
      email: "l.giorgadze@example.com",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=32&h=32&fit=crop&crop=face",
      initials: "ლგ",
    },
    module: "POS",
    amount: "₾156.75",
    status: "მოლოდინში",
  },
]

const moduleColors: Record<string, string> = {
  "კლინიკა": "bg-primary/20 text-primary border-primary/30",
  "უძრავი ქონება": "bg-success/20 text-success border-success/30",
  "POS": "bg-warning/20 text-warning border-warning/30",
}

const statusColors: Record<string, string> = {
  "დასრულებული": "bg-success/20 text-success border-success/30",
  "მოლოდინში": "bg-warning/20 text-warning border-warning/30",
  "გაუქმებული": "bg-destructive/20 text-destructive border-destructive/30",
}

export function ActivityTable() {
  return (
    <div className="rounded-xl border border-glass-border bg-glass backdrop-blur-md">
      <div className="border-b border-border p-6">
        <h3 className="text-lg font-semibold text-foreground">ბოლო აქტივობა</h3>
        <p className="text-sm text-muted-foreground">
          უახლესი ტრანზაქციები ყველა მოდულიდან
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground">მომხმარებელი / კლიენტი</TableHead>
            <TableHead className="text-muted-foreground">მოდული</TableHead>
            <TableHead className="text-muted-foreground">თანხა / ღირებულება</TableHead>
            <TableHead className="text-muted-foreground">სტატუსი</TableHead>
            <TableHead className="text-right text-muted-foreground">მოქმედებები</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activityData.map((activity) => (
            <TableRow
              key={activity.id}
              className="border-border transition-colors hover:bg-secondary/30"
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 border border-border">
                    <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {activity.user.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{activity.user.name}</p>
                    <p className="text-sm text-muted-foreground">{activity.user.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    moduleColors[activity.module]
                  )}
                >
                  {activity.module}
                </Badge>
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {activity.amount}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    statusColors[activity.status]
                  )}
                >
                  {activity.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">მენიუს გახსნა</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="mr-2 size-4" />
                      დეტალების ნახვა
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="mr-2 size-4" />
                      რედაქტირება
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 size-4" />
                      წაშლა
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
