import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    id: z.string().uuid(),
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    image_url: z.string().url('Invalid image URL').optional(),
    order_index: z.number().int().optional(),
    visible: z.boolean().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[Portfolio Update] Updating portfolio item:', input.id);

    const { supabase, supabaseAdmin, profile } = ctx;

    if (!profile || (profile as any).role !== 'admin') {
      throw new Error('Only admins can update portfolio items');
    }

    const dbClient = supabaseAdmin ?? supabase;
    const { id, ...updates } = input;

    const { data, error } = await (dbClient
      .from('portfolio') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Portfolio Update] Error:', error);
      throw new Error(`Failed to update portfolio item: ${error.message}`);
    }

    console.log('[Portfolio Update] Successfully updated portfolio item');
    return data;
  });
