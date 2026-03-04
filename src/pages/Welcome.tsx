import { useNavigate } from 'react-router-dom';
import { Shield, MapPin, Bell, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    { icon: MapPin, label: 'GPS Tracking', desc: 'Real-time location monitoring' },
    { icon: Shield, label: 'Geofencing', desc: 'Define and enforce work zones' },
    { icon: Bell, label: 'Instant Alerts', desc: 'Audible boundary warnings' },
    { icon: FileText, label: 'Audit Trail', desc: 'Complete incident history' },
  ];

  return (
    <div className="min-h-screen bg-background texture-industrial flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center glow-primary">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">
            MineGuardian
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm">
            GPS-driven zone monitoring for mining operations
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-10">
          {features.map((feature, index) => (
            <div
              key={feature.label}
              className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-4 animate-fade-in"
              style={{ animationDelay: `${200 + index * 100}ms` }}
            >
              <feature.icon className="w-6 h-6 text-primary mb-2" />
              <div className="text-sm font-semibold text-foreground">{feature.label}</div>
              <div className="text-xs text-muted-foreground">{feature.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="w-full max-w-sm space-y-3 animate-fade-in" style={{ animationDelay: '600ms' }}>
          <Button
            size="xl"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
          <Button
            size="xl"
            variant="outline"
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Create Account
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          Monitoring tool for operational awareness • Not a safety device
        </p>
      </footer>
    </div>
  );
}
