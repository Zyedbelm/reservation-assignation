
export const cleanJsonString = (jsonString: string): string => {
  console.log('🧹 Cleaning JSON string...');
  
  // Nettoyer les caractères de contrôle problématiques
  let cleaned = jsonString
    // Remplacer les caractères de contrôle par des espaces
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    // Nettoyer les séquences d'échappement mal formées
    .replace(/\\n/g, '\\n')
    .replace(/\\r/g, '\\r')
    .replace(/\\t/g, '\\t')
    // Nettoyer les sauts de ligne dans les chaînes JSON
    .replace(/"\s*\n\s*"/g, '\\n')
    .replace(/"\n/g, '\\n"')
    .replace(/\n"/g, '\\n"')
    // Supprimer les caractères Unicode problématiques
    .replace(/[\u2000-\u206F\u2E00-\u2E7F]/g, ' ')
    // Normaliser les espaces multiples
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`✅ JSON cleaned. Original length: ${jsonString.length}, Cleaned length: ${cleaned.length}`);
  return cleaned;
};
