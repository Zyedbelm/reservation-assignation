import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Users, Calendar, Settings, FileText, ClipboardList, Folder } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import GMManagement from './GMManagement';
import EventsManagement from './EventsManagement';
import MonthlyReport from './MonthlyReport';
import GameManagement from './GameManagement';
import IOSCalendarView from './IOSCalendarView';
import SyncConfiguration from './SyncConfiguration';
import AdminAvailabilitiesView from './AdminAvailabilitiesView';
import AdminAvailabilityCalendarView from './AdminAvailabilityCalendarView';
import AdminGMDocuments from './AdminGMDocuments';
import EmailTestPanel from '@/components/admin/EmailTestPanel';
import ForceReconcileButton from './admin/ForceReconcileButton';
import AddActivitySlotDialog from './AddActivitySlotDialog';
import AdminiCalGenerator from './ical/AdminiCalGenerator';

const AdminDashboard = () => {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('calendar');

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Bienvenue, {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 h-auto p-1">
            <TabsTrigger value="overview" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Calendar className="w-4 h-4" />
              <span className="truncate">Planning</span>
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="truncate">Disponibilités</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <ClipboardList className="w-4 h-4" />
              <span className="truncate">Événements</span>
            </TabsTrigger>
            <TabsTrigger value="gms" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="truncate">GMs</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="truncate">Rapports</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Folder className="w-4 h-4" />
              <span className="truncate">Audit</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Settings className="w-4 h-4" />
              <span className="truncate">Système</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>Planning Général</CardTitle>
                  <AddActivitySlotDialog />
                </CardHeader>
                <CardContent>
                  <IOSCalendarView isAdmin={true} />
                </CardContent>
              </Card>
              <AdminiCalGenerator />
            </div>
          </TabsContent>

          <TabsContent value="availability">
            <AdminAvailabilityCalendarView />
          </TabsContent>

          <TabsContent value="events">
            <EventsManagement />
          </TabsContent>

          <TabsContent value="gms">
            <GMManagement />
          </TabsContent>

          <TabsContent value="reports">
            <MonthlyReport />
          </TabsContent>

          <TabsContent value="audit">
            <div>
              {/* Audit content */}
            </div>
          </TabsContent>

          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Synchronisation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SyncConfiguration />
                  <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800">Force Reconcile</h4>
                      <p className="text-sm text-amber-700">
                        Force une synchronisation complète pour corriger les événements supprimés
                      </p>
                    </div>
                    <ForceReconcileButton />
                  </div>
                </CardContent>
              </Card>
              <EmailTestPanel />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
