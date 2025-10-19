
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Plus, Download, Trash2 } from 'lucide-react';
import { useGMDocuments, useCreateGMDocument, useDownloadGMDocument, useDeleteGMDocument } from '@/hooks/useGMDocuments';
import { useToast } from '@/hooks/use-toast';
import FileUpload from './FileUpload';

interface GMDocumentsProps {
  gmId: string;
}

const GMDocuments = ({ gmId }: GMDocumentsProps) => {
  const { toast } = useToast();
  const { data: documents = [] } = useGMDocuments(gmId);
  const createDocument = useCreateGMDocument();
  const downloadDocument = useDownloadGMDocument();
  const deleteDocument = useDeleteGMDocument();
  
  const [newDocument, setNewDocument] = useState({
    document_type: '',
    document_name: '',
    notes: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const documentTypes = [
    { value: 'contract', label: 'Contrat' },
    { value: 'payslip', label: 'Fiche de paie' },
    { value: 'medical_certificate', label: 'Certificat médical' },
    { value: 'resignation_letter', label: 'Lettre de démission' },
    { value: 'training_certificate', label: 'Certificat de formation' },
    { value: 'other', label: 'Autre' }
  ];

  const handleCreateDocument = async () => {
    if (!gmId || !newDocument.document_type || !newDocument.document_name) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs requis",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await createDocument.mutateAsync({
        gm_id: gmId,
        file: selectedFile || undefined,
        ...newDocument
      });

      toast({
        title: "Document ajouté",
        description: "Le document a été ajouté avec succès",
      });
      setNewDocument({ document_type: '', document_name: '', notes: '' });
      setSelectedFile(null);
    } catch (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le document",
        variant: "destructive"
      });
    }
  };

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
      
      toast({
        title: "Téléchargement réussi",
        description: `Le document "${doc.document_name}" a été téléchargé`,
      });
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
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le document "${doc.document_name}" ?`)) {
      return;
    }

    try {
      await deleteDocument.mutateAsync(doc);
      toast({
        title: "Document supprimé",
        description: `Le document "${doc.document_name}" a été supprimé avec succès`,
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Ajouter un document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type de document</Label>
              <Select value={newDocument.document_type} onValueChange={(value) => 
                setNewDocument({...newDocument, document_type: value})
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Type de document" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nom du document</Label>
              <Input
                value={newDocument.document_name}
                onChange={(e) => setNewDocument({...newDocument, document_name: e.target.value})}
                placeholder="Nom du fichier"
              />
            </div>
          </div>
          
          <div>
            <Label>Notes</Label>
            <Textarea
              value={newDocument.notes}
              onChange={(e) => setNewDocument({...newDocument, notes: e.target.value})}
              placeholder="Notes additionnelles"
            />
          </div>

          <FileUpload
            onFileSelect={setSelectedFile}
            acceptedTypes=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            maxSize={10}
          />

          <Button 
            onClick={handleCreateDocument} 
            className="w-full"
            disabled={createDocument.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            {createDocument.isPending ? 'Ajout en cours...' : 'Ajouter le document'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documents existants</CardTitle>
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
                        className="flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteDocument(doc)}
                      disabled={deleteDocument.isPending}
                      className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </Button>
                    <Badge variant="outline">
                      {new Date(doc.upload_date).toLocaleDateString('fr-FR')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GMDocuments;
