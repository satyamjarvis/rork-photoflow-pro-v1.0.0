import { publicProcedure } from "../../../create-context";

export default publicProcedure.query(async ({ ctx }) => {
  console.log('[Media Stats] Fetching media library statistics');

  const { supabase } = ctx;

  const [imagesResult, videosResult, allItemsResult] = await Promise.all([
    supabase.from('media_items').select('*', { count: 'exact', head: true }).eq('media_type', 'image'),
    supabase.from('media_items').select('*', { count: 'exact', head: true }).eq('media_type', 'video'),
    supabase.from('media_items').select('file_size, created_at'),
  ]);

  const imageCount = imagesResult.count || 0;
  const videoCount = videosResult.count || 0;

  const totalBytes = (allItemsResult.data || []).reduce((sum: number, item: any) => {
    return sum + (item.file_size || 0);
  }, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const recentUploads = (allItemsResult.data || []).filter((item: any) => {
    const createdAt = new Date(item.created_at);
    return createdAt >= startOfMonth;
  }).length;

  console.log('[Media Stats] Images:', imageCount, 'Videos:', videoCount, 'Size:', totalMB, 'MB', 'Recent:', recentUploads);

  return {
    images: imageCount,
    videos: videoCount,
    total: imageCount + videoCount,
    totalSize: `${totalMB} MB`,
    recentUploads,
  };
});
