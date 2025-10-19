
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type GMDocument = Database['public']['Tables']['gm_documents']['Row'];
type GMDocumentInsert = Database['public']['Tables']['gm_documents']['Insert'];

export const useGMDocuments = (gmId?: string) => {
  return useQuery({
    queryKey: ['gm-documents', gmId],
    queryFn: async () => {
      console.log('Fetching GM documents for:', gmId);
      
      let query = supabase.from('gm_documents').select('*');
      
      if (gmId) {
        query = query.eq('gm_id', gmId);
      }
      
      const { data, error } = await query.order('upload_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching GM documents:', error);
        throw error;
      }
      
      console.log('Fetched GM documents:', data);
      return data as GMDocument[];
    },
    enabled: !!gmId
  });
};

export const useCreateGMDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      ...document 
    }: Omit<GMDocumentInsert, 'id' | 'created_at' | 'updated_at' | 'file_path'> & { 
      file?: File 
    }) => {
      console.log('Creating GM document:', { document, hasFile: !!file });
      
      let filePath = null;
      
      if (file) {
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const fileName = `${document.gm_id}/${timestamp}.${fileExt}`;
        
        console.log('Uploading file to:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('gm-documents')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Erreur d'upload: ${uploadError.message}`);
        } else {
          filePath = uploadData.path;
          console.log('File uploaded successfully to:', filePath);
        }
      }
      
      const { data, error } = await supabase
        .from('gm_documents')
        .insert([{
          gm_id: document.gm_id,
          document_type: document.document_type,
          document_name: document.document_name,
          notes: document.notes || null,
          file_path: filePath
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating document:', error);
        throw new Error(`Erreur de création: ${error.message}`);
      }
      
      console.log('Created document:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-documents'] });
    }
  });
};

export const useDeleteGMDocument = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (document: GMDocument) => {
      console.log('Deleting GM document:', document.id);
      
      if (document.file_path) {
        console.log('Deleting file from storage:', document.file_path);
        const { error: storageError } = await supabase.storage
          .from('gm-documents')
          .remove([document.file_path]);
        
        if (storageError) {
          console.error('Storage deletion error:', storageError);
        }
      }
      
      const { error } = await supabase
        .from('gm_documents')
        .delete()
        .eq('id', document.id);
      
      if (error) {
        console.error('Error deleting document:', error);
        throw error;
      }
      
      console.log('Document deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-documents'] });
    }
  });
};

export const useDownloadGMDocument = () => {
  return useMutation({
    mutationFn: async (filePath: string) => {
      console.log('Downloading document:', filePath);
      
      const { data, error } = await supabase.storage
        .from('gm-documents')
        .download(filePath);
      
      if (error) {
        console.error('Download error:', error);
        throw error;
      }
      
      console.log('Document downloaded successfully');
      return data;
    }
  });
};
