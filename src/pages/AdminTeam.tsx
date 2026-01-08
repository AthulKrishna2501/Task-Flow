import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Profile, UserRole, Task } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { adminService } from '@/lib/adminService';
import { Shield, User, ListTodo, UserPlus } from 'lucide-react';

interface TeamMember extends Profile {
  role?: UserRole;
  taskCount?: number;
}

const AdminTeam = () => {
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAllTeamMembers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Fetch task counts
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('assigned_user_id');

      if (tasksError) throw tasksError;

      // Combine data
      const membersWithData = (profiles || []).map((profile) => {
        const role = roles?.find((r) => r.user_id === profile.id);
        const taskCount = tasks?.filter((t) => t.assigned_user_id === profile.id).length || 0;
        return {
          ...profile,
          role: role as UserRole | undefined,
          taskCount,
        };
      });

      setAllMembers(membersWithData as TeamMember[]);
    } catch (error) {
      console.error('Error fetching team members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
    }
  };

  const fetchPendingApprovalMembers = async () => {
    try {
      const { data: pendingProfiles, error: pendingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_approved', false) // Only users not yet approved
        .order('created_at');

      if (pendingError) throw pendingError;

      setPendingMembers(pendingProfiles || []);
    } catch (error) {
      console.error('Error fetching pending approval members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending approval members',
        variant: 'destructive',
      });
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchAllTeamMembers(),
      fetchPendingApprovalMembers()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handlePromoteToAdmin = async (userId: string) => {
    console.log('Attempting to promote user with ID:', userId); // Debug log

    try {
      const result = await adminService.promoteToAdmin(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to promote user to admin');
      }

      console.log('Promotion result:', result.data); // Debug log

      // Refresh all data first to ensure UI is updated
      await fetchAllData();

      // Only show success message after data has been refreshed
      toast({
        title: 'Role Updated',
        description: 'User has been promoted to admin',
      });
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleDemoteToUser = async (userId: string) => {
    console.log('Attempting to demote user with ID:', userId); // Debug log

    try {
      const result = await adminService.demoteToUser(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to demote user');
      }

      console.log('Demotion result:', result.data); // Debug log

      // Refresh all data first to ensure UI is updated
      await fetchAllData();

      // Only show success message after data has been refreshed
      toast({
        title: 'Role Updated',
        description: 'User role changed to team member',
      });
    } catch (error) {
      console.error('Error demoting user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleApproveUser = async (userId: string) => {
    console.log('Attempting to approve user with ID:', userId); // Debug log

    try {
      // Use the admin service to approve the user
      const result = await adminService.approveUser(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve user');
      }

      console.log('User successfully approved:', result.data);

      // Refresh all data first to ensure UI is updated
      await fetchAllData();

      // Only show success message after data has been refreshed
      toast({
        title: 'User Approved',
        description: 'User has been approved and can now access the system',
      });
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve user',
        variant: 'destructive',
      });
    }
  };

  const handleRejectUser = async (userId: string) => {
    console.log('Attempting to reject user with ID:', userId); // Debug log

    try {
      const result = await adminService.rejectUser(userId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject user');
      }

      console.log('User successfully rejected'); // Debug log

      // Refresh all data first to ensure UI is updated
      await fetchAllData();

      // Only show success message after data has been refreshed
      toast({
        title: 'User Rejected',
        description: 'User registration has been rejected and account deleted',
      });
    } catch (error) {
      console.error('Error rejecting user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject user',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <DashboardLayout title="Team Members">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Team Management"
      description="Manage your team and pending registrations"
    >
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members">Team Members</TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingMembers.length > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-xs flex items-center justify-center text-white">
                {pendingMembers.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allMembers
              .filter(member => member.is_approved) // Only show approved members
              .map((member) => (
                <Card key={member.id} className="transition-all hover:shadow-hover animate-fade-in">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(member.full_name, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {member.full_name || 'Unnamed User'}
                          </h3>
                          {member.role?.role === 'admin' ? (
                            <Badge variant="default" className="gap-1">
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <User className="h-3 w-3" />
                              Member
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                          <ListTodo className="h-4 w-4" />
                          <span>{member.taskCount} tasks assigned</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t flex gap-2">
                      {member.role?.role === 'admin' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleDemoteToUser(member.id)}
                        >
                          Remove Admin
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePromoteToAdmin(member.id)}
                        >
                          Make Admin
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            {allMembers.filter(member => member.is_approved).length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No approved team members yet</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingMembers.map((member) => (
              <Card key={member.id} className="transition-all hover:shadow-hover animate-fade-in">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(member.full_name, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">
                          {member.full_name || 'Unnamed User'}
                        </h3>
                        <Badge variant="outline" className="gap-1">
                          <UserPlus className="h-3 w-3" />
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Registered: {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApproveUser(member.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRejectUser(member.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {pendingMembers.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No pending registrations</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default AdminTeam;
