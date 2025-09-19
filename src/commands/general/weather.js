export default {
    name: 'weather',
    aliases: ['w', 'forecast', 'climate'],
    category: 'general',
    description: 'Get weather information for any city',
    usage: 'weather <city>',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender }) {
        const city = args.join(' ');
        
        // Weather API would be implemented here
        // For now, providing a mock response with realistic data structure
        
        try {
            // Simulate weather data (in real implementation, this would fetch from OpenWeatherMap API)
            const weatherData = this.getMockWeatherData(city);
            
            // Weather condition emojis
            const weatherEmojis = {
                'sunny': '☀️',
                'cloudy': '☁️', 
                'rainy': '🌧️',
                'stormy': '⛈️',
                'snowy': '❄️',
                'foggy': '🌫️',
                'windy': '💨',
                'clear': '🌙'
            };
            
            const emoji = weatherEmojis[weatherData.condition] || '🌡️';
            
            // Wind direction arrow
            const windDirections = {
                'N': '↑', 'NE': '↗️', 'E': '→', 'SE': '↘️',
                'S': '↓', 'SW': '↙️', 'W': '←', 'NW': '↖️'
            };
            const windArrow = windDirections[weatherData.windDirection] || '💨';
            
            const response = `${emoji} *Weather Report for ${city}*

━━━━━━━━━━━━━━━━━━━━━

🌡️ **CURRENT CONDITIONS:**
├ Temperature: ${weatherData.temperature}°C (${weatherData.temperatureF}°F)
├ Feels Like: ${weatherData.feelsLike}°C (${weatherData.feelsLikeF}°F)
├ Condition: ${weatherData.description}
├ Humidity: ${weatherData.humidity}%
╰ Visibility: ${weatherData.visibility} km

💨 **WIND & PRESSURE:**
├ Wind Speed: ${weatherData.windSpeed} km/h ${windArrow}
├ Wind Direction: ${weatherData.windDirection} (${weatherData.windDegrees}°)
├ Pressure: ${weatherData.pressure} hPa
╰ UV Index: ${weatherData.uvIndex} (${this.getUVDescription(weatherData.uvIndex)})

🌅 **SUN & MOON:**
├ Sunrise: ${weatherData.sunrise}
├ Sunset: ${weatherData.sunset}
├ Day Length: ${weatherData.dayLength}
╰ Moon Phase: ${weatherData.moonPhase} ${this.getMoonEmoji(weatherData.moonPhase)}

📊 **ADDITIONAL INFO:**
├ Air Quality: ${weatherData.airQuality} (${this.getAQDescription(weatherData.airQuality)})
├ Cloud Cover: ${weatherData.cloudCover}%
├ Dew Point: ${weatherData.dewPoint}°C
╰ Last Updated: ${weatherData.lastUpdated}

━━━━━━━━━━━━━━━━━━━━━

${this.getWeatherAdvice(weatherData)}

⚠️ *Note: Weather API integration needed for live data*
*This is sample data demonstrating the weather command structure*`;

            await sock.sendMessage(from, { text: response });
            
        } catch (error) {
            const response = `❌ *Weather Error*

🌍 **City:** ${city}
❌ **Error:** Unable to fetch weather data

💡 **Possible Issues:**
• City name not found
• Weather API not configured
• Network connection error
• API limit reached

🔧 **To fix this:**
• Check city spelling
• Use format: "City, Country"
• Try major cities first

**Examples:**
• \`weather London\`
• \`weather New York, USA\`
• \`weather Mumbai, India\`
• \`weather Paris, France\`

*Contact admin to configure weather API*`;

            await sock.sendMessage(from, { text: response });
        }
    },
    
    getMockWeatherData(city) {
        // Simulate different weather conditions based on city name
        const conditions = ['sunny', 'cloudy', 'rainy', 'clear'];
        const condition = conditions[city.length % conditions.length];
        
        const baseTemp = 20 + (city.charCodeAt(0) % 20) - 10; // Temperature range: 10-30°C
        
        return {
            temperature: baseTemp,
            temperatureF: Math.round(baseTemp * 9/5 + 32),
            feelsLike: baseTemp + (Math.random() * 4 - 2),
            feelsLikeF: Math.round((baseTemp + (Math.random() * 4 - 2)) * 9/5 + 32),
            condition: condition,
            description: this.getWeatherDescription(condition),
            humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
            visibility: Math.floor(Math.random() * 10) + 5, // 5-15 km
            windSpeed: Math.floor(Math.random() * 25) + 5, // 5-30 km/h
            windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
            windDegrees: Math.floor(Math.random() * 360),
            pressure: Math.floor(Math.random() * 50) + 1000, // 1000-1050 hPa
            uvIndex: Math.floor(Math.random() * 10) + 1, // 1-10
            sunrise: '06:30 AM',
            sunset: '07:15 PM',
            dayLength: '12h 45m',
            moonPhase: ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'][Math.floor(Math.random() * 8)],
            airQuality: Math.floor(Math.random() * 150) + 25, // 25-175 AQI
            cloudCover: Math.floor(Math.random() * 100), // 0-100%
            dewPoint: baseTemp - Math.floor(Math.random() * 10) - 5,
            lastUpdated: new Date().toLocaleTimeString()
        };
    },
    
    getWeatherDescription(condition) {
        const descriptions = {
            'sunny': 'Bright and sunny',
            'cloudy': 'Overcast with clouds',
            'rainy': 'Light rain showers',
            'stormy': 'Thunderstorms expected',
            'snowy': 'Snow falling',
            'foggy': 'Foggy conditions',
            'windy': 'Strong winds',
            'clear': 'Clear night sky'
        };
        return descriptions[condition] || 'Pleasant weather';
    },
    
    getUVDescription(uvIndex) {
        if (uvIndex <= 2) return 'Low';
        if (uvIndex <= 5) return 'Moderate';
        if (uvIndex <= 7) return 'High';
        if (uvIndex <= 10) return 'Very High';
        return 'Extreme';
    },
    
    getAQDescription(aqi) {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
        if (aqi <= 200) return 'Unhealthy';
        return 'Hazardous';
    },
    
    getMoonEmoji(phase) {
        const emojis = {
            'New Moon': '🌑',
            'Waxing Crescent': '🌒',
            'First Quarter': '🌓',
            'Waxing Gibbous': '🌔',
            'Full Moon': '🌕',
            'Waning Gibbous': '🌖',
            'Last Quarter': '🌗',
            'Waning Crescent': '🌘'
        };
        return emojis[phase] || '🌙';
    },
    
    getWeatherAdvice(data) {
        if (data.temperature > 30) return '🔥 *Hot day! Stay hydrated and avoid direct sunlight.*';
        if (data.temperature < 5) return '🧥 *Cold weather! Bundle up and stay warm.*';
        if (data.condition === 'rainy') return '☂️ *Don\'t forget your umbrella!*';
        if (data.windSpeed > 25) return '💨 *Windy conditions! Secure loose objects.*';
        if (data.humidity > 80) return '💧 *High humidity! You might feel sticky.*';
        if (data.uvIndex > 7) return '🧴 *High UV! Apply sunscreen before going out.*';
        return '👍 *Perfect weather for outdoor activities!*';
    }
};