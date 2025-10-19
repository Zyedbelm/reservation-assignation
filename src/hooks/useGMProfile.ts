
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUpdateGameMaster, useGameMasters } from '@/hooks/useGameMasters';
import { useUpdateProfile } from '@/hooks/useProfiles';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface GMProfileData {
  first_name: string;
  last_name: string;
  email: string;
  birth_date: string;
  avs_number: string;
  phone: string;
  address: string;
  hire_date: string;
}

export const useGMProfile = () => {
  const { profile, user } = useAuth();
  const { data: gameMasters = [] } = useGameMasters();
  const updateGM = useUpdateGameMaster();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<GMProfileData>({
    first_name: '',
    last_name: '',
    email: '',
    birth_date: '',
    avs_number: '',
    phone: '',
    address: '',
    hire_date: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  const currentGM = useMemo(() => {
    return gameMasters.find(gm => gm.id === profile?.gm_id);
  }, [gameMasters, profile?.gm_id]);

  useEffect(() => {
    if (!profile?.id || dataLoaded) {
      return;
    }
    
    if (profile.role === 'gm' && profile.gm_id && currentGM) {
      const initialData = {
        first_name: profile.first_name || currentGM.first_name || '',
        last_name: profile.last_name || currentGM.last_name || '',
        email: profile.email || currentGM.email || '',
        birth_date: currentGM.birth_date || '',
        avs_number: currentGM.avs_number || '',
        phone: currentGM.phone || '',
        address: currentGM.address || '',
        hire_date: currentGM.hire_date || ''
      };
      
      setFormData(initialData);
      setDataLoaded(true);
    } else if (profile.role === 'admin') {
      const initialData = {
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        birth_date: '',
        avs_number: '',
        phone: '',
        address: '',
        hire_date: ''
      };
      
      setFormData(initialData);
      setDataLoaded(true);
    }
  }, [profile?.id, profile?.role, profile?.gm_id, profile?.first_name, profile?.last_name, profile?.email, currentGM, dataLoaded]);

  const updateGMProfile = useCallback(async (updates: Partial<GMProfileData>) => {
    if (!profile?.id) {
      toast({
        title: "Erreur",
        description: "Profil non trouvé",
        variant: "destructive"
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Validation basique des champs obligatoires
      if (updates.first_name !== undefined && !updates.first_name.trim()) {
        toast({
          title: "Erreur",
          description: "Le prénom est obligatoire",
          variant: "destructive"
        });
        setIsLoading(false);
        return false;
      }

      if (updates.last_name !== undefined && !updates.last_name.trim()) {
        toast({
          title: "Erreur",
          description: "Le nom est obligatoire",
          variant: "destructive"
        });
        setIsLoading(false);
        return false;
      }

      if (updates.email !== undefined && !updates.email.trim()) {
        toast({
          title: "Erreur",
          description: "L'email est obligatoire",
          variant: "destructive"
        });
        setIsLoading(false);
        return false;
      }

      // Normalisation légère (trim) côté frontend
      const trim = (v: string | undefined) => (typeof v === 'string' ? v.trim() : v);
      const normalized: Partial<GMProfileData> = { ...updates };
      if (normalized.first_name !== undefined) normalized.first_name = trim(normalized.first_name) || '';
      if (normalized.last_name !== undefined) normalized.last_name = trim(normalized.last_name) || '';
      if (normalized.email !== undefined) normalized.email = trim(normalized.email) || '';
      if (normalized.birth_date !== undefined) normalized.birth_date = trim(normalized.birth_date) || '';
      if (normalized.phone !== undefined) normalized.phone = trim(normalized.phone) || '';
      if (normalized.address !== undefined) normalized.address = trim(normalized.address) || '';
      if (normalized.avs_number !== undefined) normalized.avs_number = trim(normalized.avs_number) || '';

      // Objets de mise à jour
      const profileUpdates: Record<string, any> = {};
      const gmUpdates: Record<string, any> = {};

      if (normalized.first_name !== undefined) {
        profileUpdates.first_name = normalized.first_name;
        gmUpdates.first_name = normalized.first_name;
      }
      if (normalized.last_name !== undefined) {
        profileUpdates.last_name = normalized.last_name;
        gmUpdates.last_name = normalized.last_name;
      }
      if (normalized.email !== undefined) {
        profileUpdates.email = normalized.email;
        gmUpdates.email = normalized.email;
      }

      // Mettre à jour la table profiles si nécessaire
      if (Object.keys(profileUpdates).length > 0) {
        // Résoudre un éventuel profil temporaire (id commençant par 'temp-')
        let targetProfileId = profile.id;
        if (targetProfileId.startsWith('temp-')) {
          try {
            const { data: dbProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', profile.email)
              .maybeSingle();

            if (dbProfile?.id) {
              targetProfileId = dbProfile.id as string;
            } else if (user?.id && profile.email) {
              const { data: upserted } = await supabase
                .from('profiles')
                .upsert(
                  {
                    user_id: user.id,
                    email: profile.email,
                    role: profile.role,
                    first_name: profile.first_name ?? null,
                    last_name: profile.last_name ?? null,
                  },
                  { onConflict: 'email', ignoreDuplicates: false }
                )
                .select('id')
                .single();
              if (upserted?.id) {
                targetProfileId = upserted.id as string;
              }
            }
          } catch (e) {
            console.warn('⚠️ Impossible de résoudre le profil temporaire:', e);
          }
        }

        await updateProfile.mutateAsync({
          id: targetProfileId,
          updates: profileUpdates,
        });
      }

      // Mettre à jour la table game_masters si GM et si nécessaire
      if (profile.role === 'gm' && profile.gm_id && Object.keys(normalized).length > 0) {
        // Filtrer les champs non modifiables + préparation GM updates
        Object.keys(normalized).forEach((key) => {
          if (key !== 'hire_date' && normalized[key as keyof GMProfileData] !== undefined) {
            gmUpdates[key] = normalized[key as keyof GMProfileData];
          }
        });

        // Normaliser avs_number: chaîne vide -> NULL (évite les conflits et garde la base propre)
        if (gmUpdates.avs_number !== undefined) {
          const avs = typeof gmUpdates.avs_number === 'string' ? gmUpdates.avs_number.trim() : gmUpdates.avs_number;
          gmUpdates.avs_number = avs ? avs : null;
        }

        // Mettre à jour le nom complet
        if (normalized.first_name !== undefined || normalized.last_name !== undefined) {
          const firstName = normalized.first_name !== undefined ? normalized.first_name : formData.first_name;
          const lastName = normalized.last_name !== undefined ? normalized.last_name : formData.last_name;
          gmUpdates.name = `${firstName} ${lastName}`.trim();
        }
        
        if (Object.keys(gmUpdates).length > 0) {
          await updateGM.mutateAsync({
            id: profile.gm_id,
            ...gmUpdates
          });
        }
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été sauvegardées avec succès",
      });

      return true;
    } catch (error) {
      console.error('❌ useGMProfile: Error updating profile:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour du profil",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile, formData.first_name, formData.last_name, updateGM, updateProfile, toast, user?.id]);

  const resetFormData = useCallback(() => {
    if (!profile || !dataLoaded) {
      return;
    }

    const resetData = profile.role === 'admin' ? {
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      email: profile.email || '',
      birth_date: '',
      avs_number: '',
      phone: '',
      address: '',
      hire_date: ''
    } : {
      first_name: profile.first_name || currentGM?.first_name || '',
      last_name: profile.last_name || currentGM?.last_name || '',
      email: profile.email || currentGM?.email || '',
      birth_date: currentGM?.birth_date || '',
      avs_number: currentGM?.avs_number || '',
      phone: currentGM?.phone || '',
      address: currentGM?.address || '',
      hire_date: currentGM?.hire_date || ''
    };
    
    setFormData(resetData);
  }, [profile, currentGM, dataLoaded]);

  return {
    formData,
    setFormData,
    updateGMProfile,
    resetFormData,
    isLoading,
    currentGM,
    dataLoaded
  };
};
