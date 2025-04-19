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

export async function POST(request: Request) {
  try {
    const {token} = await request.json();

    if (!token) {
      return NextResponse.json(
        {error: 'Missing token'},
        {status: 400}
      );
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return NextResponse.json({
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      },
      token,
    });
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    return NextResponse.json(
      {error: error.message || 'Failed to exchange token'},
      {status: 401}
    );
  }
} 