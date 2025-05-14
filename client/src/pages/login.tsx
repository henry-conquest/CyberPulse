import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaMicrosoft } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import conquestLogo from "@/assets/conquest-logo.png";

const LoginPage = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [_, setLocation] = useLocation();
  
  // Check for query parameters and handle authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First, check for login type in query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const loginType = urlParams.get('type');
        
        if (loginType === 'staff') {
          // Redirect to staff login
          window.location.href = '/api/auth/staff-login';
          return;
        } else if (loginType === 'customer') {
          // Redirect to customer login 
          window.location.href = '/api/auth/customer-login';
          return;
        }
        
        // Otherwise check regular authentication
        const response = await fetch("/api/auth/user", {
          credentials: "include",
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data) {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };
    
    checkAuth();
  }, []);
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log("Submitting login with:", email);
      
      console.log("Sending authentication request");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });
      
      console.log("Login response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Login failed");
      }
      
      const userData = await response.json();
      console.log("Login successful, user data:", userData);
      
      // Navigate to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If loading, show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <Card className="w-[400px] shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={conquestLogo} 
                alt="ConQuest Logo" 
                className="h-12 object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">
              Cyber Risk Management Portal
            </CardTitle>
            <CardDescription className="mt-6">
              <Loader2 className="mx-auto h-6 w-6 animate-spin" />
              <p className="mt-2">Logging in...</p>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If already authenticated, show logged in state
  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
        <Card className="w-[400px] shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src={conquestLogo} 
                alt="ConQuest Logo" 
                className="h-12 object-contain"
              />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">
              Cyber Risk Management Portal
            </CardTitle>
            <CardDescription className="mt-2">
              You're already signed in
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center pt-0">
            <Link href="/dashboard">
              <Button size="lg" className="bg-teal-600 hover:bg-teal-700">
                Go to Dashboard
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If not authenticated, show login options
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <img 
              src={conquestLogo} 
              alt="ConQuest Logo" 
              className="h-12 object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-cyan-600 bg-clip-text text-transparent">
            Cyber Risk Management Portal
          </CardTitle>
          <CardDescription className="mt-2">
            Select how you would like to log in
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Local Admin Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@conquest.local"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-teal-600 hover:bg-teal-700 text-white" 
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Local Admin Login"
              )}
            </Button>
          </form>
          
          <p className="text-center text-sm text-muted-foreground">
            For initial setup, use admin@conquest.local with password: admin
          </p>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or use Microsoft SSO</span>
            </div>
          </div>
          
          <a href="/login?type=staff" className="w-full">
            <Button className="w-full bg-cyan-600 hover:bg-cyan-700 text-white" size="lg" type="button">
              <FaMicrosoft className="mr-2 h-5 w-5" />
              Staff Login
            </Button>
          </a>
          <p className="text-center text-sm text-muted-foreground">For ConQuest staff members with admin access</p>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">or</span>
            </div>
          </div>
          
          <a href="/login?type=customer" className="w-full">
            <Button className="w-full bg-white hover:bg-gray-100 text-gray-800 border border-gray-300" size="lg" type="button">
              <FaMicrosoft className="mr-2 h-5 w-5 text-cyan-600" />
              Customer Login
            </Button>
          </a>
          <p className="text-center text-sm text-muted-foreground">For customers to view their tenant information</p>
        </CardContent>
        
        <CardFooter className="flex flex-col items-center gap-2">
          <p className="text-center text-sm text-muted-foreground">
            Need help? Contact your account manager
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginPage;