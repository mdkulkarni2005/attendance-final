"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SessionUser = { id: string; name: string; email: string; department: string; year: number; semester?: number } | null;

export default function StudentCoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = typeof window !== "undefined" && sessionStorage.getItem("student");
    if (!raw) {
      router.replace("/student/login");
      return;
    }
    try {
      setUser(JSON.parse(raw));
    } catch {
      sessionStorage.removeItem("student");
      router.replace("/student/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Mock course data based on department and year
  const getCourses = () => {
    if (!user) return [];
    
    const { department, year, semester } = user;
    
    // Sample courses based on department and year
    const coursesByDepartment: Record<string, Record<number, string[]>> = {
      "Mechanical": {
        1: ["Engineering Mathematics I", "Engineering Physics", "Engineering Chemistry", "Engineering Graphics", "Workshop Technology"],
        2: ["Engineering Mathematics II", "Strength of Materials", "Thermodynamics", "Fluid Mechanics", "Manufacturing Processes"],
        3: ["Machine Design", "Heat Transfer", "Automobile Engineering", "Industrial Engineering", "CAD/CAM"],
        4: ["Project Management", "Advanced Manufacturing", "Robotics", "Renewable Energy", "Final Year Project"]
      },
      "Computer": {
        1: ["Programming Fundamentals", "Computer Organization", "Digital Logic", "Mathematics for CS", "Communication Skills"],
        2: ["Data Structures", "Object Oriented Programming", "Database Systems", "Computer Networks", "Operating Systems"],
        3: ["Software Engineering", "Web Development", "Artificial Intelligence", "Machine Learning", "Mobile App Development"],
        4: ["Cloud Computing", "Cybersecurity", "Big Data Analytics", "IoT Systems", "Capstone Project"]
      },
      "Electrical": {
        1: ["Circuit Analysis", "Electronics Fundamentals", "Mathematics for EE", "Programming Basics", "Engineering Drawing"],
        2: ["Analog Electronics", "Digital Electronics", "Electromagnetic Theory", "Signals and Systems", "Control Systems"],
        3: ["Power Electronics", "Microprocessors", "Communication Systems", "Power Systems", "Industrial Automation"],
        4: ["Smart Grid Technology", "Renewable Energy Systems", "VLSI Design", "Advanced Control Systems", "Final Project"]
      },
      "Civil": {
        1: ["Engineering Mechanics", "Building Materials", "Surveying", "Engineering Mathematics", "Environmental Studies"],
        2: ["Structural Analysis", "Concrete Technology", "Soil Mechanics", "Fluid Mechanics", "Construction Technology"],
        3: ["Design of Structures", "Transportation Engineering", "Water Resources", "Environmental Engineering", "Project Planning"],
        4: ["Advanced Structural Design", "Smart Cities", "Earthquake Engineering", "Sustainable Construction", "Major Project"]
      },
      "Electronics": {
        1: ["Basic Electronics", "Circuit Theory", "Mathematics", "Programming", "Engineering Graphics"],
        2: ["Analog Circuits", "Digital Systems", "Microprocessors", "Communication Theory", "Electronic Devices"],
        3: ["VLSI Design", "Embedded Systems", "Signal Processing", "Wireless Communication", "Control Systems"],
        4: ["IoT Applications", "Advanced Communication", "Robotics", "Biomedical Electronics", "Final Year Project"]
      },
      "Chemical": {
        1: ["Chemical Process Principles", "Mathematics", "Chemistry", "Physics", "Engineering Drawing"],
        2: ["Mass Transfer", "Heat Transfer", "Fluid Mechanics", "Chemical Reaction Engineering", "Thermodynamics"],
        3: ["Process Control", "Chemical Plant Design", "Environmental Engineering", "Biochemical Engineering", "Materials Science"],
        4: ["Process Optimization", "Safety Engineering", "Green Chemistry", "Industrial Biotechnology", "Capstone Project"]
      }
    };

    return coursesByDepartment[department]?.[year] || [];
  };

  const courses = getCourses();

  if (loading) return null;
  if (!user) return null;

  return (
    <main className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-black">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <Link href="/student/dashboard" className="text-white/80 hover:text-white text-sm">
            ← Back to Dashboard
          </Link>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h1 className="text-xl font-semibold text-slate-900">My Courses</h1>
          </div>
          
          <div className="p-6">
            {/* Student Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h2 className="text-lg font-medium mb-2 text-blue-900">Academic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <p><span className="font-medium text-blue-800">Department:</span> <span className="text-blue-700">{user.department}</span></p>
                <p><span className="font-medium text-blue-800">Year:</span> <span className="text-blue-700">{user.year}</span></p>
                <p><span className="font-medium text-blue-800">Semester:</span> <span className="text-blue-700">{user.semester || "Not set"}</span></p>
                <p><span className="font-medium text-blue-800">Total Courses:</span> <span className="text-blue-700">{courses.length}</span></p>
              </div>
            </div>

            {/* Courses Grid */}
            <div>
              <h3 className="text-lg font-medium mb-4">Current Courses ({user.department} - Year {user.year})</h3>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {courses.map((course, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-slate-900">{course}</h4>
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>Department: {user.department}</p>
                        <p>Year: {user.year}</p>
                        {user.semester && <p>Semester: {user.semester}</p>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Course Code: {user.department.substring(0, 2).toUpperCase()}{user.year}0{index + 1}</span>
                          <span>Credits: {Math.floor(Math.random() * 3) + 3}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-slate-900 mb-2">No Courses Found</h4>
                  <p className="text-slate-600">No courses available for your current academic configuration.</p>
                </div>
              )}
            </div>

            {/* Academic Calendar */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h3 className="text-lg font-medium mb-4">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900">Current Semester</h4>
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>Semester: {user.semester || "Not set"}</p>
                    <p>Academic Year: 2024-25</p>
                    <p>Session: Regular</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-medium text-slate-900">Quick Actions</h4>
                  <div className="space-y-2">
                    <Link href="/student/attendance-history" className="block text-sm text-blue-600 hover:text-blue-800">
                      View Attendance Records
                    </Link>
                    <Link href="/student/profile" className="block text-sm text-blue-600 hover:text-blue-800">
                      Update Profile
                    </Link>
                    <Link href="/student/dashboard" className="block text-sm text-blue-600 hover:text-blue-800">
                      Back to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
