import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VIDEO_WEBHOOK_URL =
  "https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-composition";
const BANNER_WEBHOOK_URL =
  "https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-banner-composition";

interface AppealAxisCopy {
  appeal_axis: string;
  copy_text: string;
  axis_index?: number;
  copy_index?: number;
  pattern_id?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate JWT using getClaims (supports ES256 signing keys)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("getClaims error:", claimsError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const body = await req.json();
    const {
      project_id,
      appeal_axes_copies,
      duration_seconds = 30,
      creative_type = "video",
      brief,
      client_name,
      product_name,
      project_name,
      copyright_text,
      rules = [],
      correction_patterns = [],
      with_na_script = false,
      with_storyboard_images = false,
    } = body;

    if (!project_id || !Array.isArray(appeal_axes_copies) || appeal_axes_copies.length === 0) {
      return new Response(
        JSON.stringify({ error: "project_id and appeal_axes_copies are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Create batch
    const { data: batch, error: batchError } = await adminClient
      .from("bulk_composition_batches")
      .insert({
        project_id,
        created_by: userId,
        total_count: appeal_axes_copies.length,
        status: "running",
        duration_seconds,
        appeal_axes_snapshot: appeal_axes_copies,
        with_na_script: creative_type === "video" ? with_na_script : false,
        with_storyboard_images:
          creative_type === "video" ? with_storyboard_images : false,
      })
      .select()
      .single();

    if (batchError || !batch) {
      console.error("batch insert error:", batchError);
      return new Response(JSON.stringify({ error: batchError?.message ?? "batch insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Create one gen_spot_jobs row per pattern
    const jobsInsert = (appeal_axes_copies as AppealAxisCopy[]).map((item, idx) => ({
      project_id,
      tool_type: "composition",
      status: "pending",
      created_by: userId,
      input_data: {
        appeal_axis: item.appeal_axis,
        copy_text: item.copy_text,
        duration_seconds,
        creative_type,
        bulk_batch_id: batch.id,
        bulk_index: idx,
        axis_index: item.axis_index,
        copy_index: item.copy_index,
        pattern_id: item.pattern_id,
      },
    }));

    const { data: jobs, error: jobsError } = await adminClient
      .from("gen_spot_jobs")
      .insert(jobsInsert)
      .select();

    if (jobsError || !jobs) {
      console.error("jobs insert error:", jobsError);
      return new Response(JSON.stringify({ error: jobsError?.message ?? "jobs insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobIds = jobs.map((j) => j.id);

    // 3. Update batch with job ids
    await adminClient
      .from("bulk_composition_batches")
      .update({ spot_job_ids: jobIds })
      .eq("id", batch.id);

    // 4. Fire-and-forget webhooks (one per job, parallel)
    const webhookUrl = creative_type === "banner" ? BANNER_WEBHOOK_URL : VIDEO_WEBHOOK_URL;

    jobs.forEach((job) => {
      const inputData = job.input_data as Record<string, unknown>;
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spot_job_id: job.id,
          bulk_batch_id: batch.id,
          project_id,
          appeal_axis: inputData.appeal_axis,
          copy_text: inputData.copy_text,
          duration_seconds,
          creative_type,
          brief: brief ?? null,
          client_name: client_name ?? null,
          product_name: product_name ?? null,
          project_name: project_name ?? null,
          copyright_text: copyright_text ?? null,
          rules,
          correction_patterns,
        }),
      }).catch((e) => console.error("n8n webhook error:", e));
    });

    return new Response(
      JSON.stringify({
        bulk_batch_id: batch.id,
        spot_job_ids: jobIds,
        total_count: jobIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
