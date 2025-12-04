import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(
    z.object({
      userId: z.string(),
      role: z.enum(["admin", "viewer"]),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { supabase, profile } = ctx;

    if (!profile || (profile as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const { error } = await (supabase
      .from("profiles") as any)
      .update({ role: input.role })
      .eq("id", input.userId);

    if (error) {
      console.error("Error updating user role:", error);
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    await (supabase.from("audit_logs") as any).insert({
      table_name: "profiles",
      action: "role_change",
      performed_by: (profile as any).id,
      row_id: input.userId,
      payload: { new_role: input.role } as any,
    });

    return { success: true };
  });
