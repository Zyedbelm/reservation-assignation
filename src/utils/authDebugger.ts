
export const debugAuthTokens = () => {
  console.log('🔍 === AUTH DEBUGGING ===');
  
  // Analyser l'URL actuelle
  const currentUrl = window.location.href;
  const hash = window.location.hash;
  const search = window.location.search;
  
  console.log('Current URL:', currentUrl);
  console.log('Hash fragment:', hash);
  console.log('Search params:', search);
  
  // Parser les paramètres
  const urlParams = new URLSearchParams(search);
  const hashParams = new URLSearchParams(hash.substring(1));
  
  console.log('URL Parameters:');
  for (const [key, value] of urlParams.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  console.log('Hash Parameters:');
  for (const [key, value] of hashParams.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  // Vérifier le localStorage
  console.log('LocalStorage auth keys:');
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase') || key.includes('auth')) {
      console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 50)}...`);
    }
  });
  
  console.log('🔍 === END DEBUG ===');
};

export const cleanupOldTokens = () => {
  console.log('🧹 Cleaning up old auth tokens...');
  
  Object.keys(localStorage).forEach(key => {
    if (key.includes('supabase.auth') || key.includes('sb-')) {
      console.log(`Removing: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Cleanup completed');
};
