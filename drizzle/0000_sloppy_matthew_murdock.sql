CREATE TABLE "ai_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"insight_type" text NOT NULL,
	"payload" jsonb,
	"result" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "analytics_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"snapshot_date" timestamp DEFAULT now() NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"user_id" integer,
	"document_id" integer,
	"register_type" text,
	"action_type" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"session_id" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"revision_number" integer NOT NULL,
	"revision_string" text,
	"submission_date" timestamp,
	"review_date" timestamp,
	"approval_date" timestamp,
	"closure_date" timestamp,
	"status" text,
	"reviewer_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "document_status_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"revision_id" integer,
	"old_status" text,
	"new_status" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"changed_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"register_id" integer,
	"document_number" text NOT NULL,
	"title" text NOT NULL,
	"discipline" text,
	"originator_id" integer,
	"status" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "ir_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"inspection_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "kpi_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"kpi_name" text NOT NULL,
	"kpi_value" text NOT NULL,
	"calculation_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "mir_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"material_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "ncr_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"root_cause" text,
	"corrective_action" text,
	"preventive_action" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"action" text NOT NULL,
	"resource" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "project_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "registers" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "rejection_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision_id" integer NOT NULL,
	"reason_code" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "report_exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"generated_url" text,
	"generated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"config" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "review_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision_id" integer NOT NULL,
	"author_id" integer NOT NULL,
	"comment_text" text NOT NULL,
	"comment_category" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "review_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"revision_id" integer NOT NULL,
	"cycle_number" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "rfi_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"question" text,
	"answer" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "saved_filters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"filter_config" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "sdw_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"drawing_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "workflow_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" integer,
	"event_date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	"created_by" integer,
	"updated_by" integer
);
--> statement-breakpoint
ALTER TABLE "ai_insights" ADD CONSTRAINT "ai_insights_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_snapshots" ADD CONSTRAINT "analytics_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_revisions" ADD CONSTRAINT "document_revisions_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_status_history" ADD CONSTRAINT "document_status_history_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_status_history" ADD CONSTRAINT "document_status_history_revision_id_document_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_status_history" ADD CONSTRAINT "document_status_history_changed_by_id_users_id_fk" FOREIGN KEY ("changed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_register_id_registers_id_fk" FOREIGN KEY ("register_id") REFERENCES "public"."registers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_originator_id_users_id_fk" FOREIGN KEY ("originator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ir_records" ADD CONSTRAINT "ir_records_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_results" ADD CONSTRAINT "kpi_results_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mir_records" ADD CONSTRAINT "mir_records_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ncr_records" ADD CONSTRAINT "ncr_records_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permissions" ADD CONSTRAINT "permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registers" ADD CONSTRAINT "registers_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rejection_reasons" ADD CONSTRAINT "rejection_reasons_revision_id_document_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_exports" ADD CONSTRAINT "report_exports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_revision_id_document_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_comments" ADD CONSTRAINT "review_comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cycles" ADD CONSTRAINT "review_cycles_revision_id_document_revisions_id_fk" FOREIGN KEY ("revision_id") REFERENCES "public"."document_revisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfi_records" ADD CONSTRAINT "rfi_records_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sdw_records" ADD CONSTRAINT "sdw_records_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_revisions_document_id_idx" ON "document_revisions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "document_revisions_submission_date_idx" ON "document_revisions" USING btree ("submission_date");--> statement-breakpoint
CREATE INDEX "document_revisions_review_date_idx" ON "document_revisions" USING btree ("review_date");--> statement-breakpoint
CREATE INDEX "document_revisions_approval_date_idx" ON "document_revisions" USING btree ("approval_date");--> statement-breakpoint
CREATE INDEX "document_revisions_closure_date_idx" ON "document_revisions" USING btree ("closure_date");--> statement-breakpoint
CREATE INDEX "document_revisions_reviewer_id_idx" ON "document_revisions" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "documents_project_id_idx" ON "documents" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "documents_document_number_idx" ON "documents" USING btree ("document_number");--> statement-breakpoint
CREATE INDEX "documents_discipline_idx" ON "documents" USING btree ("discipline");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_originator_id_idx" ON "documents" USING btree ("originator_id");--> statement-breakpoint
CREATE INDEX "project_members_project_id_idx" ON "project_members" USING btree ("project_id");