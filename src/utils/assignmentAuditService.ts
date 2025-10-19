
// Service d'audit des assignations refactorisé
export { performAssignmentAudit } from './audit/core/auditOrchestrator';
export { fixAssignmentInconsistencies } from './audit/inconsistencyFixer';
export { fixInconsistentStatuses, diagnoseInconsistentStatuses } from './audit/inconsistencyStatusFixer';
