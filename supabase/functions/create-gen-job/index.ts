import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STEP1_WEBHOOK_URL =
  "https://offbeat-inc.app.n8n.cloud/webhook/adgen-step1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user via anon client
    const authHeader = req.headers.get("Authorization")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Insert gen_jobs
    const { data: job, error: jobError } = await adminClient
      .from("gen_jobs")
      .insert({
        project_id: body.project_id,
        created_by: user.id,
        status: "pending",
        creative_type: body.creative_type,
        duration_seconds: body.duration_seconds || null,
        production_pattern: body.production_pattern,
        num_appeal_axes: body.num_appeal_axes,
        num_copies: body.num_copies,
        num_tonmana: body.num_tonmana,
        total_patterns: body.total_patterns,
        generation_mode: body.generation_mode,
        settings: {},
      })
      .select()
      .single();

    if (jobError) {
      console.error("gen_jobs insert error:", jobError);
      return new Response(JSON.stringify({ error: jobError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Insert gen_steps (text steps + bgm_suggestion for video)
    const steps = [
      { step_number: 1, step_key: "appeal_axis", step_label: "訴求軸作成" },
      { step_number: 2, step_key: "copy", step_label: "コピー作成" },
      {
        step_number: 3,
        step_key: "composition",
        step_label:
          body.creative_type === "video"
            ? "構成案・字コンテ作成"
            : "構成案作成",
      },
      {
        step_number: 4,
        step_key: "narration_script",
        step_label: "NA原稿作成",
      },
    ];

    // Add narration_audio, BGM suggestion, and Vcon steps for video only
    if (body.creative_type === "video") {
      steps.push({
        step_number: 5,
        step_key: "narration_audio",
        step_label: "ナレーション作成",
      });
      steps.push({
        step_number: 6,
        step_key: "bgm_suggestion",
        step_label: "BGM提案",
      });
      steps.push({
        step_number: 7,
        step_key: "vcon",
        step_label: "Vコン作成",
      });
    }

    const { error: stepsError } = await adminClient.from("gen_steps").insert(
      steps.map((s) => ({
        job_id: job.id,
        step_number: s.step_number,
        step_key: s.step_key,
        step_label: s.step_label,
        status: "pending",
      }))
    );

    if (stepsError) {
      console.error("gen_steps insert error:", stepsError);
    }

    // 3. Fire-and-forget webhook to n8n Step 1 only
    try {
      fetch(STEP1_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          project_id: body.project_id,
          product_id: body.product_id,
          creative_type: body.creative_type,
          duration_seconds: body.duration_seconds,
          num_appeal_axes: body.num_appeal_axes,
          num_copies: body.num_copies,
          num_tonmana: body.num_tonmana,
          client_name: body.client_name,
          product_name: body.product_name,
          project_name: body.project_name,
          appeal_direction: "",
        }),
      }).catch((e) => console.error("n8n step1 webhook error:", e));
    } catch (e) {
      console.error("n8n step1 webhook error:", e);
    }

    return new Response(JSON.stringify({ job_id: job.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
