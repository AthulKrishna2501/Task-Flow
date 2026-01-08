import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Profile } from '@/types/database';
import { User, UserX, Mail, Clock, CheckCircle } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  is_approved: boolean;
  created_at: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

interface TeamMembersProps {
  teamMembers: TeamMember[];
  onRemoveMember?: (memberId: string, memberName: string) => void;
}

const TeamMembers = ({ teamMembers, onRemoveMember }: TeamMembersProps) => {
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <span>Team Members</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamMembers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No team members found
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {teamMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.name} 
                          className="rounded-xl w-10 h-10 object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 flex items-center justify-center text-gray-500">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant={member.is_approved ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {member.is_approved ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {onRemoveMember && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveMember(member.id, member.name)}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        aria-label={`Remove ${member.name}`}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="h-3 w-3 mr-1" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 text-sm">
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          <span className="font-medium">{member.completedTasks}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Done</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <Clock className="h-4 w-4 text-orange-500 mr-1" />
                          <span className="font-medium">{member.overdueTasks}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Overdue</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-500 mr-1" />
                          <span className="font-medium">{member.totalTasks}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Total</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamMembers;