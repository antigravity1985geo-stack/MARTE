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

export interface ActivityRowProps {
  id: string
  user: string
  action: string
  target: string
  time: string
  status: string
}

const defaultActivities: ActivityRowProps[] = [
  {
    id: "1",
    user: "გიორგი მახარაძე",
    action: "გაყიდვა",
    target: "#TRX-8472",
    time: "2 წთ წინ",
    status: "დასრულებული",
  },
  {
    id: "2",
    user: "ნინო აბაშიძე",
    action: "ინვენტარი",
    target: "პარაცეტამოლი 500მგ",
    time: "15 წთ წინ",
    status: "გაფრთხილება",
  },
]

const statusColors: Record<string, string> = {
  "დასრულებული": "bg-success/20 text-success border-success/30",
  "მოლოდინში": "bg-warning/20 text-warning border-warning/30",
  "გაუქმებული": "bg-destructive/20 text-destructive border-destructive/30",
  "გაფრთხილება": "bg-warning/20 text-warning border-warning/30",
}

export function ActivityTable({ data }: { data?: ActivityRowProps[] }) {
  const displayData = data && data.length > 0 ? data : defaultActivities;

  return (
    <div className="rounded-xl border border-glass-border bg-glass p-6 backdrop-blur-md">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">ბოლო აქტივობა</h3>
        <p className="text-sm text-muted-foreground">
          უახლესი ტრანზაქციები ყველა მოდულიდან
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent border-b">
            <TableHead className="text-muted-foreground">მომხმარებელი</TableHead>
            <TableHead className="text-muted-foreground">მოქმედება</TableHead>
            <TableHead className="text-muted-foreground">ობიექტი</TableHead>
            <TableHead className="hidden text-muted-foreground lg:table-cell">დრო</TableHead>
            <TableHead className="text-muted-foreground">სტატუსი</TableHead>
            <TableHead className="text-right text-muted-foreground">მოქმედებები</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((activity) => (
            <TableRow
              key={activity.id}
              className="group border-glass-border hover:bg-white/5"
            >
              <TableCell className="py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {activity.user?.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {activity.user}
                    </div>
                    <div className="text-xs text-muted-foreground lg:hidden">
                      {activity.time}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4">
                <span className="text-sm font-medium text-foreground">
                  {activity.action}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <span className="text-sm text-muted-foreground">
                  {activity.target}
                </span>
              </TableCell>
              <TableCell className="hidden py-4 lg:table-cell">
                <span className="text-sm text-muted-foreground">
                  {activity.time}
                </span>
              </TableCell>
              <TableCell className="py-4">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    statusColors[activity.status] || "bg-muted text-muted-foreground"
                  )}
                >
                  {activity.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right py-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground">
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
