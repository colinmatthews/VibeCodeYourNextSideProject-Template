# CLAUDE.md - VibeCode Template Development Guide

This document provides comprehensive information for Claude AI when working on this VibeCode Template project.

## Project Overview

This is a **full-stack web application template** designed for rapid side project development with:
- **Frontend**: React + TypeScript + Vite + TailwindCSS + shadcn/ui
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (via Neon) + Drizzle ORM
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage with secure file management
- **Payments**: Stripe Checkout (simplified payment flow)
- **Email**: SendGrid
- **Deployment**: Optimized for quick deployment

[... rest of the existing content ...]

## Database Management

### Migrations with Drizzle Kit

The project uses Drizzle Kit for database migrations. Configuration is in `drizzle.config.ts`.

**Available Commands:**
- `npm run db:generate` - Generate new migration files when schema changes
- `npm run db:migrate` - Apply pending migrations to the database
- `npm run db:push` - Push schema directly to database (use for rapid development)
- `npm run db:studio` - Open Drizzle Studio UI for database exploration
- `npm run db:check` - Check migration status and consistency

**Migration Workflow:**
1. Make changes to schema in `shared/schema.ts`
2. Run `npm run db:generate` to create migration files
3. Review generated SQL in `server/migrations/`
4. Run `npm run db:migrate` to apply changes to database

**Development vs Production:**
- **Development**: Use `npm run db:push` for quick iterations
- **Production**: Always use `db:generate` + `db:migrate` for version-controlled migrations

**Important Notes:**
- Migrations are stored in `server/migrations/`
- Migration files use timestamp prefixes (format: YYYYMMDDHHmmss)
- Never edit migration files after they've been applied
- Always review generated SQL before applying migrations

## Memories & Development Notes

- When the user adds the first new feature, remove the tasks feature