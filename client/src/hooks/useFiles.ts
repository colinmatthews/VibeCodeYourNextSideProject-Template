import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { uploadFile, deleteFile, type FileUploadResult, type FileUploadProgress } from '@/lib/firebase';
import { useToast } from './use-toast';

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

export interface UseFilesResult {
  files: FileItem[];
  loading: boolean;
  error: string | null;
  uploadFile: (file: File, onProgress?: (progress: FileUploadProgress) => void) => Promise<FileUploadResult>;
  deleteFile: (fileId: number) => Promise<void>;
  refreshFiles: () => Promise<void>;
  totalSize: number;
  totalFiles: number;
}

export function useFiles(): UseFilesResult {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    if (!user) {
      setFiles([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/files?userId=${user.uid}`);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      const data = await response.json();
      setFiles(data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async (
    file: File, 
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<FileUploadResult> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      // Upload to Firebase Storage
      const result = await uploadFile(file, user.uid, onProgress);

      // Save metadata to database
      const response = await fetch('/api/files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.uid,
          name: result.name,
          originalName: result.name,
          path: result.path,
          url: result.url,
          size: result.size,
          type: result.type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save file metadata');
      }

      const fileRecord = await response.json();
      
      // Add to local state
      setFiles(prev => [fileRecord, ...prev]);

      toast({
        title: "Upload successful",
        description: `${file.name} uploaded successfully`,
      });

      return result;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Upload failed',
        variant: "destructive"
      });
      throw error;
    }
  };

  const handleDeleteFile = async (fileId: number): Promise<void> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const file = files.find(f => f.id === fileId);
      if (!file) {
        throw new Error('File not found');
      }

      // Delete from Firebase Storage
      await deleteFile(file.path);

      // Delete from database
      const response = await fetch(`/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete file from database');
      }

      // Remove from local state
      setFiles(prev => prev.filter(f => f.id !== fileId));

      toast({
        title: "File deleted",
        description: `${file.originalName} has been deleted`,
      });
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : 'Failed to delete file',
        variant: "destructive"
      });
      throw error;
    }
  };

  const refreshFiles = async () => {
    await fetchFiles();
  };

  useEffect(() => {
    fetchFiles();
  }, [user]);

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const totalFiles = files.length;

  return {
    files,
    loading,
    error,
    uploadFile: handleUploadFile,
    deleteFile: handleDeleteFile,
    refreshFiles,
    totalSize,
    totalFiles,
  };
}