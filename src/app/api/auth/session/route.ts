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

export async function GET() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie) {
      return NextResponse.json({user: null});
    }

    const auth = getAuth();
    const decodedClaim = await auth.verifySessionCookie(sessionCookie.value);

    const user = await auth.getUser(decodedClaim.uid);

    return NextResponse.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    return NextResponse.json({user: null});
  }
} 