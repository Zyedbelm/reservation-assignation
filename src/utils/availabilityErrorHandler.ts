import { supabase } from '@/integrations/supabase/client';

export interface AvailabilityDiagnostic {
  gmId: string;
  hasProfile: boolean;
  hasPermissions: boolean;
  existingAvailabilitiesCount: number;
  lastAvailabilityDate?: string;
  errors: string[];
}

export const diagnoseAvailabilityIssues = async (gmId: string): Promise<AvailabilityDiagnostic> => {
  const diagnostic: AvailabilityDiagnostic = {
    gmId,
    hasProfile: false,
    hasPermissions: false,
    existingAvailabilitiesCount: 0,
    errors: []
  };

  try {
    // 1. Vérifier le profil GM
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gm_id, role')
      .eq('gm_id', gmId)
      .single();

    if (profileError) {
      diagnostic.errors.push(`Profil GM introuvable: ${profileError.message}`);
    } else {
      diagnostic.hasProfile = true;
      
      if (profile.role !== 'gm') {
        diagnostic.errors.push(`Rôle incorrect: ${profile.role} (attendu: gm)`);
      }
    }

    // 2. Tester les permissions en essayant de lire les disponibilités
    const { data: availabilities, error: permError } = await supabase
      .from('gm_availabilities')
      .select('id, date')
      .eq('gm_id', gmId)
      .limit(1);

    if (permError) {
      diagnostic.errors.push(`Permissions insuffisantes: ${permError.message}`);
    } else {
      diagnostic.hasPermissions = true;
    }

    // 3. Compter les disponibilités existantes
    const { count, error: countError } = await supabase
      .from('gm_availabilities')
      .select('*', { count: 'exact', head: true })
      .eq('gm_id', gmId);

    if (countError) {
      diagnostic.errors.push(`Erreur de comptage: ${countError.message}`);
    } else {
      diagnostic.existingAvailabilitiesCount = count || 0;
    }

    // 4. Récupérer la dernière disponibilité
    const { data: lastAvail, error: lastError } = await supabase
      .from('gm_availabilities')
      .select('date')
      .eq('gm_id', gmId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastError && lastAvail) {
      diagnostic.lastAvailabilityDate = lastAvail.date;
    }

  } catch (error: any) {
    diagnostic.errors.push(`Erreur système: ${error.message}`);
  }

  return diagnostic;
};

export const getErrorMessageForCode = (errorCode: string): string => {
  const errorMap: Record<string, string> = {
    '23505': 'Cette date a déjà des disponibilités enregistrées',
    '42501': 'Permissions insuffisantes - contactez l\'administrateur',
    '23503': 'Référence invalide - profil GM introuvable',
    '08P01': 'Erreur de connexion à la base de données',
    '42P01': 'Table introuvable - problème de configuration',
    '42703': 'Champ manquant dans la requête'
  };

  return errorMap[errorCode] || `Erreur technique (code: ${errorCode})`;
};

export const formatAvailabilityError = (error: any): string => {
  if (typeof error === 'string') return error;
  
  if (error?.code) {
    return getErrorMessageForCode(error.code);
  }
  
  if (error?.message) {
    // Identifier les erreurs spécifiques
    if (error.message.includes('unique constraint')) {
      return 'Cette date a déjà des disponibilités - elles seront mises à jour';
    }
    if (error.message.includes('permission denied')) {
      return 'Permissions insuffisantes - veuillez vous reconnecter';
    }
    if (error.message.includes('network')) {
      return 'Problème de connexion - nouvelle tentative automatique';
    }
    if (error.message.includes('timeout')) {
      return 'Délai d\'attente dépassé - veuillez réessayer';
    }
    
    return error.message;
  }
  
  return 'Erreur inconnue lors de l\'opération';
};