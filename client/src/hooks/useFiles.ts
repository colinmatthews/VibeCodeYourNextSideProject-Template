import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './useToast';
import { apiPost, apiDelete, apiJson, getQueryFn } from '@/lib/queryClient';

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

// Mutation functions for file operations
async function uploadFileToServer(file: File): Promise<FileUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await apiPost('/api/files/upload', formData);
  return apiJson<FileUploadResult>(response);
}

async function deleteFileFromServer(fileId: number): Promise<void> {
  await apiDelete(`/api/files/${fileId}`);
}

export function useFiles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files query using standard pattern
  const {
    data: files = [],
    isLoading: loading,
    error: queryError,
    refetch: refreshFiles
  } = useQuery({
    queryKey: ['/api/files'],
    queryFn: getQueryFn<FileItem[]>({ on401: "throw" }),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (renamed from cacheTime)
  });

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated');
      return uploadFileToServer(file);
    },
    onSuccess: (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(['/api/files'], (oldFiles: FileItem[] = []) => [
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
      return deleteFileFromServer(fileId);
    },
    onMutate: async (fileId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/files'] });

      // Snapshot the previous value
      const previousFiles = queryClient.getQueryData<FileItem[]>(['/api/files']);

      // Optimistically update to the new value
      queryClient.setQueryData(['/api/files'], (old: FileItem[] = []) =>
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
        queryClient.setQueryData(['/api/files'], context.previousFiles);
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
      queryClient.invalidateQueries({ queryKey: ['/api/files'] });
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