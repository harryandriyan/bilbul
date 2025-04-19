import {NextResponse} from 'next/server';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';

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

export async function GET(request: Request) {
  try {
    // Get the current host from the request
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const redirectUrl = `${protocol}://${host}`;

    // Use NEXT_PUBLIC_ prefixed variables for client-side values
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!authDomain || !apiKey) {
      throw new Error('Missing required Firebase configuration');
    }

    // Redirect to Firebase's Google auth page
    const url = `https://${authDomain}/__/auth/handler?apiKey=${apiKey}&authType=signInWithPopup&provider=google.com&redirectUrl=${redirectUrl}`;

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Error in Google auth redirect:', error);
    return NextResponse.redirect('/auth?error=Failed to initialize Google sign-in');
  }
}

export async function POST(request: Request) {
  try {
    const {idToken} = await request.json();

    if (!idToken) {
      return NextResponse.json(
        {error: 'Missing ID token'},
        {status: 400}
      );
    }

    // Verify the token with Firebase Admin
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    return NextResponse.json({
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      },
      token: idToken,
    });
  } catch (error: any) {
    console.error('Error verifying Google sign-in:', error);
    return NextResponse.json(
      {error: error.message || 'Failed to verify Google sign-in'},
      {status: 401}
    );
  }
} 