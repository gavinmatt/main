/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {},
	},
	plugins: [require("@tailwindcss/typography"),require("daisyui")],
	daisyui: {
		themes: [
			"lofi",
			{
				"lofi-dark": {
					"primary": "#E8E8E8",
					"primary-content": "#0D0D0D",
					"secondary": "#D6D6D6",
					"secondary-content": "#1A1919",
					"accent": "#C4C4C4",
					"accent-content": "#171717",
					"neutral": "#2A2A2A",
					"neutral-content": "#F2F2F2",
					"base-100": "#17181B",
					"base-200": "#1F2023",
					"base-300": "#2C2D31",
					"base-content": "#E8E8E8",
					"info": "#4DA3FF",
					"success": "#3DDB6E",
					"warning": "#FF8A6E",
					"error": "#F14FA8",
					"--btn-text-case": "uppercase",
					"--border-btn": "1px",
					"--tab-border": "1px",
					"--rounded-box": "0.25rem",
					"--rounded-btn": "0.125rem",
					"--rounded-badge": "0.125rem",
					"--animation-btn": "0",
					"--animation-input": "0",
					"--btn-focus-scale": "1",
					"--tab-radius": "0",
					"color-scheme": "dark",
				},
			},
		],
		darkTheme: "lofi-dark", // name of one of the included themes for dark mode
		logs: false, // Shows info about daisyUI version and used config in the console when building your CSS
	  }
}
