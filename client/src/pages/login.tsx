import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaMicrosoft } from "react-icons/fa";
import { useAuth } from "@/hooks/useAuth";

const LoginPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

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
          <a href="/api/staff-login" className="w-full">
            <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
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
          
          <a href="/api/customer-login" className="w-full">
            <Button className="w-full bg-gray-600 hover:bg-gray-700" size="lg" variant="outline">
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