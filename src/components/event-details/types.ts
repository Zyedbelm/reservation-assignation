
export interface EventDetailsDialogProps {
  event: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showAssignmentEditor?: boolean;
  isReadOnly?: boolean;
}

export interface EventDetailsSectionProps {
  event: any;
}

export interface GMSelfUnassignmentProps {
  event: any;
  onEventChange: (updatedEvent: any) => void;
  isCurrentUserAssigned: boolean;
}
