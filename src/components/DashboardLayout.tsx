import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Bell, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationContext';
import { Notification } from '@/types/notifications';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
}

export const DashboardLayout = ({
  children,
  title,
  description,
  actions,
}: DashboardLayoutProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="-ml-2" />
            <div className="flex-1">
              {title && (
                <h1 className="text-xl font-semibold text-foreground text-balance">{title}</h1>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-10 w-10">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between border-b px-4 py-3">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mark all
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={clearAll}
                        disabled={notifications.length === 0}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-[350px]">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="flex flex-col">
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`flex flex-col gap-1 border-b px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer ${!n.read ? 'bg-primary/5' : ''
                              }`}
                            onClick={() => markAsRead(n.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-sm font-semibold ${!n.read ? 'text-primary' : ''}`}>
                                {n.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap mt-1">
                                {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {n.description}
                            </p>
                            {!n.read && (
                              <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </header>
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};
