import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, varchar, jsonb, index, AnyPgColumn } from 'drizzle-orm/pg-core';

// Helper to add standard auditing fields to any table
const auditFields = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'), // Soft delete
  createdBy: integer('created_by'), // Will reference users.id - hard to define generic circular ref, so integer is used
  updatedBy: integer('updated_by'),
};

// 1. users
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  name: text('name'),
  avatar: text('avatar'),
  ...auditFields
});

// 2. roles
export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  ...auditFields
});

// 3. permissions
export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  roleId: integer('role_id').notNull().references(() => roles.id),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  ...auditFields
});

// 4. projects
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('active'),
  ...auditFields
});

// 5. project_members
export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  userId: integer('user_id').notNull().references(() => users.id),
  roleId: integer('role_id').notNull().references(() => roles.id),
  ...auditFields
}, (table) => {
  return {
    projectIdIdx: index('project_members_project_id_idx').on(table.projectId),
  };
});

// 6. registers
export const registers = pgTable('registers', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(), // e.g. RFI, MIR, NCR
  type: text('type').notNull(), // Document type
  ...auditFields
});

// 7. documents
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  registerId: integer('register_id').references(() => registers.id),
  documentNumber: text('document_number').notNull(),
  title: text('title').notNull(),
  discipline: text('discipline'),
  originatorId: integer('originator_id').references(() => users.id),
  status: text('status'),
  ...auditFields
}, (table) => {
  return {
    projectIdIdx: index('documents_project_id_idx').on(table.projectId),
    documentNumberIdx: index('documents_document_number_idx').on(table.documentNumber),
    disciplineIdx: index('documents_discipline_idx').on(table.discipline),
    statusIdx: index('documents_status_idx').on(table.status),
    originatorIdIdx: index('documents_originator_id_idx').on(table.originatorId),
  };
});

// 8. document_revisions
export const documentRevisions = pgTable('document_revisions', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  revisionNumber: integer('revision_number').notNull(),
  revisionString: text('revision_string'), // e.g. '00', '01'
  submissionDate: timestamp('submission_date'),
  reviewDate: timestamp('review_date'),
  approvalDate: timestamp('approval_date'),
  closureDate: timestamp('closure_date'),
  status: text('status'),
  reviewerId: integer('reviewer_id').references(() => users.id),
  ...auditFields
}, (table) => {
  return {
    documentIdIdx: index('document_revisions_document_id_idx').on(table.documentId),
    submissionDateIdx: index('document_revisions_submission_date_idx').on(table.submissionDate),
    reviewDateIdx: index('document_revisions_review_date_idx').on(table.reviewDate),
    approvalDateIdx: index('document_revisions_approval_date_idx').on(table.approvalDate),
    closureDateIdx: index('document_revisions_closure_date_idx').on(table.closureDate),
    reviewerIdIdx: index('document_revisions_reviewer_id_idx').on(table.reviewerId),
  };
});

// 9. document_status_history
export const documentStatusHistory = pgTable('document_status_history', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  revisionId: integer('revision_id').references(() => documentRevisions.id),
  oldStatus: text('old_status'),
  newStatus: text('new_status').notNull(),
  changedAt: timestamp('changed_at').defaultNow().notNull(),
  changedById: integer('changed_by_id').references(() => users.id),
  ...auditFields
});

// Additional Specific Records
// 10. rfi_records
export const rfiRecords = pgTable('rfi_records', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  question: text('question'),
  answer: text('answer'),
  ...auditFields
});

// 11. mir_records
export const mirRecords = pgTable('mir_records', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  materialDescription: text('material_description'),
  ...auditFields
});

// 12. ir_records
export const irRecords = pgTable('ir_records', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  inspectionType: text('inspection_type'),
  ...auditFields
});

// 13. ncr_records
export const ncrRecords = pgTable('ncr_records', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  rootCause: text('root_cause'),
  correctiveAction: text('corrective_action'),
  preventiveAction: text('preventive_action'),
  ...auditFields
});

// 14. sdw_records
export const sdwRecords = pgTable('sdw_records', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  drawingType: text('drawing_type'),
  ...auditFields
});

// 15. analytics_snapshots
export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  snapshotDate: timestamp('snapshot_date').defaultNow().notNull(),
  data: jsonb('data').notNull(), // Stores historical KPI data
  ...auditFields
});

// 16. ai_insights
export const aiInsights = pgTable('ai_insights', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  insightType: text('insight_type').notNull(), // e.g. 'root_cause', 'forecast'
  payload: jsonb('payload'),
  result: jsonb('result'),
  ...auditFields
});

// 17. audit_logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  userId: integer('user_id').references(() => users.id),
  documentId: integer('document_id').references(() => documents.id),
  registerType: text('register_type'),
  actionType: text('action_type').notNull(),
  oldValue: jsonb('old_value'),
  newValue: jsonb('new_value'),
  ipAddress: text('ip_address'),
  sessionId: text('session_id'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// 18. notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  message: text('message'),
  read: boolean('read').default(false),
  ...auditFields
});

// 19. saved_filters
export const savedFilters = pgTable('saved_filters', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  filterConfig: jsonb('filter_config').notNull(),
  ...auditFields
});

// 20. reports
export const reports = pgTable('reports', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'Monthly', 'Cumulative'
  config: jsonb('config'),
  ...auditFields
});

// 21. report_exports
export const reportExports = pgTable('report_exports', {
  id: serial('id').primaryKey(),
  reportId: integer('report_id').notNull().references(() => reports.id),
  generatedUrl: text('generated_url'),
  generatedBy: integer('generated_by').references(() => users.id),
  ...auditFields
});

// 22. kpi_results
export const kpiResults = pgTable('kpi_results', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id),
  kpiName: text('kpi_name').notNull(),
  kpiValue: text('kpi_value').notNull(),
  calculationDate: timestamp('calculation_date').defaultNow().notNull(),
  ...auditFields
});

// 23. review_cycles
export const reviewCycles = pgTable('review_cycles', {
  id: serial('id').primaryKey(),
  revisionId: integer('revision_id').notNull().references(() => documentRevisions.id),
  cycleNumber: integer('cycle_number'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  ...auditFields
});

// 24. review_comments
export const reviewComments = pgTable('review_comments', {
  id: serial('id').primaryKey(),
  revisionId: integer('revision_id').notNull().references(() => documentRevisions.id),
  authorId: integer('author_id').notNull().references(() => users.id),
  commentText: text('comment_text').notNull(),
  commentCategory: text('comment_category'), // e.g. Technical, Missing Info
  ...auditFields
});

// 25. rejection_reasons
export const rejectionReasons = pgTable('rejection_reasons', {
  id: serial('id').primaryKey(),
  revisionId: integer('revision_id').notNull().references(() => documentRevisions.id),
  reasonCode: text('reason_code'),
  description: text('description'),
  ...auditFields
});

// 26. workflow_events
export const workflowEvents = pgTable('workflow_events', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id),
  eventType: text('event_type').notNull(), // e.g. 'Submitted', 'Reviewed', 'Approved'
  actorId: integer('actor_id').references(() => users.id),
  eventDate: timestamp('event_date').defaultNow().notNull(),
  notes: text('notes'),
  ...auditFields
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
  document: one(documents, {
    fields: [auditLogs.documentId],
    references: [documents.id],
  }),
  project: one(projects, {
    fields: [auditLogs.projectId],
    references: [projects.id],
  }),
}));
