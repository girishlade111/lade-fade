import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Clock, Trash2, Download, Upload, Lock, Zap, ArrowRight } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import heroImage from '@/assets/hero-image.jpg';

export const LandingPage = () => {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return <AuthForm onSuccess={() => setShowAuth(false)} />;
  }

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Privacy First",
      description: "End-to-end secure file sharing with automatic deletion"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Time Limited",
      description: "Set custom expiry times: 10 minutes to 24 hours"
    },
    {
      icon: <Trash2 className="w-6 h-6" />,
      title: "Auto-Delete",
      description: "Files automatically vanish after expiry - no traces left"
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Password Protected",
      description: "Optional password protection for sensitive files"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Sharing",
      description: "Generate shareable links in seconds"
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "Burn After Read",
      description: "Files can self-destruct after first download"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-primary rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-foreground">Lade Transfer</span>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowAuth(true)}
            className="font-medium"
          >
            Sign In
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Private File Sharing.{' '}
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Auto-Erase After Expiry.
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            Share files securely with time-limited links that automatically delete after expiry. 
            No traces, no worries, complete privacy guaranteed.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              variant="hero" 
              size="xl"
              onClick={() => setShowAuth(true)}
              className="group"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="xl">
              Learn More
            </Button>
          </div>

          {/* Hero Image */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-gradient-card rounded-3xl p-8 shadow-glow border border-border/20">
              <img 
                src={heroImage} 
                alt="Secure file sharing interface" 
                className="w-full rounded-2xl shadow-upload"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            Why Choose Lade Transfer?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built for privacy, designed for simplicity. Share files without compromising security.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-card border-0 shadow-md hover:shadow-glow transition-shadow duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-primary rounded-lg text-white">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto bg-gradient-card rounded-3xl p-12 shadow-glow border-0">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Ready to Share Securely?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of users who trust Lade Transfer for their sensitive file sharing needs.
          </p>
          <Button 
            variant="hero" 
            size="xl"
            onClick={() => setShowAuth(true)}
            className="group"
          >
            Start Sharing Now
            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center border-t border-border/20">
        <p className="text-muted-foreground">
          © 2024 Lade Transfer. Privacy-focused file sharing.
        </p>
      </footer>
    </div>
  );
};