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
  const deviceOwnerCookie = request.cookies.get('device-owner') // studentId who owns this device

  // Check if the route is for students
  const isStudentRoute = pathname.startsWith('/student')
  const isTeacherRoute = pathname.startsWith('/teacher')
  
  // Handle student routes
  if (isStudentRoute) {
    const isProtectedStudentRoute = protectedStudentRoutes.some(route => 
      pathname.startsWith(route)
    );
    
    const isStudentAuthRoute = pathname === '/student/login' || pathname === '/student/register';

    // If device already has an owner, block registration entirely
    if (pathname === '/student/register' && deviceOwnerCookie) {
      return NextResponse.redirect(new URL('/student/login', request.url));
    }
    
    if (isProtectedStudentRoute) {
      // Check if student is authenticated
      let studentUser: any = null;
      
      if (studentCookie) {
        try {
          studentUser = JSON.parse(studentCookie.value);
        } catch (e) {
          const response = NextResponse.redirect(new URL('/student/login', request.url));
          response.cookies.delete('student-session');
          return response;
        }
      }
      
      // If no valid student session found
      if (!studentUser || !studentUser.email) {
        return NextResponse.redirect(new URL('/student/login', request.url));
      }
      
      // Ensure the student session belongs to the device owner (if set)
      if (deviceOwnerCookie && studentUser.id && studentUser.id !== deviceOwnerCookie.value) {
        const response = NextResponse.redirect(new URL('/student/login', request.url));
        // Clear mismatched session; keep device-owner to enforce lock
        response.cookies.delete('student-session');
        return response;
      }
      
      // Check that the email belongs to student side (has student-specific fields)
      if (!studentUser.department || !studentUser.year) {
        const response = NextResponse.redirect(new URL('/student/login', request.url));
        response.cookies.delete('student-session');
        return response;
      }
      
      return NextResponse.next();
    }
    
    if (isStudentAuthRoute) {
      // If the device already has an owner and there is a valid session for that owner, skip auth pages
      if (studentCookie) {
        try {
          const studentUser = JSON.parse(studentCookie.value);
          if (studentUser && studentUser.email && studentUser.department && studentUser.year) {
            // If deviceOwner exists and matches the current session user, always redirect to dashboard
            if (!deviceOwnerCookie || deviceOwnerCookie.value === studentUser.id) {
              return NextResponse.redirect(new URL('/student/dashboard', request.url));
            }
          }
        } catch (e) {
          const response = NextResponse.next();
          response.cookies.delete('student-session');
          return response;
        }
      }

      // If device has an owner but no session, allow reaching login so server-side checks can enforce owner match
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
      let teacherUser: any = null;
      
      if (teacherCookie) {
        try {
          teacherUser = JSON.parse(teacherCookie.value);
        } catch (e) {
          const response = NextResponse.redirect(new URL('/teacher/login', request.url));
          response.cookies.delete('teacher-session');
          return response;
        }
      }
      
      if (!teacherUser || !teacherUser.email) {
        return NextResponse.redirect(new URL('/teacher/login', request.url));
      }
      
      if (teacherUser.department || teacherUser.year) {
        const response = NextResponse.redirect(new URL('/teacher/login', request.url));
        response.cookies.delete('teacher-session');
        return response;
      }
      
      return NextResponse.next();
    }
    
    if (isTeacherAuthRoute) {
      let teacherUser: any = null;
      
      if (teacherCookie) {
        try {
          teacherUser = JSON.parse(teacherCookie.value);
          if (teacherUser && teacherUser.email && !teacherUser.department && !teacherUser.year) {
            return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
          }
        } catch (e) {
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
    if (studentCookie) {
      try {
        const studentUser = JSON.parse(studentCookie.value);
        if (studentUser && studentUser.email && studentUser.department && studentUser.year) {
          return NextResponse.redirect(new URL('/student/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/student/login', request.url));
        }
      } catch (e) {
        return NextResponse.redirect(new URL('/student/login', request.url));
      }
    }
    
    if (teacherCookie) {
      try {
        const teacherUser = JSON.parse(teacherCookie.value);
        if (teacherUser && teacherUser.email && !teacherUser.department && !teacherUser.year) {
          return NextResponse.redirect(new URL('/teacher/dashboard', request.url));
        } else {
          return NextResponse.redirect(new URL('/teacher/login', request.url));
        }
      } catch (e) {
        return NextResponse.redirect(new URL('/teacher/login', request.url));
      }
    }
    
    return NextResponse.next();
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
