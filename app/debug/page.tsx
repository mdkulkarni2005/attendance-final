"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DebugPage() {
  const students = useQuery(api.debug.getAllStudents);
  const teachers = useQuery(api.debug.getAllTeachers);

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Database Debug</h1>
        
        <div className="grid gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-3">Students ({students?.length || 0})</h2>
            <div className="bg-gray-50 p-4 rounded">
              {students?.length ? (
                <ul className="space-y-2">
                  {students.map((student) => (
                    <li key={student._id} className="text-sm">
                      <strong>{student.name}</strong> - {student.email} (SAP: {student.sapId}, Roll: {student.rollNo})
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No students registered</p>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-3">Teachers ({teachers?.length || 0})</h2>
            <div className="bg-gray-50 p-4 rounded">
              {teachers?.length ? (
                <ul className="space-y-2">
                  {teachers.map((teacher) => (
                    <li key={teacher._id} className="text-sm">
                      <strong>{teacher.name}</strong> - {teacher.email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No teachers registered</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
