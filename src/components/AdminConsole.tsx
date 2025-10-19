
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Calendar, Users, FileText, BarChart, Settings, AlertTriangle, Activity, LogOut, Bug, Clock, Cog, Mail, Trash2, Package } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useActivities } from '@/hooks/useActivities';
import { getCurrentSwissDate } from '@/utils/dateUtils';
import GMManagement from './GMManagement';
import GameManagement from './GameManagement';
import EventsManagement from './EventsManagement';
import SyncConfiguration from './SyncConfiguration';
import UnassignedEvents from './UnassignedEvents';
import MonthlyReport from './MonthlyReport';
import APIManagement from './APIManagement';
import SystemAuditPanel from './SystemAuditPanel';
import AutoAssignmentHistory from './AutoAssignmentHistory';
import NotificationTest from './NotificationTest';
import UserManual from './UserManual';
import { EmailDiagnosticPanel } from './EmailDiagnosticPanel';
import { AuthDebugPanel } from './AuthDebugPanel';
import StockManagement from './StockManagement';
import GMAvailabilityDiagnostic from './admin/GMAvailabilityDiagnostic';
import { DuplicateCleanup } from './admin/DuplicateCleanup';
import MonthlyReportDiagnostic from './admin/MonthlyReportDiagnostic';
import DurationAlignmentTool from './admin/DurationAlignmentTool';
import AdminAvailabilityCalendarView from './AdminAvailabilityCalendarView';


const AdminConsole = () => {
  const { signOut } = useAuth();
  const { data: activities = [] } = useActivities();

  // Obtenir la date d'aujourd'hui au format YYYY-MM-DD (timezone suisse)
  const today = getCurrentSwissDate();
  
  // Utiliser la même logique de filtrage que dans UnassignedEvents
  const unassignedCount = activities.filter(activity => 
    !activity.is_assigned && 
    activity.date >= today &&
    !['cancelled', 'deleted', 'completed'].includes(activity.status)
  ).length;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Console d'Administration
            </h1>
            <p className="text-gray-600 mt-2">
              Gestion complète de votre centre de jeux
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleSignOut} 
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </Button>
        </div>

        <Tabs defaultValue="planning" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="planning" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Planning
            </TabsTrigger>
            <TabsTrigger value="organisation" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Organisation
            </TabsTrigger>
            <TabsTrigger value="automations" className="flex items-center gap-2 relative">
              <Cog className="w-4 h-4" />
              Automations GM
              {unassignedCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-100 text-red-800 text-xs font-semibold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 border border-red-200">
                  {unassignedCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planning">
            <Tabs defaultValue="events" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Événements
                </TabsTrigger>
                <TabsTrigger value="availabilities" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Disponibilités
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Rapports
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="events">
                <EventsManagement />
              </TabsContent>
              
              <TabsContent value="availabilities">
                <AdminAvailabilityCalendarView />
              </TabsContent>
              
              <TabsContent value="reports">
                <MonthlyReport />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="organisation">
            <Tabs defaultValue="game-masters" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="game-masters" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Game Masters
                </TabsTrigger>
                <TabsTrigger value="games" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Jeux
                </TabsTrigger>
                <TabsTrigger value="stock" className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Stock
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <BarChart className="w-4 h-4" />
                  Rapports
                </TabsTrigger>
              </TabsList>

              <TabsContent value="game-masters">
                <GMManagement />
              </TabsContent>

                  <TabsContent value="games">
                    <GameManagement />
                  </TabsContent>

                  <TabsContent value="stock">
                    <StockManagement />
                  </TabsContent>

                  <TabsContent value="reports">
                    <MonthlyReport />
                  </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="automations">
            <Tabs defaultValue="unassigned" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="unassigned" className="flex items-center gap-2 relative">
                  <AlertTriangle className="w-4 h-4" />
                  Non Assignés
                  {unassignedCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-100 text-red-800 text-xs font-semibold min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 border border-red-200">
                      {unassignedCount}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sync" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Synchroniser
                </TabsTrigger>
                <TabsTrigger value="auto-assignment" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Auto-Assignation
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Audit
                </TabsTrigger>
              </TabsList>

              <TabsContent value="unassigned">
                <UnassignedEvents />
              </TabsContent>

              <TabsContent value="sync">
                <SyncConfiguration />
              </TabsContent>

              <TabsContent value="auto-assignment">
                <AutoAssignmentHistory />
              </TabsContent>

              <TabsContent value="audit">
                <SystemAuditPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="settings">
            <Tabs defaultValue="config" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 gap-2 mb-6 bg-muted p-3 rounded-lg">
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuration
                </TabsTrigger>
                <TabsTrigger value="diagnostics" className="flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Diagnostics
                </TabsTrigger>
                <TabsTrigger value="maintenance" className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Maintenance
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="config">
                <Tabs defaultValue="api" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2 gap-2">
                    <TabsTrigger value="api" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      API & Configuration
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Mode d'Emploi
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="api">
                    <APIManagement />
                  </TabsContent>
                  
                  <TabsContent value="manual">
                    <UserManual userType="admin" />
                  </TabsContent>
                </Tabs>
              </TabsContent>
              
              <TabsContent value="diagnostics">
                <Tabs defaultValue="gm-diagnostic" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 gap-2">
                    <TabsTrigger value="gm-diagnostic" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Diagnostic GM
                    </TabsTrigger>
                    <TabsTrigger value="reports-diagnostic" className="flex items-center gap-2">
                      <BarChart className="w-4 h-4" />
                      Diagnostic Rapports
                    </TabsTrigger>
                    <TabsTrigger value="auth-diagnostic" className="flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Diagnostic Auth
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="gm-diagnostic">
                    <GMAvailabilityDiagnostic />
                  </TabsContent>
                  
                  <TabsContent value="reports-diagnostic">
                    <MonthlyReportDiagnostic />
                  </TabsContent>
                  
                  <TabsContent value="auth-diagnostic">
                    <AuthDebugPanel />
                  </TabsContent>
                </Tabs>
              </TabsContent>
              
              <TabsContent value="maintenance">
                <Tabs defaultValue="emails" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3 gap-2">
                    <TabsTrigger value="emails" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Notifications
                    </TabsTrigger>
                    <TabsTrigger value="duration-alignment" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Alignement Durées
                    </TabsTrigger>
                    <TabsTrigger value="duplicate-cleanup" className="flex items-center gap-2">
                      <Trash2 className="w-4 h-4" />
                      Nettoyage Doublons
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="emails">
                    <EmailDiagnosticPanel />
                  </TabsContent>
                  
                  <TabsContent value="duration-alignment">
                    <DurationAlignmentTool />
                  </TabsContent>
                  
                  <TabsContent value="duplicate-cleanup">
                    <DuplicateCleanup />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminConsole;
