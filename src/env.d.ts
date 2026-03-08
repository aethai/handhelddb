/// <reference path="../.astro/types.d.ts" />

import type { User as SupabaseUser } from '@supabase/supabase-js';

declare namespace App {
  interface Locals {
    user: SupabaseUser | null;
  }
}
