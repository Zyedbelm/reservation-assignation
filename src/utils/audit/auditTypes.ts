
export interface AssignmentAuditResult {
  totalEvents: number;
  assignedEvents: number;
  assignedAssignedCount: number;
  assignedConfirmedCount: number;
  pendingEvents: number;
  pendingPastEvents: number;
  pendingUpcomingEvents: number;
  unassignedEvents: number;
  upcomingNoGmPendingCount: number;
  upcomingNoGmAssignedStatusCount: number;
  pastNoGmCount: number;
  inconsistentEvents: number;
  inconsistentEventDetails: {
    id: string;
    title: string;
    date: string;
    issue: string;
    assigned_gm_id?: string;
    assigned_gm_name?: string;
    status: string;
  }[];
  gmStats: {
    gmId: string;
    gmName: string;
    assignedCount: number;
    availabilityDates: string[];
    conflictingAssignments: any[];
  }[];
  issues: string[];
}

export interface AuditResult {
  section: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export interface ScheduleConflict {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  gmId: string;
  conflictingEvents: Array<{ 
    id: string; 
    title: string; 
    startTime: string; 
    endTime: string; 
  }>;
}

export interface FixResult {
  fixedCount: number;
  errors: string[];
}

export interface MissingCompetencyAssignment {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  gmId: string;
  gmName: string;
  gameId: string;
  gameName: string;
  issue: string;
}
