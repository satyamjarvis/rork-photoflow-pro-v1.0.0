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
      hasSupabase: !!supabase,
      hasSupabaseAdmin: !!supabaseAdmin,
    });

    try {
      const isAdmin = (profile as any)?.role === 'admin';
      
      let dbClient: any;
      if (isAdmin && supabaseAdmin) {
        console.log('[Portfolio List] Using admin client');
        dbClient = supabaseAdmin;
      } else {
        console.log('[Portfolio List] Using client from context');
        // Use the supabase client from context which has proper authentication
        // This works for both authenticated and unauthenticated users
        // RLS policy "Anyone can read visible portfolio" allows public access
        dbClient = supabase;
      }

      let query = dbClient
        .from('portfolio')
        .select('*');

      if (!includeHidden || !isAdmin) {
        console.log('[Portfolio List] Filtering to visible items only');
        query = query.eq('visible', true);
      }

      // Order by order_index first (primary sort), then created_at (secondary sort)
      // Note: Supabase doesn't support multiple order() calls, so we'll sort by order_index
      // and handle created_at sorting in the application if needed
      query = query.order('order_index', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('[Portfolio List] Database error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        
        if (error.code === 'PGRST116') {
          console.log('[Portfolio List] Table or view not found - returning empty array');
          return [];
        }
        
        throw new Error(`Failed to fetch portfolio items: ${error.message}`);
      }

      console.log('[Portfolio List] Query returned', data?.length || 0, 'items');
      
      if (!data) {
        console.log('[Portfolio List] No data returned, returning empty array');
        return [];
      }

      if (data.length > 0) {
        console.log('[Portfolio List] Sample item:', {
          id: (data[0] as any).id,
          title: (data[0] as any).title,
          visible: (data[0] as any).visible,
          image_url: (data[0] as any).image_url?.substring(0, 50) + '...',
        });
        
        // Sort by order_index first, then by created_at as secondary sort
        const sorted = [...data].sort((a, b) => {
          const orderDiff = (a.order_index || 0) - (b.order_index || 0);
          if (orderDiff !== 0) return orderDiff;
          // Secondary sort by created_at (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        
        return sorted;
      }
      
      return [];
    } catch (err: any) {
      console.error('[Portfolio List] Unexpected error:', err);
      throw new Error(`Portfolio fetch failed: ${err.message || 'Unknown error'}`);
    }
  });
