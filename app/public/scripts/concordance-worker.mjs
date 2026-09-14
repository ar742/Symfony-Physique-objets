import {searchConcordanceGrid,searchConcordanceLocal,searchConcordanceGlobal} from './concordance-engine.mjs';

self.onmessage=({data})=>{
    try {
        const {model,settings}=data;
        for (const [kind,search,options] of [
            ['grid',searchConcordanceGrid,{divisions:settings.divisions,maxEvaluations:200000}],
            ['local',searchConcordanceLocal,{initialControls:model.initialControls,initialStep:.1,minStep:1e-5,maxEvaluations:5000}],
            ['global',searchConcordanceGlobal,{initialControls:model.initialControls,maxNodes:settings.maxNodes,tolerance:1e-5}],
        ]) {
            self.postMessage({kind:'phase',phase:kind});
            const start=performance.now();
            const result=search(model,{...options,objective:'output',domain:'rectified',
                onProgress:result=>self.postMessage({kind,result,partial:true,milliseconds:performance.now()-start})});
            self.postMessage({kind,result,partial:false,milliseconds:performance.now()-start});
        }
        self.postMessage({kind:'done'});
    } catch(error) {self.postMessage({kind:'error',message:error.message});}
};
