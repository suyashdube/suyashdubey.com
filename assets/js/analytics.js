/* Cookieless analytics — Cloudflare Web Analytics.
   No cookies, no localStorage, no cross-site identifiers, no consent banner
   required. Paste your beacon token below and it starts reporting; leave it
   empty and this file is a no-op.

   Get a token: dash.cloudflare.com → Analytics & Logs → Web Analytics →
   Add a site → suyashdubey.com → copy the "token" value from the snippet. */
(function () {
  'use strict';
  var TOKEN = '';                       // <-- paste the beacon token here
  if (!TOKEN) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.setAttribute('data-cf-beacon', JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
