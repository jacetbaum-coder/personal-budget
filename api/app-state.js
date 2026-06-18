const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SUPABASE_APP_STATE_ROW_ID = process.env.SUPABASE_APP_STATE_ROW_ID || 'default'

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

function getHeaders() {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY || '',
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY || ''}`,
    'Content-Type': 'application/json',
  }
}

export default async function handler(req, res) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json(res, 500, { error: 'Supabase server env vars are missing.' })
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/app_state?id=eq.${encodeURIComponent(SUPABASE_APP_STATE_ROW_ID)}&select=data,updated_at`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      )

      if (!response.ok) {
        return json(res, response.status, { error: `Supabase load failed (${response.status})` })
      }

      const rows = await response.json()
      const row = rows[0]
      return json(res, 200, {
        data: row?.data ?? null,
        updatedAt: row?.updated_at ?? null,
      })
    }

    if (req.method === 'POST') {
      const { data } = req.body || {}
      if (!data || typeof data !== 'object') {
        return json(res, 400, { error: 'Request body must include a data object.' })
      }

      const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?on_conflict=id`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          Prefer: 'resolution=merge-duplicates,return=representation',
        },
        body: JSON.stringify([
          {
            id: SUPABASE_APP_STATE_ROW_ID,
            data,
          },
        ]),
      })

      if (!response.ok) {
        return json(res, response.status, { error: `Supabase save failed (${response.status})` })
      }

      const rows = await response.json()
      return json(res, 200, {
        updatedAt: rows[0]?.updated_at ?? new Date().toISOString(),
      })
    }

    return json(res, 405, { error: 'Method not allowed.' })
  } catch (error) {
    return json(res, 500, {
      error: error instanceof Error ? error.message : 'Unexpected server error',
    })
  }
}
