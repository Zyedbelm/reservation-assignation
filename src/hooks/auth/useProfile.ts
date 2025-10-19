
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string | null;
  email: string;
  role: 'admin' | 'gm';
  gm_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  gm_auto_create_disabled?: boolean;
  created_at: string;
  updated_at: string;
}

export const useProfile = (user: User | null) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const ensureGmLink = async (
    uid: string,
    email: string,
    firstName?: string | null,
    lastName?: string | null
  ) => {
    console.log('🔧 Ensuring GM linkage for user:', email);
    try {
      const { data, error } = await supabase.rpc('ensure_gm_profile_for_user', {
        p_user_id: uid,
        p_email: email,
        p_first: firstName ?? null,
        p_last: lastName ?? null,
      });

      if (error) {
        console.error('❌ ensure_gm_profile_for_user error:', error);
        return null;
      }

      return data as string | null; // gm_id
    } catch (error) {
      console.error('💥 Error in ensureGmLink:', error);
      return null;
    }
  };

  const fetchProfile = async (user: User) => {
    console.log('🔍 Fetching profile for user:', user.email);
    setLoading(true);
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      const { data: existingProfile, error: fetchError } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (fetchError) {
        console.error('❌ Error fetching profile:', fetchError);
        
        if (fetchError.message?.includes('Load failed') || fetchError.message?.includes('timeout')) {
          console.log('🔄 Network error detected, attempting recovery...');
          
          try {
            const isAdmin = user.email === 'info@genieculturel.ch';
            const role = isAdmin ? 'admin' : 'gm';
            
            const { data: recoveryProfile, error: recoveryError } = await supabase
              .from('profiles')
              .upsert({
                user_id: user.id,
                email: user.email || '',
                role: role,
                first_name: user.user_metadata?.first_name || null,
                last_name: user.user_metadata?.last_name || null
              }, {
                onConflict: 'email',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (!recoveryError && recoveryProfile) {
              const finalProfile = {
                ...recoveryProfile,
                role: recoveryProfile.role as 'admin' | 'gm'
              } as Profile;
              
              setProfile(finalProfile);
              setLoading(false);
              return finalProfile;
            }
          } catch (recoveryError) {
            console.error('❌ Recovery attempt failed:', recoveryError);
          }
        }
        
        setLoading(false);
        return null;
      }

      if (existingProfile) {
        if (!existingProfile.user_id || existingProfile.user_id !== user.id) {
          console.log('🔗 Linking existing profile to current user');
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ user_id: user.id })
            .eq('id', existingProfile.id)
            .select()
            .single();

          if (updateError) {
            console.error('❌ Error linking profile to user:', updateError);
            const finalProfile = {
              ...existingProfile,
              role: existingProfile.role as 'admin' | 'gm'
            } as Profile;
            setProfile(finalProfile);
            setLoading(false);
            return finalProfile;
          }
          
          const linkedProfile = {
            ...updatedProfile,
            role: updatedProfile.role as 'admin' | 'gm'
          } as Profile;

          if (linkedProfile.role === 'gm' && !linkedProfile.gm_id && !linkedProfile.gm_auto_create_disabled) {
            const gmId = await ensureGmLink(
              user.id,
              linkedProfile.email,
              linkedProfile.first_name || '',
              linkedProfile.last_name || ''
            );
            if (gmId) linkedProfile.gm_id = gmId;
          }

          setProfile(linkedProfile);
          setLoading(false);
          return linkedProfile;
        }
        
        const finalProfile = {
          ...existingProfile,
          role: existingProfile.role as 'admin' | 'gm'
        } as Profile;

        if (finalProfile.role === 'gm' && !finalProfile.gm_id && !finalProfile.gm_auto_create_disabled) {
          const gmId = await ensureGmLink(
            user.id,
            finalProfile.email,
            finalProfile.first_name || '',
            finalProfile.last_name || ''
          );
          if (gmId) finalProfile.gm_id = gmId;
        }

        setProfile(finalProfile);
        setLoading(false);
        return finalProfile;
      }

      console.log('➕ Creating new profile for user:', user.email);
      const isAdmin = user.email === 'info@genieculturel.ch';
      const role = isAdmin ? 'admin' : 'gm';
      
      // Extraire nom et prénom des métadonnées utilisateur ou de l'email
      const firstName = user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '';
      const lastName = user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';
      
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email: user.email || '',
          role: role,
          first_name: firstName,
          last_name: lastName
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating profile:', createError);
        setLoading(false);
        return null;
      }

      const createdProfile = {
        ...newProfile,
        role: newProfile.role as 'admin' | 'gm'
      } as Profile;

      if (role === 'gm') {
        const gmId = await ensureGmLink(
          user.id,
          createdProfile.email,
          firstName,
          lastName
        );
        if (gmId) createdProfile.gm_id = gmId;
      }

      // Envoyer email de confirmation pour les nouveaux utilisateurs
      if (createdProfile.email) {
        try {
          await supabase.functions.invoke('send-auth-emails', {
            body: {
              type: 'confirmation',
              email: createdProfile.email,
              name: `${firstName} ${lastName}`.trim() || 'Nouvel utilisateur'
            }
          });
        } catch (emailError) {
          console.error('❌ Error sending confirmation email:', emailError);
        }
      }

      setProfile(createdProfile);
      setLoading(false);
      return createdProfile;
    } catch (error) {
      console.error('💥 Error in fetchProfile:', error);
      setLoading(false);
      
      if (user?.email) {
        const isAdmin = user.email === 'info@genieculturel.ch';
        const basicProfile: Profile = {
          id: 'temp-' + user.id,
          user_id: user.id,
          email: user.email,
          role: isAdmin ? 'admin' : 'gm',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('⚠️ Using temporary profile due to persistent errors');
        setProfile(basicProfile);
        return basicProfile;
      }
      
      return null;
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfile(user);
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, user?.email]); // Optimized dependencies

  return { profile, loading: loading };
};
