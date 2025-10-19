/**
 * Extrait les options sélectionnées d'une description d'événement
 * Formats supportés: 
 * 1. Checkbox explicites: [x], [X], ✓, ☑, ✔, ✅, ☒, avec ou sans puces (-, *, •)
 * 2. Puces simples avec mots-clés ou dans sections "Options"
 */
export const extractOptions = (description: string): string[] => {
  if (!description) return [];
  
  // Normaliser: remplacer \r\n par \n, convertir <br> en \n, enlever les balises HTML
  const normalized = description
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  
  const lines = normalized.split('\n');
  const options: string[] = [];
  
  // 1. Détection checkbox (format explicite)
  const checkboxRegex = /^[-*•]?\s*(?:\[(?:x|X)\]|[✓☑✔✅☒])\s*(.+)$/;
  
  for (const raw of lines) {
    const line = raw.trim();
    const match = checkboxRegex.exec(line);
    
    if (match && match[1]) {
      const optionText = match[1].trim();
      if (optionText) {
        options.push(optionText);
      }
    }
  }
  
  // Si on a trouvé des options via checkbox, on retourne directement
  if (options.length > 0) {
    return options;
  }
  
  // 2. Fallback heuristique: détecter les options sans checkbox
  const optionsSet = new Set<string>();
  const filteredLines = lines.filter(line => line.trim());
  
  // Patterns pour identifier des lignes d'options
  const bulletRegex = /^\s*[•\-–—\*]\s+(.+)/;
  const keywordRegex = /(option|planchette|photo|souvenir|boisson|anniversaire|cadeau|privatisation|extra|supplément)/i;
  
  let inOptionsSection = false;
  
  for (let i = 0; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    
    // Détecter le début d'une section d'options
    if (/options?:/i.test(line) || /\d+\s+joueurs?$/i.test(line)) {
      inOptionsSection = true;
      continue;
    }
    
    // Détecter la fin d'une section d'options (date ou séparation)
    if (/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche).+\d{4}/i.test(line) || line.match(/^[-=_]{3,}$/)) {
      inOptionsSection = false;
      continue;
    }
    
    // Exclure les lignes avec emails ou prix
    if (line.includes('@') || /CHF|€|\$/.test(line)) {
      continue;
    }
    
    // Matcher les lignes avec puces
    const bulletMatch = bulletRegex.exec(line);
    const hasKeyword = keywordRegex.test(line);
    
    // Ajouter si: dans section options OU a une puce OU contient un mot-clé
    if (inOptionsSection || bulletMatch || hasKeyword) {
      let optionText = bulletMatch ? bulletMatch[1].trim() : line.trim();
      
      // Exclure la phrase EVJF sauf si elle contient TRUE
      if (/EVJF.*Sélectionne si tu veux l'option/i.test(optionText) && !/TRUE/i.test(optionText)) {
        continue;
      }
      
      if (optionText && optionText.length > 2) {
        optionsSet.add(optionText);
      }
    }
  }
  
  return Array.from(optionsSet);
};
