import {NextResponse} from 'next/server';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {cookies} from 'next/headers';

// Initialize Firebase Admin
const apps = getApps();
if (!apps.length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {error: 'Missing or invalid token'},
        {status: 401}
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAuth();

    try {
      // Verify the ID token
      const decodedToken = await auth.verifyIdToken(idToken);

      // Create a session cookie
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await auth.createSessionCookie(idToken, {expiresIn});

      // Set the cookie
      const response = NextResponse.json({
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name || null,
          photoURL: decodedToken.picture || null,
        },
      });

      response.cookies.set('session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return response;
    } catch (error) {
      console.error('Error verifying token:', error);
      return NextResponse.json(
        {error: 'Invalid token'},
        {status: 401}
      );
    }
  } catch (error: any) {
    console.error('Error signing in:', error);
    return NextResponse.json(
      {error: error.message || 'Failed to sign in'},
      {status: 500}
    );
  }
} 