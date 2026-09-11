import {searchBranchesGrid} from './branches-engine.mjs';
import {optimiseBranchesStudy} from './branches-global-study.mjs';

self.onmessage = ({data}) => {
    const {model, options, parameterBoxes, mode} = data;
    try {
        if (mode === 'fixed') {
            const started = performance.now();
            const result = searchBranchesGrid(model, {...options.grid,
                onProgress: result => self.postMessage({kind:'grid', result, partial:true, milliseconds:performance.now()-started})});
            self.postMessage({kind:'grid', result, partial:false, milliseconds:performance.now()-started});
        }
        const started = performance.now(), kind = mode === 'fixed' ? 'global' : 'bounded';
        const globalOptions = {...options.global,
            onProgress: result => self.postMessage({kind, result, partial:true, milliseconds:performance.now()-started})};
        if (mode === 'bounded') globalOptions.parameterBoxes = parameterBoxes;
        const result = optimiseBranchesStudy(model, globalOptions);
        self.postMessage({kind, result, partial:false, milliseconds:performance.now()-started});
        self.postMessage({kind:'done'});
    } catch (error) {
        self.postMessage({kind:'error', message:error.message});
    }
};
