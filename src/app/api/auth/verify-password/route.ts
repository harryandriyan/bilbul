import {NextResponse} from 'next/server';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getAuth as getAdminAuth} from 'firebase-admin/auth';
import {getAuth, signInWithEmailAndPassword} from 'firebase/auth';
import {clientApp} from '@/lib/firebase/client';

// Initialize Firebase Admin
const firebaseAdminConfig = {
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
};

if (!getApps().length) {
  initializeApp(firebaseAdminConfig);
}

const adminAuth = getAdminAuth();

export async function POST(request: Request) {
  try {
    const {email, password} = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {error: 'Email and password are required'},
        {status: 400}
      );
    }

    try {
      const clientAuth = getAuth(clientApp);
      // Sign in with email and password using Firebase Client SDK
      const userCredential = await signInWithEmailAndPassword(clientAuth, email, password);
      const idToken = await userCredential.user.getIdToken();

      // Create a session cookie using the ID token
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn,
      });

      return NextResponse.json(
        {success: true},
        {
          headers: {
            'Set-Cookie': `session=${sessionCookie}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expiresIn}`,
          },
        }
      );
    } catch (error: any) {
      console.error('Error signing in:', error);
      return NextResponse.json(
        {error: 'Invalid email or password'},
        {status: 401}
      );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      {error: 'Internal server error'},
      {status: 500}
    );
  }
} 