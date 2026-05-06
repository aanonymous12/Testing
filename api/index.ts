import { initApp } from '../server';

let app;

export default async function handler(req, res) {
  if (!app) {
    app = await initApp();
  }
  return app(req, res);
}
