import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(z.object({ userId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const { supabase, profile } = ctx;

    if (!profile || (profile as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    if (input.userId === (profile as any).id) {
      throw new Error("Cannot delete your own account");
    }

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", input.userId);

    if (error) {
      console.error("Error deleting user:", error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }

    await (supabase.from("audit_logs") as any).insert({
      table_name: "profiles",
      action: "user_deleted",
      performed_by: (profile as any).id,
      row_id: input.userId,
      payload: {} as any,
    });

    return { success: true };
  });
