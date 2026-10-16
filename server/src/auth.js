/**
 * Optional shared-token authentication.
 *
 * Inert unless HOPSTOCK_TOKEN is set (read per request). When set, everything
 * under /api and /uploads needs `Authorization: Bearer <token>` or the
 * `hopstock_token` HttpOnly cookie, except the routes mounted before
 * requireAuth in app.js (health, login, logout, status). The token is never
 * logged or returned.
 */

import { Router } from 'express';
import { createHash, timingSafeEqual } from 'crypto';

const COOKIE = 'hopstock_token';
const COOKIE_MAX_AGE_S = 30 * 24 * 60 * 60;

const digest = (s) => createHash('sha256').update(s).digest();
// Hashing first gives equal-length buffers, so timingSafeEqual never throws or exits early
const safeEqual = (a, b) => timingSafeEqual(digest(a), digest(b));

function cookieValue(req) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function isAuthenticated(req) {
  const token = process.env.HOPSTOCK_TOKEN;
  if (!token) return true;
  const header = req.headers.authorization ?? '';
  const bearer = /^Bearer (.+)$/i.exec(header)?.[1] ?? null;
  // Evaluate both so timing does not depend on which credential was supplied
  const bearerOk = bearer !== null && safeEqual(bearer, token);
  const cookie = cookieValue(req);
  const cookieOk = cookie !== null && safeEqual(cookie, token);
  return bearerOk || cookieOk;
}

export function requireAuth(req, res, next) {
  if (isAuthenticated(req)) return next();
  res.status(401).json({ error: 'Authentication required' });
}

/**
 * Fixed-window counter keyed by req.ip.
 * ponytail: in-memory, single process, resets on restart; use a shared store if scaled out.
 */
export function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    let entry = hits.get(req.ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests' });
    }
    next();
  };
}

function setCookie(req, res, value, maxAge) {
  const secure = req.secure || req.get('x-forwarded-proto') === 'https';
  res.append(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure ? '; Secure' : ''}`,
  );
}

export const authRouter = Router();

authRouter.post('/login', rateLimit(10, 15 * 60 * 1000), (req, res) => {
  const token = process.env.HOPSTOCK_TOKEN;
  if (!token) return res.json({ ok: true });
  const supplied = req.body?.token;
  if (typeof supplied !== 'string' || !safeEqual(supplied, token)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  setCookie(req, res, token, COOKIE_MAX_AGE_S);
  res.json({ ok: true });
});

authRouter.post('/logout', (req, res) => {
  setCookie(req, res, '', 0);
  res.json({ ok: true });
});

authRouter.get('/status', (req, res) => {
  res.json({ required: !!process.env.HOPSTOCK_TOKEN, authenticated: isAuthenticated(req) });
});
