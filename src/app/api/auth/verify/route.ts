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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({error: 'Missing or invalid token'}, {status: 401});
    }

    const token = authHeader.split('Bearer ')[1];
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);

    return NextResponse.json({
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
      }
    });
  } catch (error: any) {
    console.error('Error verifying token:', error);
    return NextResponse.json(
      {error: error.message || 'Failed to verify token'},
      {status: 401}
    );
  }
} 