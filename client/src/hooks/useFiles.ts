import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useToast } from './useToast';

export interface FileItem {
  id: number;
  name: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  type: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileUploadResult {
  id: number;
  name: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  type: string;
}

async function fetchFiles(token: string): Promise<FileItem[]> {
  const response = await fetch('/api/files', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  
  return response.json();
}

async function uploadFileToServer(file: File, token: string): Promise<FileUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload file');
  }

  return response.json();
}

async function deleteFileFromServer(fileId: number, token: string): Promise<void> {
  const response = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
}

export function useFiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files query
  const {
    data: files = [],
    isLoading: loading,
    error: queryError,
    refetch: refreshFiles
  } = useQuery({
    queryKey: ['files', user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const token = await user.getIdToken();
      return fetchFiles(token);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return uploadFileToServer(file, token);
    },
    onSuccess: (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(['files', user?.uid], (oldFiles: FileItem[] = []) => [
        data,
        ...oldFiles
      ]);
      
      toast({
        title: "Upload successful",
        description: `${data.originalName} uploaded successfully`,
      });
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || 'Upload failed',
        variant: "destructive"
      });
    }
  });

  // Delete file mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      if (!user) throw new Error('User not authenticated');
      const token = await user.getIdToken();
      return deleteFileFromServer(fileId, token);
    },
    onMutate: async (fileId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['files', user?.uid] });

      // Snapshot the previous value
      const previousFiles = queryClient.getQueryData<FileItem[]>(['files', user?.uid]);

      // Optimistically update to the new value
      queryClient.setQueryData(['files', user?.uid], (old: FileItem[] = []) =>
        old.filter(f => f.id !== fileId)
      );

      // Return a context object with the snapshotted value
      return { previousFiles };
    },
    onSuccess: (_, fileId) => {
      const deletedFile = files.find(f => f.id === fileId);
      toast({
        title: "File deleted",
        description: deletedFile ? `${deletedFile.originalName} has been deleted` : 'File deleted successfully',
      });
    },
    onError: (error: Error, fileId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousFiles) {
        queryClient.setQueryData(['files', user?.uid], context.previousFiles);
      }
      
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error.message || 'Failed to delete file',
        variant: "destructive"
      });
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['files', user?.uid] });
    }
  });

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalFiles = files.length;
  const error = queryError ? (queryError as Error).message : null;

  return {
    files,
    loading,
    error,
    uploadFile: uploadMutation.mutateAsync,
    deleteFile: deleteMutation.mutateAsync,
    refreshFiles,
    totalSize,
    totalFiles,
  };
}