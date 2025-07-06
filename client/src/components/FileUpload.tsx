import React, { useState, useRef } from 'react';
import { uploadFile, type FileUploadProgress, type FileUploadResult } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, File, Image, FileText, Video, Music } from 'lucide-react';

interface FileUploadProps {
  onUploadComplete?: (result: FileUploadResult) => void;
  accept?: string;
  maxSize?: number; // in bytes
  multiple?: boolean;
  className?: string;
}

interface UploadingFile {
  file: File;
  progress: FileUploadProgress;
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
      progress: { bytesTransferred: 0, totalBytes: file.size, percentage: 0 }
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const result = await uploadFile(
          file,
          user.uid,
          (progress) => {
            setUploadingFiles(prev => 
              prev.map(uf => 
                uf.file === file ? { ...uf, progress } : uf
              )
            );
          }
        );

        // Save file metadata to database
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

        // Remove from uploading files
        setUploadingFiles(prev => prev.filter(uf => uf.file !== file));

        toast({
          title: "Upload successful",
          description: `${file.name} uploaded successfully`,
        });

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
        
        toast({
          title: "Upload failed",
          description: `${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`,
          variant: "destructive"
        });
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
      handleFileUpload(files);
    }
  };

  const removeUploadingFile = (fileToRemove: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== fileToRemove));
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
      <Card 
        className={`border-2 border-dashed transition-colors ${
          dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Upload className="h-6 w-6" />
            Upload Files
          </CardTitle>
          <CardDescription>
            Drag and drop files here or click to browse
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="mb-4"
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInput}
            className="hidden"
          />
          <p className="text-sm text-muted-foreground">
            Maximum file size: {formatFileSize(maxSize)}
          </p>
        </CardContent>
      </Card>

      {uploadingFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadingFiles.map((uploadingFile, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getFileIcon(uploadingFile.file.type)}
                  <span className="font-medium">{uploadingFile.file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(uploadingFile.file.size)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUploadingFile(uploadingFile.file)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {uploadingFile.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{uploadingFile.error}</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  <Progress value={uploadingFile.progress.percentage} />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {formatFileSize(uploadingFile.progress.bytesTransferred)} / {formatFileSize(uploadingFile.progress.totalBytes)}
                    </span>
                    <span>{Math.round(uploadingFile.progress.percentage)}%</span>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}