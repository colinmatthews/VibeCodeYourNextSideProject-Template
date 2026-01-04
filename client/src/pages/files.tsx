import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useUser } from '@/hooks/useUser';
import { useFiles } from '@/hooks/useFiles';
import { HardDrive, Upload, List, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Files() {
  const { user, isLoading } = useAuth();
  const { user: userData } = useUser();
  const { files, loading, totalSize, totalFiles } = useFiles();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isPro = userData?.subscriptionType === 'pro';
  const maxFiles = isPro ? 100 : 10;
  const maxSize = isPro ? 1024 * 1024 * 1024 : 100 * 1024 * 1024; // 1GB pro, 100MB free
  const usagePercentage = (totalSize / maxSize) * 100;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access your files.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">File Storage</h1>
        <p className="text-muted-foreground">
          Upload, manage, and share your files securely
        </p>
      </div>

      {/* Storage Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Overview
          </CardTitle>
          <CardDescription>
            Your current storage usage and limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{totalFiles}</div>
              <div className="text-sm text-muted-foreground">
                Files ({maxFiles} max)
              </div>
              <Badge variant={totalFiles >= maxFiles ? "destructive" : "secondary"} className="mt-2">
                {totalFiles >= maxFiles ? "Limit reached" : `${maxFiles - totalFiles} remaining`}
              </Badge>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{formatFileSize(totalSize)}</div>
              <div className="text-sm text-muted-foreground">
                Used ({formatFileSize(maxSize)} max)
              </div>
              <Badge variant={usagePercentage >= 90 ? "destructive" : usagePercentage >= 70 ? "secondary" : "outline"} className="mt-2">
                {Math.round(usagePercentage)}% used
              </Badge>
            </div>
            
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{isPro ? "Pro" : "Free"}</div>
              <div className="text-sm text-muted-foreground">
                Plan
              </div>
              <Badge variant={isPro ? "default" : "secondary"} className="mt-2">
                {isPro ? "Unlimited features" : "Basic features"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Manage ({totalFiles})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Files</CardTitle>
              <CardDescription>
                Upload files to your secure storage. {isPro ? 'Pro users' : 'Free users'} can upload up to {maxFiles} files 
                with a total size limit of {formatFileSize(maxSize)}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalFiles >= maxFiles ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached your file limit. Please delete some files or upgrade to Pro for more storage.
                  </AlertDescription>
                </Alert>
              ) : usagePercentage >= 100 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    You've reached your storage limit. Please delete some files or upgrade to Pro for more storage.
                  </AlertDescription>
                </Alert>
              ) : (
                <FileUpload
                  maxSize={isPro ? 50 * 1024 * 1024 : 10 * 1024 * 1024} // 50MB pro, 10MB free per file
                  multiple={true}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <FileList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
