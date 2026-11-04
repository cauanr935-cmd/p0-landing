// Live YouTube numbers for the home timeline (YouTube Data API v3).
// Needs YOUTUBE_API_KEY and either YOUTUBE_CHANNEL_ID or YOUTUBE_CHANNEL_HANDLE.
// Cost per refresh: 3 quota units (channels + playlistItems + videos) out of
// the free 10,000/day, so a 10-minute cache uses ~430 units a day.

const API = 'https://www.googleapis.com/youtube/v3';
const CACHE_MS = 10 * 60 * 1000;
const SHORT_MAX_SECONDS = 180;

let cache = null; // { at, data }

async function get(path, params) {
  const url = new URL(API + path);
  Object.entries({ ...params, key: process.env.YOUTUBE_API_KEY }).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`YouTube ${path} ${res.status}: ${body?.error?.message || 'erro'}`);
  return body;
}

// "PT1M5S" -> 65
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!m) return null;
  const [, d = 0, h = 0, min = 0, s = 0] = m.map((x) => Number(x || 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

function bestThumb(thumbs = {}) {
  const t = thumbs.maxres || thumbs.standard || thumbs.high || thumbs.medium || thumbs.default;
  return t ? t.url : null;
}

function toNumber(v) {
  return v === undefined || v === null ? null : Number(v);
}

export function shapeVideo(v) {
  const seconds = parseDuration(v.contentDetails?.duration);
  const isShort = seconds !== null && seconds <= SHORT_MAX_SECONDS;
  return {
    id: v.id,
    title: v.snippet?.title || '',
    publishedAt: v.snippet?.publishedAt || null,
    thumbnail: bestThumb(v.snippet?.thumbnails),
    seconds,
    isShort,
    url: isShort ? `https://www.youtube.com/shorts/${v.id}` : `https://youtu.be/${v.id}`,
    views: toNumber(v.statistics?.viewCount),
    likes: toNumber(v.statistics?.likeCount), // null when the creator hides likes
    comments: toNumber(v.statistics?.commentCount),
  };
}

async function fetchFeed() {
  const channelParams = process.env.YOUTUBE_CHANNEL_ID
    ? { id: process.env.YOUTUBE_CHANNEL_ID }
    : { forHandle: process.env.YOUTUBE_CHANNEL_HANDLE };
  const channels = await get('/channels', { part: 'snippet,statistics,contentDetails', ...channelParams });
  const channel = channels.items?.[0];
  if (!channel) throw new Error('canal não encontrado');

  const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
  const playlist = await get('/playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: 50 });
  const ids = (playlist.items || []).map((i) => i.contentDetails?.videoId).filter(Boolean);

  const videos = ids.length
    ? (await get('/videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') })).items || []
    : [];

  return {
    ok: true,
    updatedAt: new Date().toISOString(),
    channel: {
      id: channel.id,
      title: channel.snippet?.title || '',
      subscribers: channel.statistics?.hiddenSubscriberCount ? null : toNumber(channel.statistics?.subscriberCount),
      views: toNumber(channel.statistics?.viewCount),
      videos: toNumber(channel.statistics?.videoCount),
    },
    videos: videos
      .filter((v) => v.snippet?.liveBroadcastContent === 'none')
      .map(shapeVideo),
  };
}

export async function youtubeFeed() {
  if (!process.env.YOUTUBE_API_KEY || !(process.env.YOUTUBE_CHANNEL_ID || process.env.YOUTUBE_CHANNEL_HANDLE)) {
    return { status: 503, body: { ok: false, error: 'YouTube não configurado.' } };
  }
  if (cache && Date.now() - cache.at < CACHE_MS) return { status: 200, body: cache.data };

  try {
    const data = await fetchFeed();
    cache = { at: Date.now(), data };
    return { status: 200, body: data };
  } catch (err) {
    console.error('youtube feed failed:', err.message);
    // Better slightly old numbers than none.
    if (cache) return { status: 200, body: { ...cache.data, stale: true } };
    return { status: 502, body: { ok: false, error: 'Não foi possível falar com o YouTube agora.' } };
  }
}
