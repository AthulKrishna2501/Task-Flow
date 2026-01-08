import { supabase } from '@/integrations/supabase/client';

interface ApprovalResult {
  success: boolean;
  error?: string;
  data?: any;
}

export const adminService = {
  // Function to approve a user
  async approveUser(userId: string): Promise<ApprovalResult> {
    try {
      // First, try the direct database approach (this might fail due to RLS)
      const { error: profileError, data } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        console.error('Direct DB update failed, attempting fallback methods:', profileError);
        
        // If direct update fails, we might need to use a Supabase Function
        // This is a fallback approach - in a real implementation, you'd call an edge function
        // that runs with service role privileges
        
        // For now, let's try using a custom Supabase function if it exists
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('approve_user', { target_user_id: userId });
        
        if (rpcError) {
          console.error('RPC function also failed:', rpcError);
          return {
            success: false,
            error: `Failed to approve user. Database error: ${rpcError.message}. This may require database configuration.`
          };
        }
        
        return {
          success: true,
          data: rpcResult
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error in approveUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve user'
      };
    }
  },

  // Function to reject a user
  async rejectUser(userId: string): Promise<ApprovalResult> {
    try {
      // Delete from profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (profileError) {
        console.error('Profile deletion failed:', profileError);
        return {
          success: false,
          error: `Failed to delete profile: ${profileError.message}`
        };
      }

      // Delete from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) {
        console.error('Role deletion failed:', roleError);
        return {
          success: false,
          error: `Failed to delete user role: ${roleError.message}`
        };
      }

      // Delete from auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userId);

      if (authError) {
        console.error('Auth deletion failed:', authError);
        return {
          success: false,
          error: `Failed to delete user from auth: ${authError.message}`
        };
      }

      return {
        success: true
      };
    } catch (error) {
      console.error('Error in rejectUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject user'
      };
    }
  },

  // Function to promote user to admin
  async promoteToAdmin(userId: string): Promise<ApprovalResult> {
    try {
      // Check if user already has a role
      const { data: existingRole, error: checkError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single();

      let result;
      if (checkError && checkError.code !== 'PGRST116') {
        // Different error than "not found"
        return {
          success: false,
          error: `Error checking existing role: ${checkError.message}`
        };
      }

      if (existingRole) {
        // Update existing role
        const { error, data } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Failed to update role: ${error.message}`
          };
        }
        result = data;
      } else {
        // Insert new role
        const { error, data } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' })
          .select()
          .single();

        if (error) {
          return {
            success: false,
            error: `Failed to create role: ${error.message}`
          };
        }
        result = data;
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('Error in promoteToAdmin:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to promote user to admin'
      };
    }
  },

  // Function to demote user to regular user
  async demoteToUser(userId: string): Promise<ApprovalResult> {
    try {
      const { error, data } = await supabase
        .from('user_roles')
        .update({ role: 'user' })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update role: ${error.message}`
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error in demoteToUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to demote user'
      };
    }
  }
};