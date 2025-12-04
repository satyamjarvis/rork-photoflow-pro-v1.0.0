import { publicProcedure } from "../../../create-context";

export default publicProcedure.query(async ({ ctx }) => {
  console.log('[Portfolio Stats] Fetching portfolio statistics');

  const { supabase, supabaseAdmin } = ctx;
  const dbClient = (supabaseAdmin ?? supabase) as typeof supabase;

  const [portfolioResult, allItemsResult] = await Promise.all([
    dbClient.from('portfolio').select('*', { count: 'exact', head: true }).eq('visible', true),
    dbClient.from('portfolio').select('created_at, visible'),
  ]);

  const totalCount = portfolioResult.count || 0;
  const visibleCount = (allItemsResult.data || []).filter((item: any) => item.visible).length;
  const hiddenCount = (allItemsResult.data || []).length - visibleCount;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const recentUploads = (allItemsResult.data || []).filter((item: any) => {
    const createdAt = new Date(item.created_at);
    return createdAt >= startOfMonth;
  }).length;

  console.log('[Portfolio Stats] Total:', totalCount, 'Visible:', visibleCount, 'Hidden:', hiddenCount, 'Recent:', recentUploads);

  return {
    total: (allItemsResult.data || []).length,
    visible: visibleCount,
    hidden: hiddenCount,
    recentUploads,
  };
});
