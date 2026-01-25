/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				ink: {
					50: '#F6F7FB',
					100: '#E9ECF6',
					200: '#C9D0EA',
					300: '#98A5D6',
					400: '#6575C2',
					500: '#4150A8',
					600: '#2F3C84',
					700: '#242F68',
					800: '#1A214B',
					900: '#111736',
					950: '#0B0E22',
				},
			},
			boxShadow: {
				glow: '0 0 0 1px rgba(180, 200, 255, 0.12), 0 10px 40px rgba(0,0,0,0.45)',
			},
			fontFamily: {
				sans: [
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'Segoe UI',
					'Roboto',
					'Helvetica',
					'Arial',
					'Apple Color Emoji',
					'Segoe UI Emoji',
				],
			},
		},
	},
	plugins: [],
};

