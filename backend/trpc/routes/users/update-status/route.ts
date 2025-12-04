import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      status: z.enum(["active", "suspended"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, profile } = ctx;

    if (!profile || (profile as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { error } = await (supabase
      .from("profiles") as any)
      .update({ status: input.status })
      .eq("id", input.userId);

    if (error) {
      console.error("Error updating user status:", error);
      throw new Error(`Failed to update user status: ${error.message}`);
    }

    await (supabase.from("audit_logs") as any).insert({
      table_name: "profiles",
      action: "status_change",
      performed_by: (profile as any).id,
      row_id: input.userId,
      payload: { new_status: input.status } as any,
    });

    return { success: true };
  });
