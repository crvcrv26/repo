const axios = require('axios');

/**
 * Get location information from IP address using multiple free services
 * @param {string} ipAddress - The IP address to lookup
 * @returns {Promise<Object>} Location information
 */
async function getLocationFromIP(ipAddress) {
  // Handle localhost and private IPs
  if (!ipAddress || 
      ipAddress === '127.0.0.1' || 
      ipAddress === '::1' || 
      ipAddress.startsWith('192.168.') ||
      ipAddress.startsWith('10.') ||
      ipAddress.startsWith('172.')) {
    return {
      city: 'Local Network',
      region: 'Local Network',
      country: 'Local Network',
      latitude: null,
      longitude: null,
      timezone: 'Unknown',
      isp: 'Local Network'
    };
  }

  // Try multiple free IP geolocation services
  const services = [
    {
      name: 'ipapi.co',
      url: `https://ipapi.co/${ipAddress}/json/`,
      parser: (data) => ({
        city: data.city || 'Unknown',
        region: data.region || 'Unknown', 
        country: data.country_name || 'Unknown',
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone || 'Unknown',
        isp: data.org || 'Unknown'
      })
    },
    {
      name: 'ip-api.com',
      url: `http://ip-api.com/json/${ipAddress}`,
      parser: (data) => ({
        city: data.city || 'Unknown',
        region: data.regionName || 'Unknown',
        country: data.country || 'Unknown', 
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone || 'Unknown',
        isp: data.isp || 'Unknown'
      })
    },
    {
      name: 'ipinfo.io',
      url: `https://ipinfo.io/${ipAddress}/json`,
      parser: (data) => {
        const [lat, lon] = (data.loc || '').split(',');
        return {
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          country: data.country || 'Unknown',
          latitude: lat ? parseFloat(lat) : null,
          longitude: lon ? parseFloat(lon) : null,
          timezone: data.timezone || 'Unknown',
          isp: data.org || 'Unknown'
        };
      }
    }
  ];

  // Try each service until one works
  for (const service of services) {
    try {
      console.log(`🌍 Trying ${service.name} for IP: ${ipAddress}`);
      
      const response = await axios.get(service.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'RepoTracker-App/1.0'
        }
      });

      if (response.data && response.status === 200) {
        const location = service.parser(response.data);
        console.log(`✅ Got location from ${service.name}:`, location);
        return location;
      }
    } catch (error) {
      console.log(`❌ ${service.name} failed:`, error.message);
      continue; // Try next service
    }
  }

  // If all services fail, return unknown location
  console.log('⚠️ All geolocation services failed, using fallback');
  return {
    city: 'Unknown',
    region: 'Unknown', 
    country: 'Unknown',
    latitude: null,
    longitude: null,
    timezone: 'Unknown',
    isp: 'Unknown'
  };
}

/**
 * Extract real IP address from request headers
 * @param {Object} req - Express request object
 * @returns {string} Real IP address
 */
function getRealIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         '127.0.0.1';
}

module.exports = {
  getLocationFromIP,
  getRealIP
};
