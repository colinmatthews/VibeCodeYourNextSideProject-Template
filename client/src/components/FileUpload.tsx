import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { useFiles } from '@/hooks/useFiles';
import { Upload, X, File, Image, FileText, Video, Music } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (result: any) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: { percentage: number };
  error?: string;
}

export function FileUpload({ 
  onUploadComplete, 
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  className = ''
}: FileUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile } = useFiles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (type.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (type.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`;
    }
    
    if (accept !== '*/*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;
      
      const isAccepted = acceptedTypes.some(type => 
        type === mimeType || 
        type === fileExtension || 
        (type.endsWith('/*') && mimeType.startsWith(type.slice(0, -1)))
      );
      
      if (!isAccepted) {
        return `File type not supported. Accepted types: ${accept}`;
      }
    }
    
    return null;
  };

  const handleFileUpload = async (files: File[]) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive"
      });
      return;
    }

    const validFiles: File[] = [];
    for (const file of files) {
      const error = validateFile(file);
      if (error) {
        toast({
          title: "File validation error",
          description: `${file.name}: ${error}`,
          variant: "destructive"
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Initialize uploading files
    const newUploadingFiles = validFiles.map(file => ({
      file,
      progress: { percentage: 0 }
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files using the shared hook
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        // Update progress to show uploading
        setUploadingFiles(prev => 
          prev.map(uf => 
            uf.file === file ? { ...uf, progress: { percentage: 50 } } : uf
          )
        );

        // Use the shared uploadFile function from useFiles hook
        const result = await uploadFile(file);

        // Remove from uploading files
        setUploadingFiles(prev => prev.filter(uf => uf.file !== file));

        // Call the callback if provided
        onUploadComplete?.(result);

      } catch (error) {
        console.error('Upload error:', error);
        setUploadingFiles(prev => 
          prev.map(uf => 
            uf.file === file 
              ? { ...uf, error: error instanceof Error ? error.message : 'Upload failed' }
              : uf
          )
        );
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(multiple ? files : [files[0]]);
    }
  };

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          className="hidden"
        />

        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        
        <p className="text-lg font-medium mb-1">
          Drop {multiple ? 'files' : 'a file'} here or click to browse
        </p>
        
        <p className="text-sm text-muted-foreground mb-4">
          Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB
        </p>

        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
        >
          Choose {multiple ? 'Files' : 'File'}
        </Button>
      </div>

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <div
              key={`${uploadingFile.file.name}-${index}`}
              className="flex items-center gap-3 p-3 border rounded-lg"
            >
              {getFileIcon(uploadingFile.file.type)}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {uploadingFile.file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadingFile.file.size)}
                </p>
              </div>

              {uploadingFile.error ? (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-destructive">{uploadingFile.error}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFile(uploadingFile.file)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-20">
                  <Progress value={uploadingFile.progress.percentage} className="h-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}