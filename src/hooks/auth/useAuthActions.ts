
import { supabase } from '@/integrations/supabase/client';
import { cleanupAuthState } from '@/utils/authCleanup';

export const useAuthActions = () => {
  const signIn = async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout failed, continuing with signin');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      console.log('Sign in result:', data, error);
      
      if (data.user && !error) {
        setTimeout(() => {
          window.location.href = '/';
        }, 100);
      }
      
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    console.log('Attempting sign up for:', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: firstName,
          last_name: lastName
        }
      }
    });
    
    console.log('Sign up result:', data, error);
    return { data, error };
  };

  const signOut = async () => {
    console.log('🚪 Starting sign out process');
    
    try {
      cleanupAuthState();
      
      try {
        const { error } = await supabase.auth.signOut({ scope: 'global' });
        if (error) {
          console.error('❌ Global signout error:', error);
        } else {
          console.log('✅ Global signout successful');
        }
      } catch (err) {
        console.error('❌ Global signout failed:', err);
      }
      
      console.log('🔄 Forcing page reload for clean state');
      window.location.href = '/';
      
      return { error: null };
    } catch (error) {
      console.error('💥 Sign out error:', error);
      return { error };
    }
  };

  return { signIn, signUp, signOut };
};
