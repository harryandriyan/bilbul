import {NextResponse} from 'next/server';
import {cookies} from 'next/headers';

export async function POST() {
  const response = NextResponse.json({success: true});

  // Clear the session cookie
  response.cookies.set('session', '', {
    maxAge: 0,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
} 