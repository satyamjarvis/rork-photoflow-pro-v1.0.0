import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    id: z.string().uuid(),
  }))
  .mutation(async ({ ctx, input }) => {
    console.log('[Portfolio Delete] Deleting portfolio item:', input.id);

    const { supabase, supabaseAdmin, profile } = ctx;

    if (!profile || (profile as any).role !== 'admin') {
      throw new Error('Only admins can delete portfolio items');
    }

    const privilegedClient = supabaseAdmin ?? supabase;

    const { data: portfolioItem, error: fetchError } = await (privilegedClient
      .from('portfolio') as any)
      .select('image_url')
      .eq('id', input.id)
      .single();

    if (fetchError || !portfolioItem) {
      console.error('[Portfolio Delete] Error fetching item:', fetchError);
      throw new Error(`Failed to fetch portfolio item: ${fetchError?.message || 'Item not found'}`);
    }

    if (portfolioItem.image_url && portfolioItem.image_url.includes('portfolio-images')) {
      try {
        const urlParts = portfolioItem.image_url.split('/portfolio-images/');
        if (urlParts[1]) {
          const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
          console.log('[Portfolio Delete] Deleting storage file:', filePath);
          
          const { error: storageError } = await privilegedClient.storage
            .from('portfolio-images')
            .remove([filePath]);

          if (storageError) {
            console.error('[Portfolio Delete] Storage error:', storageError);
          }
        }
      } catch (err) {
        console.error('[Portfolio Delete] Error parsing image URL:', err);
      }
    }

    const { error: deleteError } = await (privilegedClient
      .from('portfolio') as any)
      .delete()
      .eq('id', input.id);

    if (deleteError) {
      console.error('[Portfolio Delete] Error:', deleteError);
      throw new Error(`Failed to delete portfolio item: ${deleteError.message}`);
    }

    console.log('[Portfolio Delete] Successfully deleted portfolio item');
    return { success: true };
  });
