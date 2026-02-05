import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? ''
const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? '587')
const SMTP_USER = Deno.env.get('SMTP_USER') ?? ''
const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? ''
const MAIL_FROM = Deno.env.get('MAIL_FROM') ?? ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    const { broadcast_id } = await req.json()
    if (!broadcast_id) {
      return new Response('Missing broadcast_id', {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { data: broadcast, error: broadcastError } = await supabase
      .from('broadcasts')
      .select('id,title,body,company_id')
      .eq('id', broadcast_id)
      .single()

    if (broadcastError) {
      return new Response(broadcastError.message, {
        status: 500,
        headers: corsHeaders,
      })
    }

    let recipientIds: string[] = []

    if (broadcast.company_id) {
      const { data: members, error: memberError } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', broadcast.company_id)

      if (memberError) {
        return new Response(memberError.message, {
          status: 500,
          headers: corsHeaders,
        })
      }

      recipientIds = (members ?? []).map((row) => row.id)
    } else {
      const { data: recipients, error: recipientError } = await supabase
        .from('broadcast_recipients')
        .select('profile_id')
        .eq('broadcast_id', broadcast.id)

      if (recipientError) {
        return new Response(recipientError.message, {
          status: 500,
          headers: corsHeaders,
        })
      }

      recipientIds = (recipients ?? []).map((row) => row.profile_id)
    }

    if (!recipientIds.length) {
      return new Response('No recipients', { status: 200, headers: corsHeaders })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id,email,name')
      .in('id', recipientIds)

    if (profilesError) {
      return new Response(profilesError.message, {
        status: 500,
        headers: corsHeaders,
      })
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
      return new Response('SMTP config missing', {
        status: 500,
        headers: corsHeaders,
      })
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    })

    const tasks = (profiles ?? []).map((profile) => {
      if (!profile.email) return Promise.resolve()
      const recipientName = profile.name ?? 'Medlem'
      const subject = broadcast.title ?? 'Nytt utskick'
      const text = `Hej ${recipientName},\n\nEtt nytt utskick finns nu tillgängligt:\n\n${broadcast.title}\n\nLogga in för att läsa hela utskicket.`
      return transporter.sendMail({
        from: MAIL_FROM,
        to: profile.email,
        subject,
        text,
      })
    })

    await Promise.all(tasks)

    return new Response('ok', { status: 200, headers: corsHeaders })
  } catch (error) {
    return new Response(error?.message ?? 'Unknown error', {
      status: 500,
      headers: corsHeaders,
    })
  }
})
