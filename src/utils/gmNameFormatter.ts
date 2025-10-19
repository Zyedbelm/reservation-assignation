// Utilitaire pour formater les noms des Game Masters de manière cohérente
export interface GMNameData {
  first_name?: string;
  last_name?: string;
  email?: string;
  name?: string;
}

/**
 * Formate le nom d'un GM selon la priorité :
 * 1. Prénom + Nom si disponibles
 * 2. Partie avant @ de l'email si pas de prénom/nom
 * 3. Le champ name en fallback
 */
export const formatGMName = (gm: GMNameData): string => {
  // Priorité 1 : Prénom et Nom
  if (gm.first_name && gm.last_name) {
    return `${gm.first_name} ${gm.last_name}`;
  }

  // Si on a seulement le prénom ou le nom
  if (gm.first_name) {
    return gm.first_name;
  }
  
  if (gm.last_name) {
    return gm.last_name;
  }

  // Priorité 2 : Partie avant @ de l'email
  if (gm.email) {
    const emailPrefix = gm.email.split('@')[0];
    if (emailPrefix) {
      return emailPrefix;
    }
  }

  // Fallback : champ name
  return gm.name || 'GM inconnu';
};