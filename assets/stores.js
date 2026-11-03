/* THE FORGE: store links, one place. Read by /get/, /start/ and /membership/.
   Flip androidLive to true once the Play listing page is public, and set
   iosUrl to the App Store URL at public launch (it is TestFlight until then). */
window.FORGE_STORES = {
  androidLive: false,
  iosLive: true,
  androidStoreUrl: 'https://play.google.com/store/apps/details?id=com.theforge.app',
  androidBetaUrl: 'https://play.google.com/apps/testing/com.theforge.app',
  iosUrl: 'https://testflight.apple.com/join/Myg3b4HA'
};
