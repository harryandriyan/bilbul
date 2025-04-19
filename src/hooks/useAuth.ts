import {useContext} from 'react';
import {AuthContext, User} from '@/context/AuthContext';
import {useToast} from '@/hooks/use-toast';

interface SignInData {
  email: string;
  password: string;
}

interface SignUpData extends SignInData {
  name: string;
}

export function useAuth() {
  const context = useContext(AuthContext);
  const {toast} = useToast();

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const {user, setUser} = context;

  const signIn = async ({email, password}: SignInData) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password}),
      });

      if (!response.ok) {
        throw new Error('Failed to sign in');
      }

      const userData: User = await response.json();
      setUser(userData);
      toast({
        title: "Success",
        description: "Signed in successfully",
      });
    } catch (error) {
      console.error('Sign in error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in",
      });
    }
  };

  const signUp = async ({email, password, name}: SignUpData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({email, password, name}),
      });

      if (!response.ok) {
        throw new Error('Failed to sign up');
      }

      const userData: User = await response.json();
      setUser(userData);
      toast({
        title: "Success",
        description: "Signed up successfully",
      });
    } catch (error) {
      console.error('Sign up error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign up",
      });
    }
  };

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      setUser(null);
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to logout",
      });
    }
  };

  return {
    user,
    signIn,
    signUp,
    logout,
  };
} 