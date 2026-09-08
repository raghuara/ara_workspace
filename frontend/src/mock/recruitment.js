import { INTERVIEW_STATUS, RECOMMENDATIONS } from '@/constants/domain'
import { daysFromNow } from '@/utils/date'

const { SCHEDULED, COMPLETED, CANCELLED, RESCHEDULED } = INTERVIEW_STATUS

const interviewSeed = [
  ['Ashan Wickrama', 'Senior Software Engineer', 'Engineering', 'EMP-0001', 1, '09:30', 'Technical', SCHEDULED],
  ['Rashmi Gunathilake', 'Product Manager', 'Product', 'EMP-0009', 1, '11:00', 'Culture Fit', SCHEDULED],
  ['Dulith Perera', 'UI/UX Designer', 'Design', 'EMP-0013', 2, '10:00', 'Phone Screening', SCHEDULED],
  ['Nipuni Ratnayake', 'QA Engineer', 'Quality Assurance', 'EMP-0017', 2, '14:30', 'Technical', SCHEDULED],
  ['Kavinda Silva', 'Software Engineer', 'Engineering', 'EMP-0002', 3, '09:00', 'System Design', SCHEDULED],
  ['Oshadi Fernando', 'HR Executive', 'Human Resources', 'EMP-0021', 3, '15:00', 'HR Discussion', SCHEDULED],
  ['Sathira Bandara', 'DevOps Engineer', 'Engineering', 'EMP-0006', 4, '10:30', 'Technical', SCHEDULED],
  ['Imesha Kaluarachchi', 'Sales Executive', 'Sales', 'EMP-0029', 5, '13:00', 'Final Round', SCHEDULED],
  ['Thisara Jayasekara', 'Business Analyst', 'Product', 'EMP-0010', 6, '11:30', 'Culture Fit', SCHEDULED],
  ['Nadun Weerakoon', 'Software Engineer', 'Engineering', 'EMP-0007', 7, '09:30', 'Phone Screening', SCHEDULED],
  ['Chathurika Silva', 'Accountant', 'Finance', 'EMP-0025', 8, '14:00', 'Technical', SCHEDULED],
  ['Randika Perera', 'Support Engineer', 'Customer Success', 'EMP-0034', 9, '10:00', 'HR Discussion', SCHEDULED],
  ['Hansika Dias', 'Product Designer', 'Design', 'EMP-0013', 10, '16:00', 'Final Round', SCHEDULED],
  ['Yohan Rodrigo', 'Senior Software Engineer', 'Engineering', 'EMP-0001', -2, '10:00', 'System Design', COMPLETED],
  ['Sanduni Wickramasuriya', 'QA Engineer', 'Quality Assurance', 'EMP-0017', -3, '11:00', 'Technical', COMPLETED],
  ['Praveen Madushan', 'Software Engineer', 'Engineering', 'EMP-0002', -4, '09:30', 'Technical', COMPLETED],
  ['Anushka Herath', 'Product Manager', 'Product', 'EMP-0009', -5, '13:30', 'Culture Fit', COMPLETED],
  ['Nimali Jayawardena', 'UI/UX Designer', 'Design', 'EMP-0014', -6, '15:00', 'Phone Screening', COMPLETED],
  ['Sajith Kumara', 'Sales Executive', 'Sales', 'EMP-0029', -7, '10:30', 'Final Round', COMPLETED],
  ['Tharushi Ekanayake', 'HR Executive', 'Human Resources', 'EMP-0021', -8, '14:00', 'HR Discussion', COMPLETED],
  ['Malinda Gunaratne', 'DevOps Engineer', 'Engineering', 'EMP-0006', -9, '11:30', 'System Design', COMPLETED],
  ['Kalpani Wijesuriya', 'Support Engineer', 'Customer Success', 'EMP-0034', -10, '09:00', 'Technical', COMPLETED],
  ['Dinesh Abeywardena', 'Finance Associate', 'Finance', 'EMP-0025', -11, '16:00', 'Culture Fit', COMPLETED],
  ['Nethmi Rajapaksha', 'Software Engineer', 'Engineering', 'EMP-0007', -12, '10:00', 'Phone Screening', COMPLETED],
  ['Isuru Dissanayake', 'Business Analyst', 'Product', 'EMP-0010', -1, '14:30', 'Technical', CANCELLED],
  ['Piyumi Nawarathne', 'Graphic Designer', 'Design', 'EMP-0013', -2, '11:00', 'Phone Screening', CANCELLED],
  ['Lasitha Bandaranayake', 'Senior QA Engineer', 'Quality Assurance', 'EMP-0017', 4, '13:00', 'Technical', RESCHEDULED],
  ['Amanda Fonseka', 'Customer Success Manager', 'Customer Success', 'EMP-0034', 6, '10:30', 'Final Round', RESCHEDULED],
]

