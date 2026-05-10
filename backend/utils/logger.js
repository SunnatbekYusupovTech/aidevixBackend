/**
 * Aidevix Structured Logger
 * JSON formatida log chiqaradi — Railway, Logtail, Datadog barchasi parse qila oladi.
 *
 * LOG_LEVEL env: error | warn | info | debug (default: info production, debug dev)
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const currentLevel =
  LEVELS[process.env.LOG_LEVEL] ??
  (process.env.NODE_ENV === 'production' ? LEVELS.info : LEVELS.debug);

const write = (level, message, meta = {}) => {
  if (LEVELS[level] > currentLevel) return;

  const entry = {
    ts:    new Date().toISOString(),
    level,
    env:   process.env.NODE_ENV || 'development',
    msg:   message,
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === 'error') console.error(line);
  else if (level === 'warn')  console.warn(line);
  else                        console.log(line);
};

const logger = {
  error: (msg, meta)  => write('error', msg, meta),
  warn:  (msg, meta)  => write('warn',  msg, meta),
  info:  (msg, meta)  => write('info',  msg, meta),
  debug: (msg, meta)  => write('debug', msg, meta),

  /** HTTP request logi — middleware dan chaqiriladi */
  request: (req, statusCode, durationMs) => {
    // Sensitive query parametrlarni maskalash (token, code, password log'ga tushmasligi uchun)
    const safePath = String(req.originalUrl || '').replace(
      /([?&])(token|code|password|secret|access_token|refresh_token|authorization|api_key)=[^&]*/gi,
      '$1$2=***'
    );
    write('info', 'HTTP', {
      method:   req.method,
      path:     safePath,
      status:   statusCode,
      ms:       durationMs,
      ip:       req.ip || req.headers['x-forwarded-for'],
      ua:       (req.headers['user-agent'] || '').slice(0, 80),
    });
  },
};

module.exports = logger;
