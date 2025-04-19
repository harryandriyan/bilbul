import {NextResponse} from 'next/server';
import {initializeApp, getApps, cert} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {OAuth2Client} from 'google-auth-library';

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

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback` : 'http://localhost:9002/api/auth/google/callback';

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

export async function GET(request: Request) {
  // Generate the url that will be used for the consent dialog.
  const authorizeUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });

  return NextResponse.redirect(authorizeUrl);
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