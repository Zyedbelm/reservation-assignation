import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatGMName } from '@/utils/gmNameFormatter';
import { format, eachMonthOfInterval, parseISO } from 'date-fns';
import { findMatchingGame } from '@/utils/unifiedGameMappingService';

export interface MonthlyReport {
  id: string;
  month_year: string;
  gm_id: string;
  total_hours: number;
  gaming_hours: number;
  formation_hours: number;
  maintenance_hours: number;
  admin_hours: number;
  travaux_informatiques_hours: number;
  menage_hours: number;
  earnings: number;
  report_data: any;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  game_masters?: {
    name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

interface ManualEntry {
  date: string;
  hours: number;
  activity_type: 'gaming' | 'formation' | 'maintenance' | 'admin' | 'travaux_informatiques' | 'menage';
  description: string;
}

interface ReportData {
  manual_entries?: ManualEntry[];
  activities?: any[];
  [key: string]: any;
}

export const useMonthlyReports = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['monthly-reports', startDate, endDate],
    queryFn: async () => {
      if (!startDate || !endDate) {
        return [];
      }

      // Utiliser format au lieu de toISOString pour éviter les problèmes de fuseau
      const formattedStartDate = format(parseISO(startDate), 'yyyy-MM-dd');
      const formattedEndDate = format(parseISO(endDate), 'yyyy-MM-dd');

      // Récupérer toutes les activités avec leurs assignations
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          game_masters!assigned_gm_id (
            name,
            first_name,
            last_name,
            email
          ),
          event_assignments!left (
            gm_id,
            status,
            game_masters!event_assignments_gm_id_fkey (
              name,
              first_name,
              last_name,
              email
            )
          )
        `)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate)
        .order('date', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Grouper par GM et mois avec gestion multi-GM via event_assignments
      const reportsMap = new Map();

      for (const activity of activities || []) {
        const monthYear = activity.date.slice(0, 7); // YYYY-MM

        // Déterminer la durée effective (priorité aux mappings de jeux pour les activités gaming)
        let effectiveDurationMinutes = activity.duration;
        let durationSource = 'activity';
        
        if (activity.activity_type === 'gaming' && activity.title) {
          try {
            const gameMatch = await findMatchingGame(activity.title);
            if (gameMatch.averageDuration && gameMatch.confidence > 80) {
              effectiveDurationMinutes = gameMatch.averageDuration;
              durationSource = 'game_mapping';
              console.log(`📊 [REPORTS] Utilisation durée admin pour "${activity.title}": ${effectiveDurationMinutes}min (${durationSource})`);
            }
          } catch (error) {
            console.warn(`⚠️ [REPORTS] Erreur lors de la résolution du jeu pour "${activity.title}":`, error);
          }
        }

        const hours = effectiveDurationMinutes / 60; // Convertir minutes en heures

        // Créer un Set pour éviter les doublons de GM pour la même activité
        const uniqueGMs = new Set<string>();

        // Récupérer les GMs assignés via event_assignments (multi-GM) - inclusion plus large
        const eventAssignments = activity.event_assignments
          ?.filter((assignment: any) => 
            assignment.gm_id && 
            !['removed', 'cancelled'].includes(assignment.status || '')
          ) || [];

        // Si on a des event_assignments valides, les utiliser EXCLUSIVEMENT
        if (eventAssignments.length > 0) {
          eventAssignments.forEach((assignment: any) => {
            if (assignment.gm_id) {
              uniqueGMs.add(assignment.gm_id);
            }
          });
        } else if (activity.assigned_gm_id) {
          // Fallback vers assigned_gm_id uniquement s'il n'y a pas d'event_assignments valides
          uniqueGMs.add(activity.assigned_gm_id);
        }

        // Si aucun GM n'est trouvé, ignorer cette activité
        if (uniqueGMs.size === 0) {
          continue;
        }

        // Log pour debug
        if (activity.title?.includes('Da Vinci Code')) {
          console.log('Da Vinci Code activity:', {
            title: activity.title,
            date: activity.date,
            assigned_gm_id: activity.assigned_gm_id,
            event_assignments: eventAssignments,
            uniqueGMs: Array.from(uniqueGMs),
            effectiveDurationMinutes,
            durationSource
          });
        }

        uniqueGMs.forEach((gmId: string) => {
          // Récupérer les données GM - soit de event_assignments soit de game_masters
          let gmData = activity.game_masters;
          if (eventAssignments.length > 0) {
            // Chercher les données GM dans event_assignments
            const gmAssignment = eventAssignments.find((assignment: any) => assignment.gm_id === gmId);
            if (gmAssignment?.game_masters) {
              gmData = gmAssignment.game_masters;
            }
          }

          const key = `${gmId}-${monthYear}`;
          
          if (!reportsMap.has(key)) {
            reportsMap.set(key, {
              id: `generated-${key}`,
              month_year: monthYear,
              gm_id: gmId,
              total_hours: 0,
              gaming_hours: 0,
              formation_hours: 0,
              maintenance_hours: 0,
              admin_hours: 0,
              travaux_informatiques_hours: 0,
              menage_hours: 0,
              earnings: 0,
              report_data: { activities: [] },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              game_masters: gmData
            });
          }

          const report = reportsMap.get(key);
          report.total_hours += hours;
          
          switch (activity.activity_type) {
            case 'gaming':
              report.gaming_hours += hours;
              break;
            case 'formation':
              report.formation_hours += hours;
              break;
            case 'maintenance':
              report.maintenance_hours += hours;
              break;
            case 'admin':
              report.admin_hours += hours;
              break;
            case 'travaux_informatiques':
              report.travaux_informatiques_hours += hours;
              break;
            case 'menage':
              report.menage_hours += hours;
              break;
          }

          report.report_data.activities.push({
            title: activity.title,
            date: activity.date,
            start_time: activity.start_time,
            end_time: activity.end_time,
            duration: hours,
            effective_duration_minutes: effectiveDurationMinutes,
            duration_source: durationSource,
            type: activity.activity_type
          });
        });
      }

      // Calculer strictement les mois inclus dans la période (en local)
      const monthsInRange = eachMonthOfInterval({
        start: parseISO(formattedStartDate),
        end: parseISO(formattedEndDate)
      }).map(date => format(date, 'yyyy-MM'));

      // Récupérer uniquement les rapports manuels de ces mois exacts
      const { data: manualReports, error: manualError } = await supabase
        .from('monthly_reports')
        .select(`
          *,
          game_masters (
            name,
            first_name,
            last_name,
            email
          )
        `)
        .in('month_year', monthsInRange);

      if (manualError) throw manualError;

      // Fusionner avec les rapports manuels
      manualReports?.forEach((manualReport) => {
        const key = `${manualReport.gm_id}-${manualReport.month_year}`;
        const reportData = manualReport.report_data as ReportData | null;
        
        if (reportsMap.has(key)) {
          // Fusionner avec un rapport existant (qui contient déjà les activités automatiques)
          const existingReport = reportsMap.get(key);
          
          if (reportData?.manual_entries) {
            existingReport.report_data.manual_entries = reportData.manual_entries;
            // Ajouter les heures manuelles aux totaux automatiques
            reportData.manual_entries.forEach((entry: ManualEntry) => {
              existingReport.total_hours += entry.hours;
              switch (entry.activity_type) {
                case 'gaming':
                  existingReport.gaming_hours += entry.hours;
                  break;
                case 'formation':
                  existingReport.formation_hours += entry.hours;
                  break;
                case 'maintenance':
                  existingReport.maintenance_hours += entry.hours;
                  break;
                case 'admin':
                  existingReport.admin_hours += entry.hours;
                  break;
                case 'travaux_informatiques':
                  existingReport.travaux_informatiques_hours += entry.hours;
                  break;
                case 'menage':
                  existingReport.menage_hours += entry.hours;
                  break;
              }
            });
          }
          existingReport.id = manualReport.id; // Utiliser l'ID réel
        } else {
          // Créer un nouveau rapport mais vérifier d'abord s'il y a des activités automatiques
          // pour ce GM et cette période qui n'ont pas été trouvées dans la première requête
          const gmActivities = activities?.filter(activity => 
            activity.assigned_gm_id === manualReport.gm_id && 
            activity.date.slice(0, 7) === manualReport.month_year
          ) || [];

          // Initialiser le rapport avec les données du rapport manuel
          const report = {
            ...manualReport,
            total_hours: 0,
            gaming_hours: 0,
            formation_hours: 0,
            maintenance_hours: 0,
            admin_hours: 0,
            travaux_informatiques_hours: 0,
            menage_hours: 0,
            report_data: { 
              activities: [],
              manual_entries: reportData?.manual_entries || []
            }
          };

          // Ajouter les activités automatiques s'il y en a
          gmActivities.forEach((activity) => {
            const hours = activity.duration / 60;
            report.total_hours += hours;
            
            switch (activity.activity_type) {
              case 'gaming':
                report.gaming_hours += hours;
                break;
              case 'formation':
                report.formation_hours += hours;
                break;
              case 'maintenance':
                report.maintenance_hours += hours;
                break;
              case 'admin':
                report.admin_hours += hours;
                break;
              case 'travaux_informatiques':
                report.travaux_informatiques_hours += hours;
                break;
              case 'menage':
                report.menage_hours += hours;
                break;
            }

            report.report_data.activities.push({
              title: activity.title,
              date: activity.date,
              start_time: activity.start_time,
              end_time: activity.end_time,
              duration: hours,
              type: activity.activity_type
            });
          });
          
          // Ajouter les heures manuelles
          if (reportData?.manual_entries) {
            reportData.manual_entries.forEach((entry: ManualEntry) => {
              report.total_hours += entry.hours;
              switch (entry.activity_type) {
                case 'gaming':
                  report.gaming_hours += entry.hours;
                  break;
                case 'formation':
                  report.formation_hours += entry.hours;
                  break;
                case 'maintenance':
                  report.maintenance_hours += entry.hours;
                  break;
                case 'admin':
                  report.admin_hours += entry.hours;
                  break;
                case 'travaux_informatiques':
                  report.travaux_informatiques_hours += entry.hours;
                  break;
                case 'menage':
                  report.menage_hours += entry.hours;
                  break;
              }
            });
          }
          
          reportsMap.set(key, report);
        }
      });

      // Grouper les rapports par GM pour éviter les doublons
      const groupedByGM = new Map();
      
      Array.from(reportsMap.values()).forEach((report) => {
        const gmKey = report.gm_id;
        if (!groupedByGM.has(gmKey)) {
          groupedByGM.set(gmKey, report);
        } else {
          // Fusionner les données si plusieurs rapports pour le même GM
          const existingReport = groupedByGM.get(gmKey);
          existingReport.total_hours += report.total_hours;
          existingReport.gaming_hours += report.gaming_hours;
          existingReport.formation_hours += report.formation_hours;
          existingReport.maintenance_hours += report.maintenance_hours;
          existingReport.admin_hours += report.admin_hours;
          existingReport.travaux_informatiques_hours += report.travaux_informatiques_hours;
          existingReport.menage_hours += report.menage_hours;
          
          // Fusionner les activités
          if (existingReport.report_data?.activities && report.report_data?.activities) {
            existingReport.report_data.activities.push(...report.report_data.activities);
          }
          
          // Fusionner les entrées manuelles
          if (existingReport.report_data?.manual_entries && report.report_data?.manual_entries) {
            existingReport.report_data.manual_entries.push(...report.report_data.manual_entries);
          }
        }
      });

      return Array.from(groupedByGM.values()) as MonthlyReport[];
    },
    enabled: !!startDate && !!endDate
  });
};

export const useCreateMonthlyReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (report: Omit<MonthlyReport, 'id' | 'created_at' | 'updated_at' | 'game_masters'>) => {
      const { data, error } = await supabase
        .from('monthly_reports')
        .insert([report])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
    }
  });
};

export const useUpdateMonthlyReport = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MonthlyReport> & { id: string }) => {
      const { data, error } = await supabase
        .from('monthly_reports')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
    }
  });
};

export const useAddManualHours = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      gm_id, 
      month_year, 
      hours, 
      activity_type, 
      description 
    }: {
      gm_id: string;
      month_year: string;
      hours: number;
      activity_type: 'gaming' | 'formation' | 'maintenance' | 'admin' | 'travaux_informatiques' | 'menage';
      description?: string;
    }) => {
      // Vérifier si un rapport existe déjà pour ce GM et cette période
      const { data: existingReport } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('gm_id', gm_id)
        .eq('month_year', month_year)
        .single();

      // Vérifier et typer correctement report_data
      let reportData: ReportData = {};
      const existingReportData = existingReport?.report_data as ReportData | null;
      
      if (existingReportData && typeof existingReportData === 'object') {
        reportData = existingReportData;
      }
      
      if (!reportData.manual_entries) {
        reportData.manual_entries = [];
      }
      
      const newEntry: ManualEntry = {
        date: new Date().toISOString(),
        hours,
        activity_type,
        description: description || `Ajout manuel - ${activity_type}`
      };
      
      reportData.manual_entries.push(newEntry);

      if (existingReport) {
        // Mettre à jour le rapport existant
        const { data, error } = await supabase
          .from('monthly_reports')
          .update({
            report_data: reportData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReport.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Créer un nouveau rapport
        const { data, error } = await supabase
          .from('monthly_reports')
          .insert([{
            gm_id,
            month_year,
            total_hours: 0, // Sera calculé dynamiquement
            gaming_hours: 0,
            formation_hours: 0,
            maintenance_hours: 0,
            admin_hours: 0,
            travaux_informatiques_hours: 0,
            menage_hours: 0,
            report_data: reportData
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
    }
  });
};

export const useExportMonthlyReports = () => {
  return useMutation({
    mutationFn: async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      // Utiliser l'API pour générer le rapport
      const { data, error } = await supabase.functions.invoke('generate-reports-api', {
        body: {
          start_date: startDate,
          end_date: endDate,
          format: 'csv'
        }
      });

      if (error) throw error;
      
      // Le contenu CSV est retourné directement
      const csvContent = data;
      
      // Télécharger le fichier
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `rapports-mensuels-${startDate}-${endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return data;
    }
  });
};
