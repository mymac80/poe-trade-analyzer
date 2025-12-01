/**
 * This script runs in the PAGE context (not extension context)
 * It intercepts XHR/fetch requests made by POE's own scripts
 */

/**
 * Intercept XMLHttpRequest
 */
(function() {
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
    (this as any)._url = url.toString();
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    const url = (this as any)._url || '';

    if (url.includes('/character-window/get-stash-items')) {
      console.log('[POE Pricer] Intercepted stash API call');

      this.addEventListener('load', function() {
        try {
          const data = JSON.parse(this.responseText);

          if (data.items) {
            console.log(`[POE Pricer] Found ${data.items.length} items in stash tab`);

            // Use postMessage to send data to content script (crosses isolated world boundary)
            window.postMessage({
              type: 'POE_PRICER_STASH_DATA',
              items: data.items
            }, '*');
          }
        } catch (error) {
          console.error('[POE Pricer] Error parsing stash data:', error);
        }
      });
    }

    return originalSend.apply(this, args);
  };
})();

/**
 * Intercept fetch
 */
(function() {
  const originalFetch = window.fetch;

  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const url = input.toString();
    const response = await originalFetch.call(this, input, init);

    if (url.includes('/character-window/get-stash-items')) {
      const clone = response.clone();
      try {
        const data = await clone.json();

        if (data.items) {
          console.log(`[POE Pricer] Found ${data.items.length} items in stash tab`);

          window.postMessage({
            type: 'POE_PRICER_STASH_DATA',
            items: data.items
          }, '*');
        }
      } catch (error) {
        console.error('[POE Pricer] Error parsing stash data:', error);
      }
    }

    return response;
  };
})();
