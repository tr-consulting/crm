# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# CRM Prototype

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Add environment variables in `.env`:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

## Deploy (GitHub Pages)
This repo is configured for GitHub Pages at:
`https://tr-consulting.github.io/crm/`

Steps:
1. Push to `main`.
2. GitHub Actions builds and publishes to `gh-pages`.

If you change the repo name, update the `base` in `vite.config.js`.
