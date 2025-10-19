
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, FileText } from 'lucide-react';
import { useGMDocuments, useDeleteGMDocument, useDownloadGMDocument } from '@/hooks/useGMDocuments';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface GMDocumentManagerProps {
  gmId: string;
}

const documentTypes = [
  { value: 'contract', label: 'Contrat' },
  { value: 'payslip', label: 'Fiche de paie' },
  { value: 'medical_certificate', label: 'Certificat médical' },
  { value: 'resignation_letter', label: 'Lettre de démission' },
  { value: 'training_certificate', label: 'Certificat de formation' },
  { value: 'other', label: 'Autre' }
];

const GMDocumentManager = ({ gmId }: GMDocumentManagerProps) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const { data: documents = [] } = useGMDocuments(gmId);
  const deleteDocument = useDeleteGMDocument();
  const downloadDocument = useDownloadGMDocument();

  const isAdmin = profile?.role === 'admin';

  const handleDownloadDocument = async (doc: any) => {
    if (!doc.file_path) {
      toast({
        title: "Erreur",
        description: "Aucun fichier associé à ce document",
        variant: "destructive"
      });
      return;
    }

    try {
      const blob = await downloadDocument.mutateAsync(doc.file_path);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = doc.document_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger le document",
        variant: "destructive"
      });
    }
  };

  const handleDeleteDocument = async (doc: any) => {
    if (!isAdmin) {
      toast({
        title: "Accès refusé",
        description: "Seuls les administrateurs peuvent supprimer des documents",
        variant: "destructive"
      });
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    try {
      await deleteDocument.mutateAsync(doc);
      toast({
        title: "Document supprimé",
        description: "Le document a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le document",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Documents
        </CardTitle>
        <CardDescription>
          {isAdmin ? "Gérer les documents du GM" : "Consulter vos documents"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Aucun document enregistré</p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{doc.document_name}</p>
                  <p className="text-sm text-gray-500">
                    {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    {doc.notes && ` - ${doc.notes}`}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(doc.upload_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  {doc.file_path && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadDocument(doc)}
                      disabled={downloadDocument.isPending}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deleteDocument.isPending}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GMDocumentManager;
