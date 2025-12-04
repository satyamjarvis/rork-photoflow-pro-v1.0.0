import { z } from "zod";
import { publicProcedure } from "../../../create-context";

export default publicProcedure
  .input(
    z.object({
      search: z.string().optional(),
      role: z.enum(["admin", "viewer"]).optional(),
      status: z.enum(["active", "suspended"]).optional(),
      sortBy: z.enum(["created_at", "last_login", "name", "email"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      limit: z.number().min(1).max(100).optional(),
      offset: z.number().min(0).optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { supabase, profile } = ctx;

    if (!profile || (profile as any).role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const {
      search,
      role,
      status,
      sortBy = "created_at",
      sortOrder = "desc",
      limit = 20,
      offset = 0,
    } = input;

    let query = supabase.from("profiles").select("*", { count: "exact" });

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (role) {
      query = query.eq("role", role);
    }

    if (status) {
      query = query.eq("status", status);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching users:", error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    return {
      users: data || [],
      total: count || 0,
    };
  });
