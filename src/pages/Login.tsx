import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ChevronLeft, User, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  const success = await login(email, password);

  if (success) {
    // redirect akan di-handle berdasarkan role dari database
    navigate('/'); 
  } else {
    setError('Invalid credentials. Please check your email and password.');
  }

  setIsLoading(false);
};


  return (
    <div className="min-h-screen bg-background texture-industrial flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <div className="max-w-sm mx-auto w-full">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to continue monitoring</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 bg-card border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-12 bg-card border-border"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Demo Hint */}
          <div className="mt-6 p-4 rounded-xl bg-card/50 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Demo:</strong> Use operator@mineguardian.com or supervisor@mineguardian.com with any password
            </p>
          </div>

          {/* Forgot Password */}
          <button
            type="button"
            className="w-full mt-4 text-sm text-primary hover:underline"
          >
            Forgot password?
          </button>
        </div>
      </div>
    </div>
  );
}
