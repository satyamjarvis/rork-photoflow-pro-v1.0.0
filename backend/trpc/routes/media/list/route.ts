import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    type: z.enum(['image', 'video']).optional(),
    limit: z.number().optional().default(50),
    offset: z.number().optional().default(0),
  }))
  .query(async ({ input, ctx }) => {
    console.log('[Media List] Fetching media items:', input);

    const { supabase } = ctx;

    let query = supabase
      .from('media_items')
      .select('*')
      .order('created_at', { ascending: false })
      .range(input.offset, input.offset + input.limit - 1);

    if (input.type) {
      query = query.eq('media_type', input.type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Media List] Error:', error);
      throw new Error(`Failed to fetch media items: ${error.message}`);
    }

    console.log('[Media List] Fetched', data?.length || 0, 'items');

    return data || [];
  });
