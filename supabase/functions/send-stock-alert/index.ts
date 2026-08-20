// Supabase Edge Function: send-stock-alert
// Triggered hourly by pg_cron. Decides internally whether it's actually
// time to send based on alert_settings (frequency / hour / day), then
// checks stock levels and emails via Brevo if anything qualifies.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY')!
const BREVO_SENDER_EMAIL = Deno.env.get('BREVO_SENDER_EMAIL')! // the single address you verified in Brevo

Deno.serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 1. Load settings
    const { data: settings, error: settingsError } = await supabase
      .from('alert_settings')
      .select('*')
      .single()

    if (settingsError || !settings) {
      return new Response(JSON.stringify({ skipped: 'no settings found' }), { status: 200 })
    }

    if (!settings.enabled || !settings.recipient_emails?.length) {
      return new Response(JSON.stringify({ skipped: 'alerts disabled or no recipients' }), { status: 200 })
    }

    // 2. Decide if it's actually time to send (IST = UTC+5:30)
    const now = new Date()
    const istOffsetMs = 5.5 * 60 * 60 * 1000
    const istNow = new Date(now.getTime() + istOffsetMs)
    const currentHour = istNow.getUTCHours()
    const currentDay = istNow.getUTCDay() // 0 = Sunday

    let shouldSend = false

    if (settings.frequency === 'every_6_hours') {
      const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null
      shouldSend = !lastSent || (now.getTime() - lastSent.getTime()) >= 6 * 60 * 60 * 1000
    } else if (settings.frequency === 'daily') {
      const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null
      const alreadySentToday = lastSent && lastSent.toDateString() === now.toDateString()
      shouldSend = currentHour === settings.send_hour && !alreadySentToday
    } else if (settings.frequency === 'weekly') {
      const lastSent = settings.last_sent_at ? new Date(settings.last_sent_at) : null
      const alreadySentThisWeek = lastSent && (now.getTime() - lastSent.getTime()) < 6 * 24 * 60 * 60 * 1000
      shouldSend = currentHour === settings.send_hour && currentDay === settings.weekly_day && !alreadySentThisWeek
    }

    // Allow a manual "force send now" flag for the test-email button
    const body = await req.json().catch(() => ({}))
    if (body.force === true) shouldSend = true

    if (!shouldSend) {
      return new Response(JSON.stringify({ skipped: 'not time yet' }), { status: 200 })
    }

    // 3. Check stock levels
    const { data: items } = await supabase
      .from('items')
      .select('sku, name, current_stock, reorder_level, unit')
      .eq('active', true)

    const outOfStock = (items || []).filter((i) => i.current_stock <= 0)
    const lowStock = (items || []).filter((i) => i.current_stock > 0 && i.current_stock <= i.reorder_level)

    const includeLow = settings.include_low_stock
    const includeOut = settings.include_out_of_stock

    const relevantLow = includeLow ? lowStock : []
    const relevantOut = includeOut ? outOfStock : []

    if (relevantLow.length === 0 && relevantOut.length === 0 && body.force !== true) {
      // Nothing to report — still update last_sent_at so we don't re-check every hour
      await supabase.from('alert_settings').update({ last_sent_at: now.toISOString() }).eq('id', settings.id)
      return new Response(JSON.stringify({ skipped: 'no low/out-of-stock items' }), { status: 200 })
    }

    // 4. Build email
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
          ${rowsHtml(relevantOut, '#DC2626', '🔴 Out of Stock')}
          ${rowsHtml(relevantLow, '#EA580C', '🟠 Low Stock')}
          <p style="font-size:12px;color:#999;margin-top:24px;">Manage these in your Titan Interio Stock Manager site.</p>
        </div>
      </div>
    `

    // 5. Send via Brevo
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
      return new Response(JSON.stringify({ error: 'Brevo send failed', details: errText }), { status: 500 })
    }

    // 6. Update last_sent_at
    await supabase.from('alert_settings').update({ last_sent_at: now.toISOString() }).eq('id', settings.id)

    return new Response(JSON.stringify({ sent: true, outOfStock: relevantOut.length, lowStock: relevantLow.length }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
