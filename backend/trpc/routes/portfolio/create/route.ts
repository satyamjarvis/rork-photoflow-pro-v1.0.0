import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    image_url: z.string().url('Invalid image URL'),
    order_index: z.number().int().default(0),
    visible: z.boolean().default(true),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[Portfolio Create] Creating portfolio item:', input.title);

    const { supabase, supabaseAdmin, profile } = ctx;

    if (!profile || (profile as any).role !== 'admin') {
      throw new Error('Only admins can create portfolio items');
    }

    const dbClient = supabaseAdmin ?? supabase;

    const { data, error } = await (dbClient
      .from('portfolio') as any)
      .insert({
        title: input.title,
        description: input.description || null,
        image_url: input.image_url,
        order_index: input.order_index,
        visible: input.visible,
      })
      .select()
      .single();

    if (error) {
      console.error('[Portfolio Create] Error:', error);
      throw new Error(`Failed to create portfolio item: ${error.message}`);
    }

    console.log('[Portfolio Create] Successfully created portfolio item:', data.id);
    return data;
  });
