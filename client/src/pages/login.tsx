import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FaMicrosoft } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Form schema
const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  useMfa: z.boolean().default(false),
  mfaCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [_, setLocation] = useLocation();
  
  // Initialize form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      useMfa: false,
      mfaCode: "",
    },
  });
  
  // Watch for changes to the useMfa checkbox
  React.useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "useMfa") {
        setShowMfa(!!value.useMfa);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsLocalLoading(true);
    try {
      console.log("Submitting login form:", values);
      
      // If MFA is enabled but no code provided, don't submit
      if (values.useMfa && (!values.mfaCode || values.mfaCode.length < 6)) {
        toast({
          title: "MFA code required",
          description: "Please enter your 6-digit MFA code",
          variant: "destructive",
        });
        setIsLocalLoading(false);
        return;
      }
      
      console.log("Sending login request to /api/auth/login");
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
        credentials: "include", // Include credentials for session cookies
      });
      
      console.log("Login response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Login error:", errorData);
        throw new Error(errorData?.message || "Login failed. Please check your credentials.");
      }
      
      const userData = await response.json();
      console.log("Login successful, user data:", userData);
      
      // If login successful, use setLocation instead of window.location to avoid page reload
      setLocation("/dashboard");
      
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLocalLoading(false);
    }
  };

  // If user is already authenticated, show logged in state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[380px] shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Checking login status...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[380px] shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">You're logged in</CardTitle>
            <CardDescription>
              You're already authenticated
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/dashboard">
              <Button size="lg">
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
      <Card className="w-[380px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Choose Login Type</CardTitle>
          <CardDescription>
            Select how you would like to log in
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Local Admin Login Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@conquest.local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="useMfa"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use Multi-factor Authentication (MFA)</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Enhanced security with one-time code verification
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              {showMfa && (
                <FormField
                  control={form.control}
                  name="mfaCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MFA Code</FormLabel>
                      <FormControl>
                        <div className="flex justify-center mt-2 mb-4">
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <Button 
                type="submit" 
                className="w-full bg-green-600 hover:bg-green-700" 
                size="lg"
                disabled={isLocalLoading}
              >
                {isLocalLoading ? "Logging in..." : "Local Admin Login"}
              </Button>
            </form>
          </Form>
          
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
          
          <a href="/api/auth/staff-login" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg" type="button">
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
          
          <a href="/api/auth/customer-login" className="w-full">
            <Button className="w-full bg-gray-600 hover:bg-gray-700" size="lg" variant="outline" type="button">
              <FaMicrosoft className="mr-2 h-5 w-5" />
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