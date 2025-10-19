
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings } from 'lucide-react';
import SyncStatusIndicator from './SyncStatusIndicator';
import SyncStatsDisplay from './sync/SyncStatsDisplay';
import SyncActions from './sync/SyncActions';

const EnhancedSyncConfiguration = () => {
  const [syncPeriodMonths, setSyncPeriodMonths] = useState(3);

  return (
    <div className="space-y-6">
      {/* Statut de synchronisation */}
      <SyncStatusIndicator />

      {/* Configuration améliorée */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Synchronisation Intelligente (v2.0)
          </CardTitle>
          <CardDescription>
            Synchronisation différentielle qui ne traite que les vrais changements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration période */}
          <div className="space-y-2">
            <Label htmlFor="sync-period">Période de synchronisation (mois)</Label>
            <Input
              id="sync-period"
              type="number"
              min="1"
              max="12"
              value={syncPeriodMonths}
              onChange={(e) => setSyncPeriodMonths(parseInt(e.target.value) || 3)}
              className="max-w-xs"
            />
          </div>

          <Separator />

          {/* Actions principales */}
          <SyncActions syncPeriodMonths={syncPeriodMonths} />

          <Separator />

          {/* Statistiques et informations */}
          <SyncStatsDisplay syncPeriodMonths={syncPeriodMonths} />
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedSyncConfiguration;
