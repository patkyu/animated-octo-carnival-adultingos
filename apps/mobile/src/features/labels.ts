import type { EmploymentStatus, LivingArrangement, ResponsibilityArea } from '@adultingos/shared';

export const EMPLOYMENT_LABEL: Record<EmploymentStatus, string> = {
  student: 'Student', fresh_graduate: 'Fresh graduate', employed: 'Employed', freelancer: 'Freelancer', self_employed: 'Self-employed',
  looking_for_work: 'Looking for work', prefer_not_to_say: 'Prefer not to say',
};
export const LIVING_LABEL: Record<LivingArrangement, string> = {
  with_family: 'With family', renting: 'Renting', own_place: 'Own place', dorm: 'Dorm / bedspace', abroad: 'Living abroad', prefer_not_to_say: 'Prefer not to say',
};
export const AREA_LABEL: Record<ResponsibilityArea, string> = {
  documents: 'Government documents', bills: 'Bills & payments', employment: 'Employment', finances: 'Personal finances', subscriptions: 'Subscriptions',
  household: 'Household', goals: 'Personal goals', routines: 'Routines', milestones: 'Life milestones',
};
