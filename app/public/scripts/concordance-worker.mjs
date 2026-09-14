import {searchConcordanceGrid,searchConcordanceLocal,searchConcordanceGlobal} from './concordance-engine.mjs';

self.onmessage=({data})=>{
    try {
        const {model,settings,options:mode={objective:'output',domain:'rectified'}}=data;
        if(mode.objective!=='output'||!['rectified','signed'].includes(mode.domain))throw new RangeError('L’atelier optimise uniquement la sortie finale, en mode rectifié ou signé.');
        for (const [kind,search,options] of [
            ['grid',searchConcordanceGrid,{divisions:settings.divisions,maxEvaluations:200000}],
            ['local',searchConcordanceLocal,{initialControls:model.initialControls,initialStep:.1,minStep:1e-5,maxEvaluations:5000}],
            ['global',searchConcordanceGlobal,{initialControls:model.initialControls,maxNodes:settings.maxNodes,tolerance:1e-5}],
        ]) {
            self.postMessage({kind:'phase',phase:kind});
            const start=performance.now();
            const result=search(model,{...options,...mode,
                onProgress:result=>self.postMessage({kind,result,partial:true,milliseconds:performance.now()-start})});
            self.postMessage({kind,result,partial:false,milliseconds:performance.now()-start});
        }
        self.postMessage({kind:'done'});
    } catch(error) {self.postMessage({kind:'error',message:error.message});}
};
