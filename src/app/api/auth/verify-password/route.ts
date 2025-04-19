import {NextResponse} from 'next/server';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {signInWithEmailAndPassword} from 'firebase/auth';
import {initializeApp as initializeClientApp} from 'firebase/app';

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

// Initialize Firebase Client
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

const clientApp = initializeClientApp(firebaseConfig);
const clientAuth = getAuth(clientApp);

export async function POST(request: Request) {
  try {
    const {email, password} = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {error: 'Missing email or password'},
        {status: 400}
      );
    }

    try {
      // Sign in with email and password using Firebase Client SDK
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Create a session cookie using the ID token
      const auth = getAuth();
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await auth.createSessionCookie(idToken, {expiresIn});

      // Set the cookie
      const response = NextResponse.json({
        user: {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL,
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
      console.error('Error signing in:', error);
      return NextResponse.json(
        {error: 'Invalid email or password'},
        {status: 401}
      );
    }
  } catch (error: any) {
    console.error('Error in sign-in process:', error);
    return NextResponse.json(
      {error: error.message || 'Failed to sign in'},
      {status: 500}
    );
  }
} 