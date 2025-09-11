import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileUpload } from '@/components/FileUpload';
import { formatDistance } from 'date-fns';
import { 
  Upload, 
  FileText, 
  Clock, 
  Trash2, 
  Copy, 
  Eye, 
  Shield,
  LogOut,
  Download,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileRecord {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  created_at: string;
  expires_at: string;
  download_count: number;
  burn_after_download: boolean;
  is_deleted: boolean;
  shares?: {
    share_token: string;
  }[];
}

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const { toast } = useToast();

  const loadFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select(`
          *,
          shares (
            share_token
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load files. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const copyShareLink = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard.",
    });
  };

  const deleteFile = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ is_deleted: true })
        .eq('id', fileId);

      if (error) throw error;
      
      toast({
        title: "File deleted",
        description: "File has been successfully deleted.",
      });
      
      loadFiles();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete file. Please try again.",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (showUpload) {
    return (
      <FileUpload 
        onSuccess={() => {
          setShowUpload(false);
          loadFiles();
        }} 
        onCancel={() => setShowUpload(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Lade Transfer</h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="hero" 
                onClick={() => setShowUpload(true)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload File
              </Button>
              <Button variant="ghost" onClick={signOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="w-8 h-8 text-primary" />
                <span className="text-3xl font-bold text-foreground">
                  {files.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Links
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Eye className="w-8 h-8 text-success" />
                <span className="text-3xl font-bold text-foreground">
                  {files.filter(f => !isExpired(f.expires_at)).length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Downloads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Download className="w-8 h-8 text-accent" />
                <span className="text-3xl font-bold text-foreground">
                  {files.reduce((sum, f) => sum + f.download_count, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Files List */}
        <Card className="bg-gradient-card border-0 shadow-glow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl text-foreground">Your Files</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setShowUpload(true)}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload New File
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-2">No files uploaded yet</p>
                <p className="text-muted-foreground mb-6">Upload your first file to get started</p>
                <Button variant="hero" onClick={() => setShowUpload(true)} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Your First File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {files.map((file) => {
                  const expired = isExpired(file.expires_at);
                  const shareToken = file.shares?.[0]?.share_token;
                  
                  return (
                    <div 
                      key={file.id} 
                      className={`p-4 rounded-lg border transition-all ${
                        expired 
                          ? 'bg-destructive/10 border-destructive/20' 
                          : 'bg-background border-border hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className={`w-10 h-10 flex-shrink-0 ${
                            expired ? 'text-destructive' : 'text-primary'
                          }`} />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-foreground truncate">
                              {file.original_filename}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatFileSize(file.file_size)}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistance(new Date(file.created_at), new Date(), { addSuffix: true })}
                              </span>
                              {file.burn_after_download && (
                                <Badge variant="secondary" className="text-xs">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Burn after download
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          {expired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            <>
                              <Badge variant="secondary">
                                Expires {formatDistance(new Date(file.expires_at), new Date(), { addSuffix: true })}
                              </Badge>
                              {shareToken && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyShareLink(shareToken)}
                                  className="gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  Copy Link
                                </Button>
                              )}
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFile(file.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};