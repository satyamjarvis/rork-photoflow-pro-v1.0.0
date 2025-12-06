import { publicProcedure } from "../../../create-context";

export default publicProcedure.query(async ({ ctx }) => {
  const { supabase } = ctx;

  const [
    usersResult,
    locationsResult,
    workshopsResult,
    portfolioResult,
    videosResult,
    couponsResult,
    commentsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("locations").select("id", { count: "exact", head: true }),
    supabase.from("workshops").select("id", { count: "exact", head: true }),
    supabase.from("portfolio").select("id", { count: "exact", head: true }),
    supabase.from("bts_videos").select("id", { count: "exact", head: true }),
    supabase.from("coupons").select("id", { count: "exact", head: true }),
    supabase
      .from("location_comments")
      .select("id", { count: "exact", head: true })
      .eq("hidden", false),
  ]);

  return {
    users: usersResult.count || 0,
    locations: locationsResult.count || 0,
    workshops: workshopsResult.count || 0,
    portfolio: portfolioResult.count || 0,
    videos: videosResult.count || 0,
    coupons: couponsResult.count || 0,
    comments: commentsResult.count || 0,
  };
});
