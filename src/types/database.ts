export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'completed';
export type AppRole = 'admin' | 'user';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Task {
  id: string;
  task_name: string;
  assigned_user_id: string;
  status: TaskStatus;
  start_time: string | null;
  finish_time: string | null;
  deadline: string;
  created_by: string;
  pending_approval: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_user?: Profile;
  deadline_requested?: boolean;
}

export interface DeadlineRequest {
  id: string;
  task_id: string;
  requested_by: string;
  current_deadline: string;
  requested_deadline: string;
  reason: string;
  status: RequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined data
  task?: Task;
  requester?: Profile;
}
