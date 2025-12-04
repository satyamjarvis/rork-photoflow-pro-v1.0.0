import { publicProcedure } from "../../../create-context";
import { z } from "zod";

export default publicProcedure
  .input(z.object({
    title: z.string(),
    description: z.string().optional(),
    fileName: z.string(),
    filePath: z.string(),
    fileSize: z.number().optional(),
    mimeType: z.string().optional(),
    mediaType: z.enum(['image', 'video']),
    storageBucket: z.string(),
    uploadedBy: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    console.log('[Media Create] Creating media item:', input.title);

    const { supabase, supabaseAdmin, profile } = ctx;

    if (!profile || (profile as any).role !== 'admin') {
      throw new Error('Only admins can create media items');
    }

    const dbClient = supabaseAdmin ?? supabase;

    const { data, error } = await (dbClient
      .from('media_items') as any)
      .insert({
        title: input.title,
        description: input.description || null,
        file_name: input.fileName,
        file_path: input.filePath,
        file_size: input.fileSize || null,
        mime_type: input.mimeType || null,
        media_type: input.mediaType,
        storage_bucket: input.storageBucket,
        uploaded_by: input.uploadedBy,
        usage_locations: [],
      })
      .select()
      .single();

    if (error) {
      console.error('[Media Create] Error:', error);
      throw new Error(`Failed to create media item: ${error.message}`);
    }

    console.log('[Media Create] Created media item:', data.id);

    return data;
  });
