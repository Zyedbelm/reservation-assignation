import React from 'react';
import { EmailDiagnosticPanel } from '@/components/EmailDiagnosticPanel';

export const EmailDiagnostic = () => {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diagnostic Email</h1>
          <p className="text-muted-foreground">
            Outils de diagnostic et réparation du système d'emails
          </p>
        </div>
      </div>
      
      <EmailDiagnosticPanel />
    </div>
  );
};