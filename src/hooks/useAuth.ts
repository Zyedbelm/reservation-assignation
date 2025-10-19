
import { useAuthState } from './auth/useAuthState';
import { useAuthActions } from './auth/useAuthActions';
import { useProfile } from './auth/useProfile';

export type { Profile } from './auth/useProfile';

export const useAuth = () => {
  const { user, session, loading: authLoading } = useAuthState();
  const { profile, loading: profileLoading } = useProfile(user);
  const { signIn, signUp, signOut } = useAuthActions();

  const loading = authLoading || profileLoading;

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin: profile?.role === 'admin',
    isGM: profile?.role === 'gm'
  };
};
