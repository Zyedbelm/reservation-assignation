
import { FileText } from 'lucide-react';

interface EventDescriptionFormatterProps {
  description: string;
}

const EventDescriptionFormatter = ({ description }: EventDescriptionFormatterProps) => {
  console.log('🔧 EventDescriptionFormatter - Description reçue:', description?.substring(0, 100) + '...');
  
  if (!description) return null;

  // Helper function to parse and organize description content
  const parseDescription = (desc: string) => {
    const lines = desc.split('\n').filter(line => line.trim());

    // Remove EVJF-related lines everywhere (case-insensitive)
    const filteredLines = lines.filter(line => !/evjf/i.test(line));

    const optionsSet = new Set<string>();
    const processedLines: string[] = [];

    // Patterns to detect options even outside the classic section
    const optionPatterns = [
      /^\s*[•\-–—]\s+.+/,
      /option/i,
      /(planchette|photo|souvenir|boisson|anniversaire|cadeau|privatisation)/i
    ];

    let inOptionsSection = false;

    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];

      // Detect player count line (ends with "joueurs")
      if (/\d+\s+joueurs?$/.test(line)) {
        processedLines.push(line);
        inOptionsSection = true;
        continue;
      }

      // Detect date line (contains day name and year)
      if (/(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche).+\d{4}/i.test(line)) {
        inOptionsSection = false;
        processedLines.push(line);
        continue;
      }

      const isOptionLike = optionPatterns.some((p) => p.test(line));
      const isContactOrPrice = line.includes('@') || line.includes('CHF');

      if ((inOptionsSection || isOptionLike) && line.trim() && !isContactOrPrice) {
        optionsSet.add(line.replace(/^\s*[•\-–—]\s*/, '').trim());
      } else {
        processedLines.push(line);
      }
    }

    return { processedLines, options: Array.from(optionsSet) };
  };

  // Split by any long dash separator (5 or more dashes)
  const parts = description.split(/\n?[-–—]{5,}\n?/);
  
  if (parts.length >= 2) {
    const headerInfo = parts[0].trim();
    const reservationDetails = parts[1].trim();

    // Parse header info
    const headerData = parseDescription(headerInfo);
    
    // Parse reservation details
    const detailData = parseDescription(reservationDetails);
    const allOptions = [...headerData.options, ...detailData.options];

    return (
      <div className="space-y-4">
        {/* Header Section */}
        {headerData.processedLines.length > 0 && (
          <div className="p-3 bg-blue-50 rounded-md border-l-4 border-blue-400">
            <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              Informations générales
            </h5>
            <div className="space-y-1 text-sm text-blue-800">
              {headerData.processedLines.map((line, index) => (
                <div key={index} className="break-words">
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options Section */}
        {allOptions.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
            <h5 className="font-medium text-amber-900 mb-2 flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4" />
              Options sélectionnées
            </h5>
            <div className="space-y-1 text-sm text-amber-800">
              {allOptions.map((option, index) => (
                <div key={index} className="break-words font-medium">
                  • {option}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details Section */}
        <div className="p-3 bg-gray-50 rounded-md border">
          <h5 className="font-medium text-gray-900 mb-2 text-sm">Détails de la réservation</h5>
          <div className="space-y-1 text-sm text-gray-700">
            {detailData.processedLines.map((line, index) => {
              // Simple highlighting based on content
              let className = "break-words";
              const monthsRegex = /(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)/i;
              
              if (line.includes('@') || line.includes('CHF') || line.includes('Total') || 
                  line.includes('Prix') || line.includes('Acompte') || line.includes('Versé')) {
                className = "break-words font-medium text-gray-900";
              } else if (line.match(/\d{4}/) || monthsRegex.test(line) || line.includes(':')) {
                className = "break-words font-medium text-blue-700";
              } else if (line.includes('+41') || line.includes('079') || line.includes('078')) {
                className = "break-words font-medium text-green-700";
              }

              return (
                <div key={index} className={className}>
                  {line}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Fallback: simple formatted text
  const fallbackData = parseDescription(description);
  
  return (
    <div className="space-y-4">
      {/* Options Section */}
      {fallbackData.options.length > 0 && (
        <div className="p-3 bg-amber-50 rounded-md border-l-4 border-amber-400">
          <h5 className="font-medium text-amber-900 mb-2 flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4" />
            Options sélectionnées
          </h5>
          <div className="space-y-1 text-sm text-amber-800">
            {fallbackData.options.map((option, index) => (
              <div key={index} className="break-words font-medium">
                • {option}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className="p-3 bg-gray-50 rounded-md border">
        <h5 className="font-medium text-gray-900 mb-2 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Détails de la réservation
        </h5>
        <div className="space-y-1 text-sm text-gray-700">
          {fallbackData.processedLines.map((line, index) => (
            <div key={index} className="break-words">
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventDescriptionFormatter;
