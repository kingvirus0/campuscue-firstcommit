export interface SampleNotice {
  id: string;
  label: string;
  blurb: string;
  text: string;
}

export const SAMPLE_NOTICES: SampleNotice[] = [
  {
    id: "siwes",
    label: "SIWES Registration",
    blurb: "Faculty circular · deadline tomorrow",
    text: `SIWES Registration

FACULTY OF ENGINEERING
OFFICE OF THE DEAN
INTERNAL CIRCULAR

All 200-level students are hereby informed that the deadline for submission of completed SIWES registration forms is October 3rd at 4:00 PM.

Students must pay the registration fee at the bursary before completing the form.

Bring your student ID, passport photograph, and payment receipt to the Engineering Faculty Office for submission.

Late submissions will not be accepted.

For enquiries, contact the SIWES coordinator at siwes.eng@university.edu or call +234 800 123 4567.

Issued: September 28, 2026`,
  },
  {
    id: "cpe211",
    label: "CPE 211 Test",
    blurb: "Course test · next week",
    text: `CPE 211 Test

DEPARTMENT OF COMPUTER ENGINEERING
COURSE NOTICE — CPE 211 DIGITAL LOGIC DESIGN

This is to inform all 200-level CPE students that a class test will hold on October 7, 2026 at 10:00 AM in Lecture Hall B.

Students are required to bring their student ID card and a scientific calculator.

The test covers Weeks 1–6 only.

Please arrive 15 minutes early. No late entry after 10:15 AM.

Lecturer: Dr. A. Okonkwo
Email: a.okonkwo@university.edu`,
  },
  {
    id: "seminar",
    label: "Departmental Seminar",
    blurb: "Public seminar · Oct 10",
    text: `Departmental Seminar

DEPARTMENT OF COMPUTER ENGINEERING
PUBLIC SEMINAR ANNOUNCEMENT

All students and staff are invited to a departmental seminar on "Building Reliable AI Systems" on October 10, 2026 at 2:00 PM at the Engineering Auditorium.

Attendance is free and open to every department. Light refreshments will be provided.

Bring your student ID for entry.

For more information, contact the seminar committee at seminar.cpe@university.edu.

Do not miss this opportunity.`,
  },
];
