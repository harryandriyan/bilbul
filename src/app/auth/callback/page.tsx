import {useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {useAuth} from '@/contexts/auth-context';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {setUser} = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Exchange the custom token for an ID token
      fetch('/api/auth/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({token}),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user && data.token) {
            localStorage.setItem('authToken', data.token);
            setUser(data.user);
            navigate('/');
          } else {
            navigate('/auth?error=Failed to authenticate');
          }
        })
        .catch(() => {
          navigate('/auth?error=Failed to authenticate');
        });
    } else {
      navigate('/auth?error=No token received');
    }
  }, [navigate, searchParams, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
        <p className="text-muted-foreground">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
} 