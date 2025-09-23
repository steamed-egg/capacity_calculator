// Environment Variable Loader for Client-Side Applications
// This is a simple client-side solution for loading environment variables
// Note: For production apps, consider using a build tool like Vite, Webpack, or Parcel

class EnvLoader {
    constructor() {
        this.env = {};
        this.loaded = false;
    }

    async loadEnv() {
        if (this.loaded) return this.env;

        try {
            // Attempt to fetch .env file
            const response = await fetch('.env');
            if (!response.ok) {
                console.warn('No .env file found. Using fallback configuration.');
                return this.env;
            }

            const envText = await response.text();
            this.parseEnvFile(envText);
            this.loaded = true;
            console.log('✅ Environment variables loaded successfully');

        } catch (error) {
            console.warn('Could not load .env file:', error.message);
            console.log('💡 Make sure your .env file exists and your server can serve static files');
        }

        return this.env;
    }

    parseEnvFile(envText) {
        const lines = envText.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) continue;

            // Parse KEY=value format
            const equalIndex = trimmed.indexOf('=');
            if (equalIndex === -1) continue;

            const key = trimmed.substring(0, equalIndex).trim();
            const value = trimmed.substring(equalIndex + 1).trim();

            // Remove quotes if present
            const cleanValue = value.replace(/^["']|["']$/g, '');

            this.env[key] = cleanValue;
        }
    }

    get(key, defaultValue = null) {
        return this.env[key] || defaultValue;
    }

    has(key) {
        return key in this.env;
    }
}

// Create global instance
window.envLoader = new EnvLoader();