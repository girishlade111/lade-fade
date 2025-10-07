import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileText, 
  Clock, 
  Shield, 
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FileData {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  expires_at: string;
  password_hash: string | null;
  burn_after_download: boolean;
  download_count: number;
}

export const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Check if URL needs to be corrected (port mismatch)
  useEffect(() => {
    const currentPort = window.location.port;
    const currentOrigin = window.location.origin;
    console.log('SharePage - Current port:', currentPort, 'Origin:', currentOrigin);
    
    // If someone accessed this page with wrong port (e.g., 8080 instead of 8081),
    // redirect them to the correct port
    if (currentPort === '8080' && window.location.hostname === 'localhost') {
      const correctUrl = window.location.href.replace(':8080', ':8081');
      console.log('Redirecting from wrong port to:', correctUrl);
      window.location.replace(correctUrl);
      return;
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadFileData();
    }
  }, [token]);

  useEffect(() => {
    if (fileData) {
      const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(fileData.expires_at);
        
        if (expiry > now) {
          setTimeLeft(formatDistance(expiry, now));
        } else {
          setTimeLeft('Expired');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [fileData]);

  const loadFileData = async () => {
    console.log('=== SHARE PAGE DEBUG ===');
    console.log('Share token from URL:', token);
    console.log('Current window.location:', window.location.href);
    console.log('Current origin:', window.location.origin);
    console.log('=======================');
    
    try {
      // First, get the share record
      console.log('Querying shares table for token:', token);
      const { data: shareData, error: shareError } = await supabase
        .from('shares')
        .select(`
          *,
          files (*)
        `)
        .eq('share_token', token)
        .eq('is_active', true)
        .single();

      console.log('Share query result:', { shareData, shareError });

      if (shareError || !shareData) {
        console.log('No share data found or error occurred');
        setError('Invalid or expired share link.');
        return;
      }

      // Check if expired
      if (new Date(shareData.expires_at) < new Date()) {
        setError('This file share has expired.');
        return;
      }

      const file = shareData.files as FileData;
      
      // Check if file is deleted
      if (!file || (file as any).is_deleted) {
        setError('This file is no longer available.');
        return;
      }

      setFileData(file);
      
      // Check if password is required
      if (file.password_hash) {
        setPasswordRequired(true);
      }

    } catch (error) {
      setError('Failed to load file information.');
    } finally {
      setLoading(false);
    }
  };

  const verifyPassword = () => {
    // In a real app, you would hash and compare the password
    // For demo purposes, we'll do simple string comparison
    if (fileData?.password_hash === password) {
      setPasswordRequired(false);
      toast({
        title: "Access granted",
        description: "Password verified successfully.",
      });
    } else {
      toast({
        variant: "destructive",
        title: "Incorrect password",
        description: "Please check your password and try again.",
      });
    }
  };

  const downloadFile = async () => {
    if (!fileData || !token) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Update access count
      const { error: updateError } = await supabase
        .from('shares')
        .update({ 
          accessed_at: new Date().toISOString(),
          access_count: 1
        })
        .eq('share_token', token);

      if (updateError) throw updateError;

      setDownloadProgress(30);

      // Get signed URL for download
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('uploads')
        .createSignedUrl(fileData.storage_path, 60); // 1 minute expiry

      if (signedUrlError) throw signedUrlError;

      setDownloadProgress(70);

      // Start download
      const response = await fetch(signedUrlData.signedUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      setDownloadProgress(90);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileData.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setDownloadProgress(100);

      toast({
        title: "Download started",
        description: "Your file download has begun.",
      });

      // If burn after download, mark file as deleted
      if (fileData.burn_after_download) {
        await supabase
          .from('files')
          .update({ is_deleted: true })
          .eq('id', fileData.id);

        toast({
          title: "File deleted",
          description: "This file has been permanently deleted after download.",
        });
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "An error occurred while downloading the file.",
      });
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = fileData ? new Date(fileData.expires_at) < new Date() : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-card shadow-glow border-0">
          <CardContent className="py-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading file information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-card shadow-glow border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-destructive/20 rounded-full w-fit">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-foreground">File Not Available</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (passwordRequired) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <Card className="w-full max-w-md bg-gradient-card shadow-glow border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-primary/20 rounded-full w-fit">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl text-foreground">Password Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              This file is password protected. Please enter the password to continue.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
                className="bg-background"
              />
            </div>

            <Button 
              onClick={verifyPassword} 
              variant="hero" 
              className="w-full gap-2"
              disabled={!password}
            >
              <Shield className="w-4 h-4" />
              Verify Password
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gradient-card shadow-glow border-0">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-primary/20 rounded-full w-fit">
            <FileText className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            {fileData?.original_filename}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* File Info */}
          <div className="bg-background rounded-lg p-4 border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">File Size</p>
                <p className="font-medium text-foreground">
                  {fileData && formatFileSize(fileData.file_size)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium text-foreground">
                  {fileData?.mime_type || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Downloads</p>
                <p className="font-medium text-foreground">
                  {fileData?.download_count || 0} times
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Time Left</p>
                <p className={`font-medium ${isExpired ? 'text-destructive' : 'text-foreground'}`}>
                  {timeLeft}
                </p>
              </div>
            </div>
          </div>

          {/* Warnings */}
          <div className="space-y-2">
            {fileData?.burn_after_download && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <p className="text-sm text-warning">
                  This file will be permanently deleted after download
                </p>
              </div>
            )}
            
            <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Clock className="w-5 h-5 text-primary" />
              <p className="text-sm text-primary">
                This file will automatically expire in {timeLeft}
              </p>
            </div>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Preparing download...</span>
                <span>{Math.round(downloadProgress)}%</span>
              </div>
              <Progress value={downloadProgress} className="h-2" />
            </div>
          )}

          {/* Download Button */}
          <Button
            onClick={downloadFile}
            disabled={downloading || isExpired}
            variant={isExpired ? "secondary" : "hero"}
            size="lg"
            className="w-full gap-2"
          >
            {downloading ? (
              'Preparing Download...'
            ) : isExpired ? (
              'File Expired'
            ) : (
              <>
                <Download className="w-5 h-5" />
                Download File
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By downloading this file, you acknowledge that you have the right to access it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};