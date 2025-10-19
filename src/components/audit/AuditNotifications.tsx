
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Mail, CheckCircle, AlertCircle } from 'lucide-react';

const AuditNotifications = () => {
  return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-blue-600" />
          <h4 className="font-medium">Système de Notifications Email</h4>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Notifications d'assignation
              </span>
              <Badge className="bg-green-100 text-green-800">Actif</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Notifications de changement
              </span>
              <Badge className="bg-green-100 text-green-800">Actif</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Notifications admin
              </span>
              <Badge className="bg-green-100 text-green-800">Actif</Badge>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-50 rounded">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Emails d'authentification
              </span>
              <Badge className="bg-green-100 text-green-800">Actif</Badge>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-800 font-medium">Configuration du domaine email</p>
                <p className="text-blue-700 mt-1">
                  Le domaine <code className="bg-blue-100 px-1 rounded">genieculturel.ch</code> doit être vérifié dans Resend 
                  pour que les notifications fonctionnent correctement.
                </p>
                <p className="text-blue-600 mt-2">
                  <strong>Types d'emails configurés :</strong>
                </p>
                <ul className="text-blue-600 ml-4 mt-1 space-y-1">
                  <li>• Confirmation d'inscription (avec design amélioré)</li>
                  <li>• Réinitialisation de mot de passe</li>
                  <li>• Lien de connexion magique</li>
                  <li>• Changement d'adresse email</li>
                  <li>• Notifications d'assignation GM</li>
                  <li>• Notifications de modification d'événement</li>
                  <li>• Alertes admin pour événements non assignés</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-amber-50 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-amber-800 font-medium">Étapes de vérification</p>
                <ol className="text-amber-700 ml-4 mt-1 space-y-1 list-decimal">
                  <li>Connectez-vous à <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline">resend.com/domains</a></li>
                  <li>Ajoutez le domaine <code className="bg-amber-100 px-1 rounded">genieculturel.ch</code></li>
                  <li>Configurez les enregistrements DNS (SPF, DKIM)</li>
                  <li>Vérifiez que le domaine est marqué comme "Verified"</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditNotifications;
