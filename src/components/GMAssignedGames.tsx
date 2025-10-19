import { useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DateRangeSelector from "./DateRangeSelector";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Activity } from "@/hooks/useActivities";
import { findMatchingGame } from "@/utils/eventGameMappings";

interface GMAssignedGamesProps {
  gmId: string;
}

interface EnrichedActivity extends Activity {
  detectedGameName: string | null;
  detectedDuration: number | null;
}

const toISODate = (d: Date | undefined) => (d ? format(d, "yyyy-MM-dd") : undefined);

const GMAssignedGames = ({ gmId }: GMAssignedGamesProps) => {
  const [startDate, setStartDate] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(() => endOfWeek(new Date(), { weekStartsOn: 1 }));

  const isoStart = useMemo(() => toISODate(startDate), [startDate]);
  const isoEnd = useMemo(() => toISODate(endDate), [endDate]);

  const {
    data: activities = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<EnrichedActivity[]>({
    queryKey: ["gm-assigned-games", gmId, isoStart, isoEnd],
    enabled: !!gmId && !!isoStart && !!isoEnd,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("assigned_gm_id", gmId)
        .gte("date", isoStart!)
        .lte("date", isoEnd!)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) throw error;

      const rows = (data || []) as Activity[];

      // Enrich with detected game name and duration via mapping service (cached)
      const enriched = await Promise.all(
        rows.map(async (a) => {
          try {
            const match = await findMatchingGame(a.title);
            return {
              ...a,
              detectedGameName: match.gameName,
              detectedDuration: match.averageDuration,
            } as EnrichedActivity;
          } catch {
            return { ...a, detectedGameName: null, detectedDuration: null } as EnrichedActivity;
          }
        })
      );

      return enriched;
    },
  });

  const totalMinutes = useMemo(
    () => (activities?.reduce((acc, a) => acc + (a.duration || 0), 0) || 0),
    [activities]
  );
  const totalHours = useMemo(() => (totalMinutes / 60).toFixed(1), [totalMinutes]);

  const resetToThisWeek = () => {
    setStartDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setEndDate(endOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Fenêtre d'analyse</span>
              <div className="flex flex-col sm:flex-row gap-3">
                <DateRangeSelector
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={setStartDate}
                  onEndDateChange={setEndDate}
                />
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={resetToThisWeek}>Cette semaine</Button>
                  <Button variant="outline" onClick={() => refetch()}>Rafraîchir</Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Période</div>
                <div className="text-sm">
                  {startDate && endDate
                    ? `${format(startDate, "dd MMM yyyy", { locale: fr })} → ${format(endDate, "dd MMM yyyy", { locale: fr })}`
                    : "—"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Volume</div>
                <div className="text-sm">{activities?.length || 0} événements • {totalHours} h</div>
              </div>
            </div>
          </div>

          <div className="border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Chargement…
              </div>
            ) : isError ? (
              <div className="p-4 text-destructive text-sm">Erreur: {(error as any)?.message || "inconnue"}</div>
            ) : activities.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Aucun événement trouvé sur cette période.</div>
            ) : (
              <Table>
                <TableCaption>Événements assignés au GM sélectionné</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Heure</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Jeu détecté</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.date}</TableCell>
                      <TableCell>
                        {a.start_time} – {a.end_time}
                      </TableCell>
                      <TableCell>{a.title}</TableCell>
                      <TableCell>{a.detectedGameName || "—"}</TableCell>
                      <TableCell className="text-right">{a.duration} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GMAssignedGames;
