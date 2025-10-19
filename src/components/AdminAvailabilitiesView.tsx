
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Download, User, Clock } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { Badge } from '@/components/ui/badge';

const AdminAvailabilitiesView = () => {
  const { data: gameMasters = [] } = useGameMasters();
  const [selectedGMId, setSelectedGMId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: availabilities = [] } = useAvailabilities(
    selectedGMId || undefined,
    undefined // Nous filtrerons par période côté client
  );

  // Filtrer les disponibilités par période
  const filteredAvailabilities = availabilities.filter(availability => {
    if (!startDate && !endDate) return true;
    const availDate = new Date(availability.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && availDate < start) return false;
    if (end && availDate > end) return false;
    return true;
  });

  const selectedGM = gameMasters.find(gm => gm.id === selectedGMId);

  const handleExport = () => {
    if (filteredAvailabilities.length === 0) return;

    const csvContent = [
      ['Date', 'GM', 'Créneaux Disponibles'].join(','),
      ...filteredAvailabilities.map(availability => {
        const gm = gameMasters.find(g => g.id === availability.gm_id);
        return [
          new Date(availability.date).toLocaleDateString('fr-FR'),
          gm?.name || 'Inconnu',
          availability.time_slots.join(' | ')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `disponibilites_${selectedGM?.name || 'tous'}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Consultation des Disponibilités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="gm-select">Game Master</Label>
              <Select value={selectedGMId} onValueChange={setSelectedGMId}>
                <SelectTrigger id="gm-select">
                  <SelectValue placeholder="Tous les GMs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les Game Masters</SelectItem>
                  {gameMasters
                    .filter(gm => gm.is_active)
                    .map(gm => (
                      <SelectItem key={gm.id} value={gm.id}>
                        {gm.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleExport}
                disabled={filteredAvailabilities.length === 0}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </div>

          <div className="border rounded-lg">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="text-lg font-medium">
                Disponibilités trouvées: {filteredAvailabilities.length}
              </h3>
              {selectedGM && (
                <p className="text-sm text-gray-600">
                  Filtré pour: {selectedGM.name}
                </p>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filteredAvailabilities.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucune disponibilité trouvée
                  </h3>
                  <p className="text-gray-500">
                    Aucune disponibilité ne correspond aux critères sélectionnés.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAvailabilities.map(availability => {
                    const gm = gameMasters.find(g => g.id === availability.gm_id);
                    return (
                      <div key={availability.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span className="font-medium">
                                {new Date(availability.date).toLocaleDateString('fr-FR', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                            {gm && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-green-500" />
                                <span className="text-sm font-medium">{gm.name}</span>
                              </div>
                            )}
                          </div>
                          <Badge variant="outline">
                            {availability.time_slots.length} créneaux
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {availability.time_slots.map((slot, index) => (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {slot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAvailabilitiesView;
