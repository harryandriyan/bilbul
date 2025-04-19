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
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.redirect('/auth?error=No authorization code received');
    }

    // Get tokens from Google
    const {tokens} = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user info from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {Authorization: `Bearer ${tokens.access_token}`},
      }
    );
    const userInfo = await userInfoResponse.json();

    // Create or get Firebase user
    const auth = getAuth();
    let firebaseUser;
    try {
      firebaseUser = await auth.getUserByEmail(userInfo.email);
    } catch (error) {
      // User doesn't exist, create one
      firebaseUser = await auth.createUser({
        email: userInfo.email,
        displayName: userInfo.name,
        photoURL: userInfo.picture,
      });
    }

    // Create a custom token
    const customToken = await auth.createCustomToken(firebaseUser.uid);

    // Redirect to frontend with token
    return NextResponse.redirect(`/auth/callback?token=${customToken}`);
  } catch (error: any) {
    console.error('Error in Google callback:', error);
    return NextResponse.redirect('/auth?error=Failed to authenticate with Google');
  }
} 