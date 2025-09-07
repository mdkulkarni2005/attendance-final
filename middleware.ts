import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protected routes that require authentication
const protectedStudentRoutes = [
  '/student/dashboard',
  '/student/courses',
  '/student/attendance',
  '/student/attendance-history',
  '/student/profile',
  '/student/help'
]

const protectedTeacherRoutes = [
  '/teacher/dashboard',
  '/teacher/attendance'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Get authentication cookies
  const studentCookie = request.cookies.get('student-session')
  const teacherCookie = request.cookies.get('teacher-session')

  // Check if the route is for students
  const isStudentRoute = pathname.startsWith('/student')
  const isTeacherRoute = pathname.startsWith('/teacher')
  
  // Handle student routes
  if (isStudentRoute) {
    const isProtectedStudentRoute = protectedStudentRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    const isStudentAuthRoute = pathname === '/student/login' || pathname === '/student/register';
    
    if (isProtectedStudentRoute) {
      // Check if student is authenticated
      let studentUser = null;
      
      if (studentCookie) {
        try {
          studentUser = JSON.parse(studentCookie.value);
        } catch (e) {
          // Invalid cookie, clear it and redirect
          const response = NextResponse.redirect(new URL('/student/login', request.url));
          response.cookies.delete('student-session');
          return response;
        }
      }
      
      // If no valid student session found
      if (!studentUser || !studentUser.email) {
        return NextResponse.redirect(new URL('/student/login', request.url));
      }
      
      // Check that the email belongs to student side (has student-specific fields)
      if (!studentUser.department || !studentUser.year) {
        // This email might be from teacher side, redirect to login
        const response = NextResponse.redirect(new URL('/student/login', request.url));
        response.cookies.delete('student-session');
        return response;
      }
      
      return NextResponse.next();
    }
    
    if (isStudentAuthRoute) {
      // Check if student is already authenticated
      let studentUser = null;
      
      if (studentCookie) {
        try {
          studentUser = JSON.parse(studentCookie.value);
          
          // If authenticated and has valid student data, redirect to dashboard
          if (studentUser && studentUser.email && studentUser.department && studentUser.year) {
            return NextResponse.redirect(new URL('/student/dashboard', request.url));
          }
        } catch (e) {
          // Invalid cookie, clear it and allow access to auth route
          const response = NextResponse.next();
          response.cookies.delete('student-session');
          return response;
        }
      }
      
      return NextResponse.next();
    }
  }
  
  // Handle teacher routes
  if (isTeacherRoute) {
    const isProtectedTeacherRoute = protectedTeacherRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    const isTeacherAuthRoute = pathname === '/teacher/login' || pathname === '/teacher/register';
    
    if (isProtectedTeacherRoute) {
      // Check if teacher is authenticated
      let teacherUser = null;
      
      if (teacherCookie) {
        try {
          teacherUser = JSON.parse(teacherCookie.value);
        } catch (e) {
          // Invalid cookie, clear it and redirect
          const response = NextResponse.redirect(new URL('/teacher/login', request.url));
          response.cookies.delete('teacher-session');
          return response;
        }
      }
      
      // If no valid teacher session found
      if (!teacherUser || !teacherUser.email) {
        return NextResponse.redirect(new URL('/teacher/login', request.url));
      }
      
      // Check that the email belongs to teacher side (doesn't have student-specific fields)
      if (teacherUser.department || teacherUser.year) {
        // This email might be from student side, redirect to login
        const response = NextResponse.redirect(new URL('/teacher/login', request.url));
        response.cookies.delete('teacher-session');
        return response;
      }
      
      return NextResponse.next();
    }
    
    if (isTeacherAuthRoute) {
      // Check if teacher is already authenticated
      let teacherUser = null;
      
      if (teacherCookie) {
        try {
          teacherUser = JSON.parse(teacherCookie.value);
          
          // If authenticated and has valid teacher data, redirect to dashboard
          if (teacherUser && teacherUser.email && !teacherUser.department && !teacherUser.year) {
            return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
          }
        } catch (e) {
          // Invalid cookie, clear it and allow access to auth route
          const response = NextResponse.next();
          response.cookies.delete('teacher-session');
          return response;
        }
      }
      
      return NextResponse.next();
    }
  }
  
  // For root path, check for existing sessions and redirect accordingly
  if (pathname === '/') {
    // Check if user has existing sessions
    if (studentCookie) {
      try {
        const studentUser = JSON.parse(studentCookie.value);
        if (studentUser && studentUser.email && studentUser.department && studentUser.year) {
          // Valid student session exists, redirect to student dashboard
          return NextResponse.redirect(new URL('/student/dashboard', request.url));
        } else {
          // Invalid student session, redirect to student login
          return NextResponse.redirect(new URL('/student/login', request.url));
        }
      } catch (e) {
        // Invalid cookie, redirect to student login
        return NextResponse.redirect(new URL('/student/login', request.url));
      }
    }
    
    if (teacherCookie) {
      try {
        const teacherUser = JSON.parse(teacherCookie.value);
        if (teacherUser && teacherUser.email && !teacherUser.department && !teacherUser.year) {
          // Valid teacher session exists, redirect to teacher dashboard
          return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
        } else {
          // Invalid teacher session, redirect to teacher login
          return NextResponse.redirect(new URL('/teacher/login', request.url));
        }
      } catch (e) {
        // Invalid cookie, redirect to teacher login
        return NextResponse.redirect(new URL('/teacher/login', request.url));
      }
    }
    
    // No existing sessions found, allow access to main page with tab system
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
