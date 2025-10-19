
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { File, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  acceptedTypes?: string;
  maxSize?: number; // en MB
}

const FileUpload = ({ onFileSelect, acceptedTypes = ".pdf,.jpg,.jpeg,.png,.doc,.docx", maxSize = 10 }: FileUploadProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file?.name, 'Size:', file?.size);
    
    if (!file) {
      clearFile();
      return;
    }

    // Vérifier la taille du fichier
    if (file.size > maxSize * 1024 * 1024) {
      console.error('File too large:', file.size, 'Max:', maxSize * 1024 * 1024);
      toast({
        title: "Fichier trop volumineux",
        description: `Le fichier ne peut pas dépasser ${maxSize}MB`,
        variant: "destructive"
      });
      clearFile();
      return;
    }

    // Vérifier le type de fichier
    const allowedTypes = acceptedTypes.split(',').map(type => type.trim());
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    console.log('File extension:', fileExtension, 'Allowed:', allowedTypes);
    
    if (!allowedTypes.includes(fileExtension)) {
      console.error('File type not allowed:', fileExtension);
      toast({
        title: "Type de fichier non autorisé",
        description: `Types autorisés: ${acceptedTypes}`,
        variant: "destructive"
      });
      clearFile();
      return;
    }

    console.log('File validation passed, setting file:', file.name);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearFile = () => {
    console.log('Clearing file selection');
    setSelectedFile(null);
    onFileSelect(null);
    // Reset the input value properly
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file-upload">Sélectionner un fichier</Label>
        <Input
          id="file-upload"
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Types autorisés: {acceptedTypes} | Taille max: {maxSize}MB
        </p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
          <div className="flex items-center gap-2">
            <File className="w-4 h-4 text-gray-500" />
            <div>
              <span className="text-sm font-medium">{selectedFile.name}</span>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            className="text-gray-500 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
