// PWA Checker - Add this to browser console to check PWA readiness

const checkPWAReadiness = () => {
  const results = {
    manifest: false,
    serviceWorker: false,
    https: false,
    icons: false,
    installPrompt: false,
    offline: false
  };

  // Check manifest
  const manifestLink = document.querySelector('link[rel="manifest"]');
  if (manifestLink) {
    results.manifest = true;
    console.log('✅ Manifest link found:', manifestLink.href);
  } else {
    console.log('❌ No manifest link found');
  }

  // Check service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      if (registrations.length > 0) {
        results.serviceWorker = true;
        console.log('✅ Service worker registered:', registrations);
      } else {
        console.log('❌ No service worker registered');
      }
    });
  } else {
    console.log('❌ Service workers not supported');
  }

  // Check HTTPS (localhost is OK)
  if (location.protocol === 'https:' || location.hostname === 'localhost') {
    results.https = true;
    console.log('✅ HTTPS or localhost detected');
  } else {
    console.log('❌ HTTPS required (or localhost for testing)');
  }

  // Check beforeinstallprompt support
  if ('onbeforeinstallprompt' in window) {
    results.installPrompt = true;
    console.log('✅ beforeinstallprompt supported');
  } else {
    console.log('⚠️ beforeinstallprompt not supported (may be iOS or already installed)');
  }

  // Test manifest fetch
  if (manifestLink) {
    fetch(manifestLink.href)
      .then(response => response.json())
      .then(manifest => {
        console.log('📄 Manifest content:', manifest);
        
        // Check required fields
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ All required manifest fields present');
        } else {
          console.log('❌ Missing manifest fields:', missingFields);
        }

        // Check icons
        const validIcons = manifest.icons?.filter(icon => {
          const size = parseInt(icon.sizes?.split('x')[0] || '0');
          return size >= 192;
        });

        if (validIcons && validIcons.length > 0) {
          results.icons = true;
          console.log('✅ Valid icons found (>=192px):', validIcons);
        } else {
          console.log('❌ No valid icons found (need at least 192x192)');
        }
      })
      .catch(error => {
        console.log('❌ Failed to fetch manifest:', error);
      });
  }

  // Overall assessment
  setTimeout(() => {
    const passedChecks = Object.values(results).filter(Boolean).length;
    const totalChecks = Object.keys(results).length;
    
    console.log(`\n🏆 PWA Readiness: ${passedChecks}/${totalChecks} checks passed`);
    
    if (passedChecks >= 4) {
      console.log('🎉 Your app should be installable!');
    } else {
      console.log('⚠️ More work needed for PWA installation');
    }
  }, 1000);
};

// Run the check
checkPWAReadiness();

// Listen for beforeinstallprompt
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('🚀 beforeinstallprompt fired! App is installable.');
});

console.log('PWA checker loaded. Results will appear above.');
