import { publicProcedure } from "../../../create-context";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

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
        console.log('[Portfolio List] Using regular client');
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
        dbClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
      }

      let query = dbClient
        .from('portfolio')
        .select('*')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: false });

      if (!includeHidden || !isAdmin) {
        console.log('[Portfolio List] Filtering to visible items only');
        query = query.eq('visible', true);
      }

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
      if (data && data.length > 0) {
        console.log('[Portfolio List] Sample item:', {
          id: (data[0] as any).id,
          title: (data[0] as any).title,
          visible: (data[0] as any).visible,
          image_url: (data[0] as any).image_url?.substring(0, 50) + '...',
        });
      }
      
      return data || [];
    } catch (err: any) {
      console.error('[Portfolio List] Unexpected error:', err);
      throw new Error(`Portfolio fetch failed: ${err.message || 'Unknown error'}`);
    }
  });