const slug = (value) => value.toLowerCase().replace(/[^a-z]/g, '')

export const buildMockInterviews = (employeeNameById) =>
  interviewSeed.map(
    (
      [candidateName, position, department, interviewerId, dayOffset, time, type, status],
      index,
    ) => ({
      id: `INT-${String(index + 1).padStart(4, '0')}`,
      candidateName,
      candidateEmail: `${slug(candidateName).slice(0, 14)}@example.com`,
      position,
      department,
      interviewerId,
      interviewerName: employeeNameById.get(interviewerId) ?? 'Unassigned',
      date: daysFromNow(dayOffset),
      time,
      durationMinutes: type === 'Phone Screening' ? 30 : 60,
      type,
      status,
      notes:
        status === CANCELLED
          ? 'Candidate withdrew from the process.'
          : status === RESCHEDULED
            ? 'Moved at the candidate’s request.'
            : '',
    }),
  )

const reviewSeed = [
  ['INT-0014', [5, 4, 5, 5], RECOMMENDATIONS.STRONG_HIRE, 'Excellent depth on distributed systems. Walked through trade-offs clearly and asked sharp clarifying questions before designing.'],
  ['INT-0015', [4, 4, 4, 3], RECOMMENDATIONS.HIRE, 'Solid automation fundamentals and good test design instincts. Slightly light on performance testing but coachable.'],
  ['INT-0016', [3, 4, 3, 3], RECOMMENDATIONS.HOLD, 'Reasonable coding ability but struggled to reason about edge cases without prompting. Worth revisiting after more experience.'],
  ['INT-0017', [4, 5, 4, 4], RECOMMENDATIONS.STRONG_HIRE, 'Strong product sense and very clear communicator. Gave concrete examples of prioritisation under pressure.'],
  ['INT-0018', [4, 4, 3, 3], RECOMMENDATIONS.HIRE, 'Good portfolio with thoughtful interaction detail. Would benefit from more exposure to design systems work.'],
  ['INT-0019', [3, 5, 4, 4], RECOMMENDATIONS.HIRE, 'Confident and personable with a credible track record on enterprise deals. Product knowledge will need ramp-up.'],
  ['INT-0020', [3, 4, 3, 2], RECOMMENDATIONS.HOLD, 'Pleasant discussion but limited exposure to the scale of process we run. Keep warm for a junior opening.'],
  ['INT-0021', [5, 4, 5, 5], RECOMMENDATIONS.STRONG_HIRE, 'Deep operational knowledge across CI/CD and observability. Already running a comparable stack at current employer.'],
  ['INT-0022', [2, 3, 2, 2], RECOMMENDATIONS.NO_HIRE, 'Struggled with core troubleshooting scenarios and could not explain previous incident work in any detail.'],
  ['INT-0023', [4, 4, 4, 3], RECOMMENDATIONS.HIRE, 'Methodical and accurate, with good grounding in reconciliation work. Suitable for the associate level.'],
  ['INT-0024', [3, 3, 3, 2], RECOMMENDATIONS.HOLD, 'Enthusiastic but early in the career. Recommend a follow-up technical round before deciding.'],
]

export const buildMockInterviewReviews = (interviewsById, employeeNameById) =>
  reviewSeed.map(([interviewId, scores, recommendation, notes], index) => {
    const interview = interviewsById.get(interviewId)
    const [technicalSkills, communication, problemSolving, experience] = scores

    return {
      id: `IRV-${String(index + 1).padStart(4, '0')}`,
      interviewId,
      candidateName: interview?.candidateName ?? 'Unknown candidate',
      position: interview?.position ?? '—',
      reviewerId: interview?.interviewerId ?? '',
      reviewerName: employeeNameById.get(interview?.interviewerId) ?? 'Unassigned',
      submittedOn: interview?.date ?? daysFromNow(-index),
      ratings: { technicalSkills, communication, problemSolving, experience },
      recommendation,
      notes,
    }
  })
