import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { auth } from '../lib/auth';
import { toast } from 'sonner';
import { IndianRupee, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupFullName, setSignupFullName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { user, error } = await auth.signIn(loginEmail, loginPassword);
      
      if (error) {
        toast.error('Login failed: ' + error.message);
      } else if (user) {
        toast.success('Welcome back! 👋');
        navigate('/');
      }
    } catch (error) {
      toast.error('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { user, error } = await auth.signUp(
        signupEmail,
        signupPassword,
        signupUsername,
        signupFullName
      );
      
      if (error) {
        toast.error('Signup failed: ' + error.message);
      } else if (user) {
        toast.success('Account created successfully! 🎉');
        navigate('/');
      }
    } catch (error) {
      toast.error('An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      const { user, error } = await auth.signIn('demo@expense-tracker.com', 'demo123');
      if (error) {
        toast.error('Demo login failed');
      } else if (user) {
        toast.success('Logged in with demo account! 🎉');
        navigate('/');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-pink-500/10 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="space-y-6 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500">
              <IndianRupee className="size-12 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Serverless Expense Tracker</h1>
              <p className="text-muted-foreground text-lg">AI-Powered Financial Management</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="size-5 text-purple-500" />
                <h3 className="font-semibold">AI-Powered Insights</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Machine learning algorithms analyze your spending patterns and provide intelligent recommendations
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="size-5 text-blue-500" />
                <h3 className="font-semibold">Stock Market Integration</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Track investments, buy/sell stocks across sectors, and manage your portfolio in real-time
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="size-5 text-green-500" />
                <h3 className="font-semibold">Serverless Architecture</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Built on AWS Lambda-style architecture with DynamoDB and API Gateway for scalability
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="size-5 text-yellow-500" />
                <h3 className="font-semibold">Real-Time Updates</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Live expense tracking, instant budget alerts, and synchronized data across all devices
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleDemoLogin}
                    disabled={loading}
                  >
                    <Sparkles className="size-4 mr-2" />
                    Try Demo Account
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      placeholder="John Doe"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-username">Username</Label>
                    <Input
                      id="signup-username"
                      type="text"
                      placeholder="johndoe"
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-center text-muted-foreground mt-4">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
