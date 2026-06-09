// Backward compatibility for cached app.html that still looks for app.js
console.log("🔄 Cached app.html detected. Dynamically loading main module...");
import('./main.js').catch(err => {
  console.error("❌ Failed to load main.js via dynamic import:", err);
});
