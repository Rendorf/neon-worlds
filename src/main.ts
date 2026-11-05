import { App } from './app';

declare global {
  interface Window {
    neonWorlds?: App;
  }
}

window.neonWorlds = new App();
