import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    id: z.string(),
    title: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
  }).refine((data) => Boolean(data.title || data.description !== undefined), {
    message: "At least one field must be provided",
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Media Update] Updating media item:', input.id);

    const { supabase, supabaseAdmin, profile } = ctx;

    if (!profile || (profile as any).role !== 'admin') {
      throw new Error('Only admins can update media items');
    }

    const dbClient = supabaseAdmin ?? supabase;

    const { data: existing, error: fetchError } = await (dbClient
      .from('media_items') as any)
      .select('*')
      .eq('id', input.id)
      .single();

    if (fetchError || !existing) {
      console.error('[Media Update] Item not found:', fetchError);
      throw new Error('Media item not found');
    }

    const updates: Record<string, unknown> = {};

    if (typeof input.title === 'string') {
      updates.title = input.title.trim();
    }

    if (input.description !== undefined) {
      updates.description = input.description?.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      console.log('[Media Update] No changes detected');
      return existing;
    }

    const { data, error } = await (dbClient
      .from('media_items') as any)
      .update(updates)
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('[Media Update] Error:', error);
      throw new Error(`Failed to update media item: ${error.message}`);
    }

    console.log('[Media Update] Updated media item:', input.id);

    return data;
  });
