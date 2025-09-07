import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const { email, userType } = await request.json();
    
    if (!email || !userType) {
      return NextResponse.json({ error: 'Email and userType are required' }, { status: 400 });
    }
    
    let user = null;
    
    if (userType === 'student') {
      user = await convex.query(api.users.getStudentByEmail, { email });
    } else if (userType === 'teacher') {
      user = await convex.query(api.users.getTeacherByEmail, { email });
    } else {
      return NextResponse.json({ error: 'Invalid userType' }, { status: 400 });
    }
    
    return NextResponse.json({ exists: !!user, user: user ? { id: user._id, email: user.email, name: user.name } : null });
  } catch (error) {
    console.error('User validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
