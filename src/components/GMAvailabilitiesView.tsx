
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock } from 'lucide-react';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { Badge } from '@/components/ui/badge';

interface GMAvailabilitiesViewProps {
  gmId: string;
}

const GMAvailabilitiesView = ({ gmId }: GMAvailabilitiesViewProps) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: availabilities = [], isLoading } = useAvailabilities(gmId);

  // Filtrer les disponibilités par période
  const filteredAvailabilities = availabilities.filter(availability => {
    const availDate = new Date(availability.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    // Si aucune date n'est spécifiée, afficher seulement à partir d'aujourd'hui
    if (!startDate && !endDate) {
      return availDate >= today;
    }
    
    // Si des dates spécifiques sont définies, les utiliser
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    if (start && availDate < start) return false;
    if (end && availDate > end) return false;
    return true;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Disponibilités du GM</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Chargement...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Disponibilités du GM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="border rounded-lg">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="text-lg font-medium">
              Disponibilités trouvées: {filteredAvailabilities.length}
            </h3>
            {(startDate || endDate) ? (
              <p className="text-sm text-gray-600">
                Période: {startDate || 'Début'} - {endDate || 'Fin'}
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Affichage à partir d'aujourd'hui
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
                  {startDate || endDate 
                    ? "Aucune disponibilité dans la période sélectionnée."
                    : "Ce GM n'a pas de disponibilités à partir d'aujourd'hui."
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredAvailabilities.map(availability => (
                  <div key={availability.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
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
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GMAvailabilitiesView;
