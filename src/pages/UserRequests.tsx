import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DeadlineRequestCard } from '@/components/DeadlineRequestCard';
import { DeadlineRequest } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock } from 'lucide-react';

const UserRequests = () => {
  const [requests, setRequests] = useState<DeadlineRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 10;
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchRequests = async (isLoadMore = false, isSilent = false) => {
    if (!user) return;

    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else if (!isSilent) {
        setLoading(true);
      }

      const currentPage = isLoadMore ? page + 1 : 0;

      const { data, error } = await supabase
        .from('deadline_requests')
        .select(`
          *,
          task:tasks(*)
        `)
        .eq('requested_by', user.id)
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE - 1);

      if (error) throw error;

      const newRequests = (data || []) as DeadlineRequest[];
      if (isLoadMore) {
        setRequests(prev => [...prev, ...newRequests]);
        setPage(currentPage);
      } else {
        setRequests(newRequests);
        setPage(0);
      }

      setHasMore(newRequests.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const pendingRequests = requests.filter((r) => r.status === 'pending');
  const processedRequests = requests.filter((r) => r.status !== 'pending');

  if (loading) {
    return (
      <DashboardLayout title="My Requests">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Requests"
      description="Track your deadline change requests"
    >
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed">
            Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRequests.map((request) => (
              <DeadlineRequestCard
                key={request.id}
                request={request}
              />
            ))}
            {pendingRequests.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No pending requests</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="processed">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {processedRequests.map((request) => (
              <DeadlineRequestCard
                key={request.id}
                request={request}
              />
            ))}
            {processedRequests.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No processed requests yet</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div
          ref={(el) => {
            if (el && !loadingMore && !loading) {
              const observer = new IntersectionObserver(
                (entries) => {
                  if (entries[0].isIntersecting) {
                    fetchRequests(true);
                  }
                },
                { threshold: 0.1 }
              );
              observer.observe(el);
            }
          }}
          className="mt-8 flex justify-center py-8"
        >
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium uppercase tracking-widest opacity-60">Loading More Requests...</span>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default UserRequests;
