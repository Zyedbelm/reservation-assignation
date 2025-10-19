import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Calendar, Users, Bell, Settings, Clock, CheckCircle, AlertTriangle, Mail, Cog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
interface UserManualProps {
  userType: 'admin' | 'gm';
}
const UserManual = ({
  userType
}: UserManualProps) => {
  const isAdmin = userType === 'admin';
  return <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">
            Mode d'Emploi {isAdmin ? 'Administrateur' : 'Game Master'}
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          {isAdmin ? 'Guide complet pour la gestion du centre de jeux' : 'Guide pour gérer vos assignations et disponibilités'}
        </p>
      </div>

      {isAdmin ? <AdminManualContent /> : <GMManualContent />}
    </div>;
};
const AdminManualContent = () => <div className="grid gap-6">
    {/* Vue d'ensemble */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cog className="w-5 h-5" />
          Vue d'Ensemble du Système
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          En tant qu'administrateur, vous avez accès à toutes les fonctionnalités de gestion du centre de jeux.
        </p>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Planning</h4>
              <p className="text-sm text-blue-700">Gestion des événements et génération de rapports</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <Users className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Organisation</h4>
              <p className="text-sm text-green-700">Gestion des Game Masters et des jeux</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
            <Cog className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Automations GM</h4>
              <p className="text-sm text-purple-700">Synchronisation, assignations automatiques et audit</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
            <Settings className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900">Configuration</h4>
              <p className="text-sm text-orange-700">API, notifications et tests système</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Gestion des événements */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Gestion des Événements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium">Synchronisation avec Make.com</h4>
            <p className="text-sm text-muted-foreground">
              Les événements sont automatiquement importés depuis votre système externe via Make.com.
              Configurez l'API dans Configuration → API & Configuration.
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium">Assignation Manuelle</h4>
            <p className="text-sm text-muted-foreground">
              Cliquez sur "Assigner GM" dans la liste des événements pour assigner manuellement un Game Master.
              Le système vérifie automatiquement la disponibilité.
            </p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium">Assignation Automatique</h4>
            <p className="text-sm text-muted-foreground">
              Utilisez "Automations GM → Auto-Assignation" pour lancer l'assignation automatique basée sur les disponibilités et compétences.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Gestion des GMs */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestion des Game Masters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">Profils GM</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Gérez les informations personnelles, compétences et statut des Game Masters.
            </p>
            <Badge variant="secondary">Organisation → Game Masters</Badge>
          </div>
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">Disponibilités</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Consultez et modifiez les disponibilités déclarées par les GMs.
            </p>
            <Badge variant="secondary">Automations GM → Disponibilités Admin</Badge>
          </div>
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">Documents</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Accédez aux documents uploadés par les GMs (contrats, certifications, etc.).
            </p>
            <Badge variant="secondary">Organisation → Game Masters → Documents</Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Système d'audit */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Système d'Audit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-medium text-amber-900 mb-2">Audit Automatique</h4>
          <p className="text-sm text-amber-800">
            L'audit vérifie automatiquement la cohérence des assignations, les conflits d'horaires,
            et les problèmes de disponibilité. Utilisez les solutions proposées pour corriger les erreurs.
          </p>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium">Types de vérifications :</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Conflits d'horaires entre événements</li>
            <li>Assignations sans disponibilité déclarée</li>
            <li>Compétences manquantes pour certains jeux</li>
            <li>Événements non assignés proches de leur date</li>
          </ul>
        </div>
      </CardContent>
    </Card>

    {/* Notifications */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Système de Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900">Notifications Automatiques</h4>
            <p className="text-sm text-green-700">
              Les GMs reçoivent automatiquement des emails lors d'assignations, modifications ou annulations.
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Test d'Emails</h4>
            <p className="text-sm text-blue-700">
              Utilisez Configuration → Test Notifications pour vérifier le bon fonctionnement de l'envoi d'emails.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>;
const GMManualContent = () => <div className="grid gap-6">
    {/* Dashboard */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Dashboard - Vue d'Ensemble
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Votre dashboard affiche un aperçu de vos prochaines assignations et activités.
        </p>
        <div className="grid gap-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Événements à Venir</h4>
              <p className="text-sm text-blue-700">
                Visualisez vos prochaines assignations avec détails des événements
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Statuts des Assignations</h4>
              <p className="text-sm text-green-700">
                Suivez l'évolution de vos événements (assigné, confirmé, complété)
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Disponibilités */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Gestion des Disponibilités
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <h4 className="font-medium text-amber-900 mb-2">⚠️ Important</h4>
          <p className="text-sm text-amber-800">
            Vous devez déclarer vos disponibilités avant de pouvoir être assigné à des événements.
            Mettez à jour régulièrement vos créneaux disponibles.
          </p>
        </div>
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium">Déclarer une Disponibilité</h4>
            <p className="text-sm text-muted-foreground">
              Allez dans Disponibilités → Nouvelle Disponibilité. Sélectionnez la date et les créneaux horaires où vous êtes libre.
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium">Modification/Suppression</h4>
            <p className="text-sm text-muted-foreground">
              Vous pouvez modifier ou supprimer vos disponibilités dans la liste "Mes Disponibilités".
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Notifications */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900">Notifications en Temps Réel</h4>
            <p className="text-sm text-blue-700">
              Recevez des notifications pour vos nouvelles assignations, modifications et annulations.
            </p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900">Emails de Confirmation</h4>
            <p className="text-sm text-green-700">
              Un email est automatiquement envoyé pour chaque nouvelle assignation ou modification.
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900">Badge de Notifications</h4>
            <p className="text-sm text-purple-700">
              Le nombre de notifications non lues apparaît sur l'onglet Notifications.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Événements */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Mes Événements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium">Consulter vos Assignations</h4>
            <p className="text-sm text-muted-foreground">
              L'onglet Événements affiche tous vos événements assignés avec les détails complets.
            </p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-medium">Se Désassigner</h4>
            <p className="text-sm text-muted-foreground">
              Utilisez le bouton "Se désassigner" dans les détails d'un événement si vous ne pouvez plus l'assurer.
              L'administrateur sera notifié automatiquement.
            </p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h4 className="font-medium">Export iCal</h4>
            <p className="text-sm text-muted-foreground">
              Synchronisez vos événements avec votre calendrier personnel via le lien iCal dans Profil → Export iCal.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Profil */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Gestion du Profil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">Informations Personnelles</h4>
            <p className="text-sm text-muted-foreground">
              Mettez à jour vos informations de contact et vos compétences.
            </p>
          </div>
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">Documents</h4>
            <p className="text-sm text-muted-foreground">Vos documents uploadés par l'administration sont consultables ici (contrats, certificats, etc.).</p>
          </div>
          <div className="p-3 border rounded-lg">
            <h4 className="font-medium mb-2">Modification Email</h4>
            <p className="text-sm text-muted-foreground">
              Changez votre adresse email pour les notifications dans Profil → Email.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Conseils */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Conseils d'Utilisation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Déclarez vos disponibilités à l'avance</strong> pour faciliter l'assignation automatique
          </p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            📱 <strong>Vérifiez régulièrement vos notifications</strong> pour ne pas manquer d'assignations
          </p>
        </div>
        <div className="p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-800">
            📅 <strong>Synchronisez avec votre calendrier</strong> via le lien iCal pour une meilleure organisation
          </p>
        </div>
      </CardContent>
    </Card>
  </div>;
export default UserManual;