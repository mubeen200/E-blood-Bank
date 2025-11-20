module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primaryRed: "#dc2626",
        primaryBlue: "#1d4ed8",
        accent: "#f97316"
      }
    }
  },
  plugins: [
    require("tailwindcss-animate"), 
  ]
};
