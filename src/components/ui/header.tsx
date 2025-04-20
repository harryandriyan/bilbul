'use client';

import {useAuth} from '@/contexts/auth-context';
import {useTheme} from '@/contexts/theme-context';
import {Button} from './button';
import {Moon, Sun, User} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';
import {useRouter} from 'next/navigation';

export function Header() {
  const {user, logout} = useAuth();
  const {theme, toggleTheme} = useTheme();
  const router = useRouter();

  const handleSignIn = () => {
    router.push('/auth');
  };

  return (
    <header className="w-full py-4 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
        <img src="/logo.png" alt="Bilbul Logo" className="w-8 h-8 rounded-lg" />
        <span className="font-semibold text-lg">Bilbul</span>
        <p className="text-sm text-muted-foreground">Easily split your bill</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </Button>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-sm">
                Signed in as {user.email}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleSignIn}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
} 