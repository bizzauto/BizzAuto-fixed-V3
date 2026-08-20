import { Request, Response, NextFunction } from 'express';

/**
 * API Versioning Middleware
 * Supports version negotiation via:
 *   1. URL path: /api/v1/contacts
 *   2. Header: Accept-Version: v1
 *   3. Query param: ?api_version=v1
 * 
 * Currently only v1 exists. v2+ will be added for breaking changes.
 * Requests without a version default to v1.
 */

const CURRENT_VERSION = 'v2';
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEPRECATED_VERSIONS = ['v1'];

export interface VersionedRequest extends Request {
  apiVersion: string;
}

/**
 * Middleware that extracts and validates API version from the request.
 * Sets req.apiVersion for downstream route handlers.
 */
export function apiVersioning(req: VersionedRequest, _res: Response, next: NextFunction): void {
  let version = CURRENT_VERSION;

  // 1. Check URL path (highest priority)
  const pathMatch = req.path.match(/^\/v(\d+)\//);
  if (pathMatch) {
    version = `v${pathMatch[1]}`;
  }

  // 2. Check Accept-Version header
  const headerVersion = req.headers['accept-version'] as string;
  if (headerVersion) {
    version = headerVersion.toLowerCase();
  }

  // 3. Check query parameter (lowest priority)
  const queryVersion = req.query.api_version as string;
  if (queryVersion) {
    version = queryVersion.toLowerCase();
  }

  // Normalize: ensure 'v' prefix
  if (version && !version.startsWith('v')) {
    version = `v${version}`;
  }

  // Validate version is supported
  if (!SUPPORTED_VERSIONS.includes(version)) {
    return _res.status(400).json({
      success: false,
      error: `API version '${version}' is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(', ')}`,
      supportedVersions: SUPPORTED_VERSIONS,
    }) as any;
  }

  // Set version and deprecation headers for deprecated versions
  req.apiVersion = version;
  if (DEPRECATED_VERSIONS.includes(version)) {
    _res.setHeader('Deprecation', 'true');
    _res.setHeader('Sunset', '2027-01-01');
    _res.setHeader('X-API-Version', `${version} (deprecated, upgrade to ${CURRENT_VERSION})`);
    _res.setHeader('Link', `</api/${CURRENT_VERSION}>; rel="successor-version"`);
  } else {
    _res.setHeader('X-API-Version', version);
  }
  next();
}

/**
 * Deprecation warning header for old versions.
 * Add this to responses when a version is approaching end-of-life.
 */
export function versionDeprecationNotice(version: string, sunsetDate: string) {
  return (_req: VersionedRequest, res: Response, next: NextFunction): void => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunsetDate);
    res.setHeader('Link', `</api/${CURRENT_VERSION}>; rel="successor-version"`);
    next();
  };
}
