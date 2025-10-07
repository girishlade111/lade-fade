import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  ArrowLeft, 
  Share2, 
  Clock,
  Shield,
  AlertTriangle,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateShareUrl } from '@/lib/url-config';

interface FileUploadProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const FileUpload = ({ onSuccess, onCancel }: FileUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expiryTime, setExpiryTime] = useState('10m');
  const [password, setPassword] = useState('');
  const [burnAfterDownload, setBurnAfterDownload] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [uploadComplete, setUploadComplete] = useState(false);
  
  // Fallback function to generate share token client-side
  const generateFallbackToken = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const getExpiryDate = (expiry: string) => {
    const now = new Date();
    switch (expiry) {
      case '10m':
        return new Date(now.getTime() + 10 * 60 * 1000);
      case '1h':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 10 * 60 * 1000);
    }
  };

  const uploadFile = async () => {
    if (!file || !user) return;

    setUploading(true);
    setProgress(0);
    
    // Debug current URL info
    console.log('=== URL DEBUG INFO ===');
    console.log('window.location.href:', window.location.href);
    console.log('window.location.origin:', window.location.origin);
    console.log('window.location.hostname:', window.location.hostname);
    console.log('window.location.port:', window.location.port);
    console.log('window.location.protocol:', window.location.protocol);
    console.log('=====================');

    try {
      // Create file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      // Upload to storage
      console.log('Uploading file to storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      console.log('File uploaded successfully:', uploadData);
      setProgress(50);

      // Create file record
      console.log('Creating file record...');
      const expiresAt = getExpiryDate(expiryTime);
      const { data: fileData, error: fileError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          filename: fileName,
          original_filename: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_path: uploadData.path,
          expires_at: expiresAt.toISOString(),
          password_hash: password ? password : null, // In real app, hash the password
          burn_after_download: burnAfterDownload,
        })
        .select()
        .single();

      if (fileError) {
        console.error('File record creation error:', fileError);
        throw new Error(`Failed to create file record: ${fileError.message}`);
      }

      console.log('File record created successfully:', fileData);
      setProgress(75);

      // Generate share token
      console.log('Generating share token...');
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('generate_share_token');

      if (tokenError) {
        console.error('Token generation error:', tokenError);
        // Fallback: generate a secure random token client-side
        const fallbackToken = generateFallbackToken();
        console.log('Using fallback token:', fallbackToken);
        
        // Create share record with fallback token
        const { error: shareError } = await supabase
          .from('shares')
          .insert({
            file_id: fileData.id,
            share_token: fallbackToken,
            expires_at: expiresAt.toISOString(),
          });

        if (shareError) {
          console.error('Share creation error with fallback token:', shareError);
          throw new Error(`Failed to create share record: ${shareError.message}`);
        }

        console.log('Share record created successfully with fallback token');
        setProgress(100);

        // Generate share link using utility function
        const shareUrl = generateShareUrl(fallbackToken);
        setShareLink(shareUrl);
        setUploadComplete(true);
        
        toast({
          title: "Upload successful!",
          description: "Your file has been uploaded and share link generated.",
        });
        return;
      }

      if (!tokenData) {
        throw new Error('No token received from generate_share_token function');
      }

      console.log('Token generated successfully:', tokenData);
      setProgress(95);

      // Create share record
      console.log('Creating share record with token:', tokenData);
      const { error: shareError } = await supabase
        .from('shares')
        .insert({
          file_id: fileData.id,
          share_token: tokenData,
          expires_at: expiresAt.toISOString(),
        });

      if (shareError) {
        console.error('Share creation error:', shareError);
        throw new Error(`Failed to create share record: ${shareError.message}`);
      }

      console.log('Share record created successfully');

      setProgress(100);

      // Generate share link using utility function
      const shareUrl = generateShareUrl(tokenData);
      setShareLink(shareUrl);
      setUploadComplete(true);

      toast({
        title: "Upload successful!",
        description: "Your file has been uploaded and share link generated.",
      });

    } catch (error: any) {
      console.error('Upload error details:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "An error occurred during upload. Please check console for details.",
      });
    } finally {
      setUploading(false);
    }
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    toast({
      title: "Link copied!",
      description: "Share link has been copied to clipboard.",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (uploadComplete) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl bg-gradient-card shadow-glow border-0">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-success/20 rounded-full w-fit">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <CardTitle className="text-2xl text-foreground">File Uploaded Successfully!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-background rounded-lg p-4 border">
              <div className="flex items-center gap-3 mb-3">
                <File className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">{file?.name}</p>
                  <p className="text-sm text-muted-foreground">{file && formatFileSize(file.size)}</p>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    Expires in {expiryTime === '10m' ? '10 minutes' : expiryTime === '1h' ? '1 hour' : '24 hours'}
                  </span>
                </div>
                
                {password && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="w-4 h-4" />
                    <span>Password protected</span>
                  </div>
                )}
                
                {burnAfterDownload && (
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Will delete after first download</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Share Link</Label>
              <div className="mt-2 flex gap-2">
                <Input 
                  value={shareLink} 
                  readOnly 
                  className="bg-background font-mono text-sm"
                  title={`Generated URL: ${shareLink}`}
                />
                <Button onClick={copyShareLink} variant="outline" className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Base URL: {shareLink.split('/share/')[0]}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={onSuccess} variant="hero" className="flex-1 gap-2">
                <Share2 className="w-4 h-4" />
                Go to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline">
                Upload Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={onCancel} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-gradient-card shadow-glow border-0">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-foreground">
                Upload & Share File
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  file 
                    ? 'border-success bg-success/5' 
                    : 'border-primary/30 bg-primary/5 hover:border-primary/50'
                }`}
              >
                {file ? (
                  <div className="space-y-3">
                    <CheckCircle className="w-12 h-12 text-success mx-auto" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setFile(null)}
                      className="mt-2"
                    >
                      Choose Different File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-primary mx-auto" />
                    <div>
                      <p className="font-medium text-foreground mb-1">
                        Drop your file here or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Maximum file size: 50MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (selectedFile) {
                          setFile(selectedFile);
                        }
                      }}
                    />
                    <Button 
                      variant="upload" 
                      onClick={() => document.getElementById('file-upload')?.click()}
                      className="mt-3"
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              {/* Upload Settings */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiry" className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expiry Time
                  </Label>
                  <Select value={expiryTime} onValueChange={setExpiryTime}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10m">10 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Password (Optional)
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Burn After Download */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="burn"
                  checked={burnAfterDownload}
                  onCheckedChange={(checked) => setBurnAfterDownload(!!checked)}
                />
                <Label htmlFor="burn" className="flex items-center gap-2 cursor-pointer">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Burn after download (delete after first access)
                </Label>
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={uploadFile}
                disabled={!file || uploading}
                variant="hero"
                size="lg"
                className="w-full gap-2"
              >
                {uploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload & Generate Share Link
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};