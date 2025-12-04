import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Media Delete] Deleting media item:', input.id);

    const { supabase, supabaseAdmin, profile } = ctx;

    if (!profile || (profile as any).role !== 'admin') {
      throw new Error('Only admins can delete media items');
    }

    const privilegedClient = supabaseAdmin ?? supabase;

    const { data: mediaItem, error: fetchError } = await (privilegedClient
      .from('media_items') as any)
      .select('*')
      .eq('id', input.id)
      .single();

    if (fetchError || !mediaItem) {
      console.error('[Media Delete] Item not found:', fetchError);
      throw new Error('Media item not found');
    }

    const { error: storageError } = await privilegedClient
      .storage
      .from(mediaItem.storage_bucket)
      .remove([mediaItem.file_path]);

    if (storageError) {
      console.error('[Media Delete] Storage error:', storageError);
    }

    const { error: dbError } = await (privilegedClient
      .from('media_items') as any)
      .delete()
      .eq('id', input.id);

    if (dbError) {
      console.error('[Media Delete] Database error:', dbError);
      throw new Error(`Failed to delete media item: ${dbError.message}`);
    }

    console.log('[Media Delete] Deleted media item:', input.id);

    return { success: true };
  });
