import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(z.object({ userId: z.string() }))
  .query(async ({ ctx, input }) => {
    const { supabase, profile } = ctx;

    if (!profile || (profile as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", input.userId)
      .single();

    if (error) {
      console.error("Error fetching user:", error);
      throw new Error(`Failed to fetch user: ${error.message}`);
    }

    return data;
  });
