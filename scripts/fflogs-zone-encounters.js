#!/usr/bin/env node
/**
 * Look up FFLogs encounter IDs for a zone.
 *
 * AI-generated helper; kept for reuse when adding fflogsEncounterId values to
 * TimelineMarkerPresets / TRACK_META_MAP.
 *
 * Usage:
 *   FFLOGS_CLIENT_TOKEN=<token> node scripts/fflogs-zone-encounters.js <zoneId>
 *   FFLOGS_CLIENT_ID=<id> FFLOGS_CLIENT_SECRET=<secret> node scripts/fflogs-zone-encounters.js <zoneId>
 *
 * Token auth matches the site flow in src/Components/FFLogs: a user access
 * token (from PKCE / sessionStorage) hits https://www.fflogs.com/api/v2/user/.
 * Client-credentials auth uses https://www.fflogs.com/api/v2/client.
 *
 * Zone schema: https://www.fflogs.com/v2-api-docs/ff/zone.doc.html
 */

const TOKEN_ENDPOINT = "https://www.fflogs.com/oauth/token";
const USER_API = "https://www.fflogs.com/api/v2/user";
const CLIENT_API = "https://www.fflogs.com/api/v2/client";

const ZONE_ENCOUNTERS_QUERY = `
query ZoneEncounters($zoneID: Int!) {
	worldData {
		zone(id: $zoneID) {
			id
			name
			encounters {
				id
				name
			}
		}
	}
}`;

async function getAuth() {
	const existing =
		process.env.FFLOGS_CLIENT_TOKEN || process.env.VITE_FFLOGS_CLIENT_TOKEN || "";
	if (existing) {
		// Same endpoint as Queries.tsx for PKCE user tokens.
		return { token: existing, apiBaseUrl: USER_API };
	}

	const clientId = process.env.FFLOGS_CLIENT_ID || "";
	const clientSecret = process.env.FFLOGS_CLIENT_SECRET || "";
	if (!clientId || !clientSecret) {
		throw new Error(
			"Set FFLOGS_CLIENT_TOKEN (or VITE_FFLOGS_CLIENT_TOKEN), or both FFLOGS_CLIENT_ID and FFLOGS_CLIENT_SECRET.",
		);
	}

	const body = new URLSearchParams({
		grant_type: "client_credentials",
		client_id: clientId,
		client_secret: clientSecret,
	});
	const response = await fetch(TOKEN_ENDPOINT, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: body.toString(),
	});
	if (!response.ok) {
		throw new Error(`Token request failed (${response.status}): ${await response.text()}`);
	}
	const tokens = await response.json();
	if (!tokens.access_token) {
		throw new Error(`Token response missing access_token: ${JSON.stringify(tokens)}`);
	}
	return { token: tokens.access_token, apiBaseUrl: CLIENT_API };
}

async function fetchQuery(apiBaseUrl, token, query, variables) {
	const response = await fetch(apiBaseUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ query, variables }),
	});
	const blob = await response.json();
	if (blob.error !== undefined) {
		throw new Error(typeof blob.error === "string" ? blob.error : JSON.stringify(blob.error));
	}
	if (blob.errors !== undefined) {
		throw new Error(JSON.stringify(blob.errors, null, 2));
	}
	return blob.data;
}

async function main() {
	const zoneID = parseInt(process.argv[2] ?? "", 10);
	if (Number.isNaN(zoneID)) {
		console.error("Usage: node scripts/fflogs-zone-encounters.js <zoneId>");
		process.exit(1);
	}

	const { token, apiBaseUrl } = await getAuth();
	const data = await fetchQuery(apiBaseUrl, token, ZONE_ENCOUNTERS_QUERY, { zoneID });
	const zone = data?.worldData?.zone;
	if (!zone) {
		console.error(`No zone found for id ${zoneID}`);
		process.exit(1);
	}

	console.log(`Zone ${zone.id}: ${zone.name}`);
	console.log("---");
	for (const encounter of zone.encounters ?? []) {
		console.log(`${encounter.id}\t${encounter.name}`);
	}
}

main().catch((err) => {
	console.error(err.message || err);
	process.exit(1);
});
