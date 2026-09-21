-- Add role column to users table for admin/superadmin access control.
-- Migration 0003 (after 0001_auth.sql and schema.sql).
--
-- Roles: 'user' (default), 'admin' (can manage), 'superadmin' (can promote/demote).
-- The proxy.ts gate is stateless (reads from JWT); DAL is authoritative.

alter table public.users
  add column if not exists role text not null default 'user'
  check (role in ('user', 'admin', 'superadmin'));

-- Set your own account to superadmin (replace with your email).
update public.users set role = 'superadmin' where email = 'amrasabo@gmail.com';
