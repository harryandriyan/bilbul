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
    const {email, password} = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {error: 'Missing email or password'},
        {status: 400}
      );
    }

    const auth = getAuth();
    const userRecord = await auth.createUser({
      email,
      password,
    });

    return NextResponse.json({
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
      }
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      {error: error.message || 'Failed to create user'},
      {status: 500}
    );
  }
} 