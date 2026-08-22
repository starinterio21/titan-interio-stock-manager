// Supabase Edge Function: send-stock-alert
// Triggered hourly by pg_cron. Decides internally whether it's actually
// time to send based on alert_settings (frequency / hour / day), then
// checks stock levels and emails via Brevo if anything qualifies.
// Also callable directly from the browser (Settings page "Send Test Email Now").

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: settings, error: settingsError } = await supabase
      .from('alert_settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      return json({ skipped: 'no settings found' })
    }

    if (!settings.enabled || !settings.recipient_emails?.length) {
      return json({ skipped: 'alerts disabled or no recipients' })
    }

    const now = new Date()
    const istOffsetMs = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffsetMs)
    const currentHour = istNow.getUTCHours()
    const currentDay = istNow.getUTCDay()

    let shouldSend = false
    const targetHour = Number(settings.send_hour)
    const targetDay = Number(settings.weekly_day)

    if (settings.frequency === 'every_6_hours') {
      const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null
      shouldSend = !lastSent || (now.getTime() - lastSent.getTime()) >= 6 * 60 * 60 * 1000
    } else if (settings.frequency === 'daily') {
      const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null
      const lastSentIst = lastSent ? new Date(lastSent.getTime() + istOffsetMs) : null
      const alreadySentToday = lastSentIst && lastSentIst.toDateString() === istNow.toDateString()
      shouldSend = currentHour === targetHour && !alreadySentToday
    } else if (settings.frequency === 'weekly') {
      const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null
      const alreadySentThisWeek = lastSent && (now.getTime() - lastSent.getTime()) < 6 * 24 * 60 * 60 * 1000
      shouldSend = currentHour === targetHour && currentDay === targetDay && !alreadySentThisWeek
    }

    const body = await req.json().catch(() => ({}))
    if (body.force === true) shouldSend = true

    if (!shouldSend) {
      console.log('not time yet', { currentHour, currentDay, targetHour, targetDay, frequency: settings.frequency, last_sent_at: settings.last_sent_at })
      return json({ skipped: 'not time yet', currentHour, currentDay, targetHour, targetDay })
    }

    const { data: items } = await supabase
      .from('items')
      .select('sku, name, current_stock, reorder_level, unit')
      .eq('active', true)

    // Out of Stock: confirmed 0 (excludes not-yet-counted items, which are null)
    const outOfStock = (items || []).filter((i) => i.current_stock !== null && i.current_stock <= 0)
    // Low Stock: above 0, but at or below reorder level
    const lowStock = (items || []).filter((i) => i.current_stock !== null && i.current_stock > 0 && i.current_stock <= i.reorder_level)

    const relevantLow = settings.include_low_stock ? lowStock : []
    const relevantOut = settings.include_out_of_stock ? outOfStock : []

    if (relevantLow.length === 0 && relevantOut.length === 0 && body.force !== true) {
      await supabase.from('alert_settings').update({ last_sent_at: now.toISOString() }).eq('id', settings.id)
      return json({ skipped: 'no low/out-of-stock items' })
    }

    const rowsHtml = (list, color, label) =>
      list.length === 0 ? '' : `
        <h3 style="color:${color};margin:20px 0 8px;">${label} (${list.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;">
          <tr style="background:#f4f4f4;text-align:left;">
            <th style="padding:6px 8px;border:1px solid #ddd;">SKU</th>
            <th style="padding:6px 8px;border:1px solid #ddd;">Item</th>
            <th style="padding:6px 8px;border:1px solid #ddd;">Current Stock</th>
            <th style="padding:6px 8px;border:1px solid #ddd;">Reorder Level</th>
          </tr>
          ${list.map((i) => `
            <tr>
              <td style="padding:6px 8px;border:1px solid #ddd;font-family:monospace;">${i.sku}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">${i.name}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;color:${color};font-weight:600;">${i.current_stock} ${i.unit}</td>
              <td style="padding:6px 8px;border:1px solid #ddd;">${i.reorder_level} ${i.unit}</td>
            </tr>
          `).join('')}
        </table>
      `

    const htmlContent = `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;">
        <div style="background:#1A1A1A;padding:20px;text-align:center;">
          <h1 style="color:#D4A02A;margin:0;font-size:20px;">TITAN INTERIO</h1>
          <p style="color:#999;margin:2px 0 0;font-size:11px;letter-spacing:1px;">STOCK ALERT</p>
        </div>
        <div style="padding:20px;background:#fff;">
          <p style="font-size:14px;color:#333;">Automated stock alert as of ${istNow.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} IST.</p>
          ${rowsHtml(relevantLow, '#EA580C', '🟠 Low Stock')}
          ${rowsHtml(relevantOut, '#DC2626', '🔴 Out of Stock')}
          <p style="font-size:12px;color:#999;margin-top:24px;">Manage these in your Titan Interio Stock Manager site.</p>
        </div>
      </div>
    `

    const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: 'Titan Interio Stock Manager' },
        to: settings.recipient_emails.map((email) => ({ email })),
        subject: `Stock Alert — ${relevantOut.length} out of stock, ${relevantLow.length} low stock`,
        htmlContent,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      return json({ error: 'Brevo send failed', details: errText }, 500)
    }

    await supabase.from('alert_settings').update({ last_sent_at: now.toISOString() }).eq('id', settings.id)

    return json({ sent: true, outOfStock: relevantOut.length, lowStock: relevantLow.length })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})
