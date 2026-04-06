// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
	// Used for canonical URLs + sitemap generation.
	// Set SITE in Vercel to your real domain (e.g. https://daniel.com).
	site: process.env.SITE ?? 'https://daniel-smidstrup.vercel.app',
	output: 'server',
	adapter: vercel(),
	integrations: [tailwind(), react(), sitemap()],
});
