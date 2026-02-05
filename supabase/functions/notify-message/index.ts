import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    const { conversation_id, sender_id } = await req.json()

    if (!conversation_id || !sender_id) {
      return new Response('Missing conversation_id or sender_id', {
        status: 400,
        headers: corsHeaders,
      })
    }

    const { data: members, error: membersError } = await supabase
      .from('conversation_members')
      .select('profile_id')
      .eq('conversation_id', conversation_id)

    if (membersError) {
      return new Response(membersError.message, {
        status: 500,
        headers: corsHeaders,
      })
    }

    const recipientIds = (members ?? [])
      .map((row) => row.profile_id)
      .filter((id) => id !== sender_id)

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

    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('content,created_at')
      .eq('conversation_id', conversation_id)
      .eq('sender_id', sender_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (messageError) {
      return new Response(messageError.message, {
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
      const recipientName = profile.name ?? 'Kund'
      const subject = 'Nytt meddelande i CRM'
      const text = `Hej ${recipientName},\n\nDu har fått ett nytt meddelande:\n\n"${message?.content ?? ''}"\n\nLogga in för att svara.`
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
