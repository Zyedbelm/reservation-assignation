
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, User, FileText, Download, Mail, Clock, Bell, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGMUnreadNotifications } from '@/hooks/useGMNotifications';
import GMEventsList from './GMEventsList';
import GMSelfProfile from './GMSelfProfile';
import GMDocumentManager from './GMDocumentManager';
import EmailUpdateForm from './EmailUpdateForm';
import GMiCalGenerator from './ical/GMiCalGenerator';
import GMAvailabilityForm from './GMAvailabilityForm';
import GMAvailabilityList from './GMAvailabilityList';
import GMNotifications from './GMNotifications';
import NotificationBadge from './NotificationBadge';
import GMPlanningView from './GMPlanningView';
import UserManual from './UserManual';

const GMDashboard = () => {
  const { signOut, profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: unreadNotifications = [] } = useGMUnreadNotifications(profile?.gm_id);
  const unreadCount = unreadNotifications.length;

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard GM</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Bienvenue, {profile?.first_name} {profile?.last_name}
              </p>
            </div>
            <Button onClick={handleSignOut} variant="outline" size="sm" className="ml-4 bg-red-50 hover:bg-red-100 text-red-700 border-red-200">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1">
            <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Calendar className="w-4 h-4" />
              <span className="truncate">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="truncate">Événements</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm relative">
              <Bell className="w-4 h-4" />
              <span className="truncate">Notifications</span>
              <NotificationBadge count={unreadCount} />
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <Clock className="w-4 h-4" />
              <span className="truncate">Disponibilités</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex flex-col sm:flex-row items-center gap-1 p-2 text-xs sm:text-sm">
              <User className="w-4 h-4" />
              <span className="truncate">Profil</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <GMPlanningView />
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <GMEventsList />
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <GMNotifications />
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            <div className="space-y-6">
              <GMAvailabilityForm />
              {profile?.gm_id && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Mes Disponibilités</h3>
                  <GMAvailabilityList gmId={profile.gm_id} />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Tabs defaultValue="info" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto p-1">
                <TabsTrigger value="info" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm">
                  <User className="w-4 h-4" />
                  <span className="truncate">Informations</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">Email</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm">
                  <FileText className="w-4 h-4" />
                  <span className="truncate">Documents</span>
                </TabsTrigger>
                <TabsTrigger value="ical" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm">
                  <Download className="w-4 h-4" />
                  <span className="truncate">Export iCal</span>
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex flex-col items-center gap-1 p-2 text-xs sm:text-sm">
                  <BookOpen className="w-4 h-4" />
                  <span className="truncate">Mode d'Emploi</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="info">
                <GMSelfProfile />
              </TabsContent>
              
              <TabsContent value="email">
                <EmailUpdateForm />
              </TabsContent>
              
              <TabsContent value="documents">
                {profile?.gm_id && (
                  <GMDocumentManager gmId={profile.gm_id} />
                )}
              </TabsContent>
              
              <TabsContent value="ical">
                <GMiCalGenerator />
              </TabsContent>
              
              <TabsContent value="manual">
                <UserManual userType="gm" />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default GMDashboard;
