/**
 * Secrets.gs
 * Central place to store API keys and sensitive config.
 */

function getSecret(keyName) {
  const secrets = {
    'GEMINI_API_KEY': 'AIzaSyAbvmG3tzrRYKJgmGjduHICOVomKaW1syE', // <--- Your Key is safe here
    'OTHER_KEY': '' 
  };

  return secrets[keyName] || null;
}