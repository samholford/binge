async function getTvdbToken(apiKey) {
  const response = await fetch('https://api.thetvdb.com/v4/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      "apikey": apiKey
    })
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`TVDB login failed: ${response.status} ${response.statusText}`, errorText);
    return null;
  }
  const { data } = await response.json();
  return data.token;
}

async function searchTvdb(token, query) {
    const response = await fetch(`https://api.thetvdb.com/v4/search?query=${encodeURIComponent(query)}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`TVDB search failed: ${response.status} ${response.statusText}`, errorText);
        return [];
    }
    const { data } = await response.json();
    return data;
}

async function getShowStatus(token, tvdb_id) {
    const response = await fetch(`https://api.thetvdb.com/v4/series/${tvdb_id}/extended`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`TVDB show status failed: ${response.status} ${response.statusText}`, errorText);
        return null;
    }
    const { data } = await response.json();
    return data.status;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const { binge_tracker_db, TVDB_API_KEY } = env;

    if (pathname.startsWith('/api/')) {
        if (request.method === "POST" && pathname === "/api/search") {
          const { query } = await request.json();
          const token = await getTvdbToken(TVDB_API_KEY);
          if (!token) {
            return new Response("Failed to authenticate with TVDB", { status: 500 });
          }
          const results = await searchTvdb(token, query);
          return new Response(JSON.stringify(results), {
            headers: { "Content-Type": "application/json" },
          });
        }

        if (request.method === "POST" && pathname === "/api/shows") {
            const { name, tvdb_id } = await request.json();
            const { results } = await binge_tracker_db.prepare(
                "INSERT INTO shows (name, tvdb_id) VALUES (?, ?)"
            )
            .bind(name, tvdb_id)
            .run();
            return new Response("Show added", { status: 201 });
        }

        if (request.method === "GET" && pathname === "/api/shows") {
            const { results } = await binge_tracker_db.prepare("SELECT * FROM shows").all();
            return Response.json(results);
        }

        if (request.method === "POST" && pathname.startsWith("/api/shows/")) {
            const tvdb_id = pathname.split("/").pop();
            const token = await getTvdbToken(TVDB_API_KEY);
            if (!token) {
                return new Response("Failed to authenticate with TVDB", { status: 500 });
            }
            const status = await getShowStatus(token, tvdb_id);
            if (status && status.name === "Ended") {
                await binge_tracker_db.prepare(
                    "UPDATE shows SET bingeable = 1 WHERE tvdb_id = ?"
                )
                .bind(tvdb_id)
                .run();
            }
            return Response.json({ status });
        }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};
