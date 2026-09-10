import {optimiseLocal, optimiseGlobal} from './optimisation-engine.mjs';

self.onmessage = event => {
  const {model, options} = event.data;
  try {
    let start = performance.now();
    const local = optimiseLocal(model, {...options, initialControls:model.initialControls});
    self.postMessage({kind:'local', result:local, milliseconds:performance.now()-start});
    start = performance.now();
    const global = optimiseGlobal(model, {tolerance:1e-7});
    self.postMessage({kind:'global', result:global, milliseconds:performance.now()-start});
  } catch (error) {
    self.postMessage({kind:'error', message:error.message});
  }
};
