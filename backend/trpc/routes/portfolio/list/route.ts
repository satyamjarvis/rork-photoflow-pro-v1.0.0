import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    includeHidden: z.boolean().optional().default(false),
  }).optional())
  .query(async ({ ctx, input }) => {
    const { supabase, supabaseAdmin, profile } = ctx;
    const includeHidden = input?.includeHidden ?? false;
    
    console.log('[Portfolio List] Fetching portfolio items', {
      includeHidden,
      isAdmin: (profile as any)?.role === 'admin',
      userId: (profile as any)?.id,
    });

    const dbClient = (supabaseAdmin ?? supabase) as typeof supabase;

    let query = dbClient
      .from('portfolio')
      .select('*')
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (!includeHidden) {
      console.log('[Portfolio List] Filtering to visible items only');
      query = query.eq('visible', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Portfolio List] Error:', error);
      throw new Error(`Failed to fetch portfolio items: ${error.message}`);
    }

    console.log('[Portfolio List] Query returned', data?.length || 0, 'items');
    if (data && data.length > 0) {
      console.log('[Portfolio List] Sample item:', {
        id: (data[0] as any).id,
        title: (data[0] as any).title,
        visible: (data[0] as any).visible,
        created_at: (data[0] as any).created_at,
      });
    }
    
    return data || [];
  });
