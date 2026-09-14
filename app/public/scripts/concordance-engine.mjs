/** Nodal concordance model: signed Y=X*C, or rectified Y=max(0,X*C). No DOM. */
const PAIRS=[[1,2],[1,5],[2,3],[2,8],[5,3],[5,7],[7,6],[7,4],[3,4],[3,6],[4,8],[6,8]];
export const CONCORDANCE_GRAPH=Object.freeze({
    nodes:Object.freeze(Array.from({length:8},(_,i)=>Object.freeze({id:String(i+1),name:`Nœud ${i+1}`}))),
    edges:Object.freeze(PAIRS.map(([from,to])=>Object.freeze({id:`${from}-${to}`,from:String(from),to:String(to)}))),
    controls:Object.freeze(['s1','s2','s5','s3','s7']),order:Object.freeze(['1','2','5','3','7','4','6','8']),
});
const {edges:EDGES,controls:KEYS,order:ORDER}=CONCORDANCE_GRAPH;
const IN=Object.fromEntries(ORDER.map(id=>[id,EDGES.map((edge,i)=>edge.to===id?i:-1).filter(i=>i>=0)]));
const OUT=Object.fromEntries(ORDER.map(id=>[id,EDGES.map((edge,i)=>edge.from===id?i:-1).filter(i=>i>=0)]));
const IDS=ORDER.filter(id=>id!=='1').sort((a,b)=>Number(a)-Number(b));
const finite=Number.isFinite,maxAbs=values=>Math.max(0,...values.map(Math.abs));

export function createConcordanceScenario() {
    return {source:1,environments:Object.fromEntries(IDS.map(id=>[id,1])),
        epsilon:Object.fromEntries(IDS.map(id=>[id,Object.fromEntries(IN[id].map(i=>[EDGES[i].from,id==='2'||id==='5'?-1:0]))])),
        initialControls:Object.fromEntries(KEYS.map(key=>[key,.5]))};
}

export function validateConcordanceModel(model) {
    if(!model||model.source!==1||!model.environments||!model.epsilon)throw new TypeError('Source1=1, environnements et influences sont requis.');
    const environments={},epsilon={};
    for(const id of IDS) {
        const env=model.environments[id];
        if(!finite(env)||env<0||env>1)throw new RangeError(`Environnement du nœud ${id} requis dans [0,1].`);
        environments[id]=env;epsilon[id]={};
        for(const index of IN[id]) {
            const from=EDGES[index].from,value=model.epsilon[id]?.[from];
            if(!finite(value)||value< -1||value>1)throw new RangeError(`ε${id},${from} requis dans [−1,1] (origine ${from}, destination ${id}).`);
            epsilon[id][from]=value;
        }
    }
    // A complete matrix may be retained for study. Non-edge coefficients multiply
    // absent transfers (zero); they never add an edge or act on source Y1=1.
    for(const [id,row] of Object.entries(model.epsilon)) {
        if(!ORDER.includes(id)||!row||typeof row!=='object'||Array.isArray(row))throw new TypeError('Les lignes de la matrice ε doivent désigner les nœuds 1 à 8.');
        epsilon[id]??={};
        for(const [from,value] of Object.entries(row)) {
            if(!ORDER.includes(from)||!finite(value)||value< -1||value>1)throw new RangeError(`ε${id},${from} doit appartenir à [−1,1], avec deux indices de 1 à 8.`);
            if(id===from&&value!==0)throw new RangeError(`La diagonale ε${id},${id} doit être nulle.`);
            epsilon[id][from]=value;
        }
    }
    return {source:1,environments,epsilon,initialControls:readControls(model.initialControls??Object.fromEntries(KEYS.map(key=>[key,.5])))};
}

function readControls(controls) {
    if(!controls||typeof controls!=='object'||Array.isArray(controls))throw new TypeError('Les cinq fractions de partage sont requises.');
    return Object.fromEntries(KEYS.map(key=>{const value=controls[key];if(!finite(value)||value<0||value>1)throw new RangeError(`${key} doit appartenir à [0,1].`);return [key,value];}));
}
function common(options={}) {
    const objective=options.objective??'output',domain=options.domain??'rectified';
    if(!['arrivals','output'].includes(objective))throw new RangeError('Objectif arrivals ou output requis.');
    if(!['signed','rectified','efficiency'].includes(domain))throw new RangeError('Domaine signed, rectified ou efficiency requis.');
    return {objective,domain};
}
function searchOptions(options,names) {
    if(!options||typeof options!=='object'||Array.isArray(options))throw new TypeError('Options invalides.');
    for(const key of Object.keys(options))if(!['objective','domain','onProgress','shouldCancel',...names].includes(key))throw new TypeError(`Option inconnue : ${key}.`);
    for(const key of ['onProgress','shouldCancel'])if(options[key]!==undefined&&typeof options[key]!=='function')throw new TypeError(`${key} doit être une fonction.`);
    return common(options);
}
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new RangeError(`${label} requis entre ${min} et ${max}.`);return value;};
const positive=(value,label)=>{if(!finite(value)||value<=0)throw new RangeError(`${label} doit être strictement positif.`);return value;};

function jet(value,index=-1){const gradient=Array(5).fill(0);if(index>=0)gradient[index]=1;return {value,constant:index<0,gradient,hessian:Array.from({length:5},()=>Array(5).fill(0))};}
function add(a,b){return {value:a.value+b.value,constant:a.constant&&b.constant,gradient:a.gradient.map((v,i)=>v+b.gradient[i]),hessian:a.hessian.map((row,i)=>row.map((v,j)=>v+b.hessian[i][j]))};}
function scale(a,s){return {value:a.value*s,constant:s===0||a.constant,gradient:a.gradient.map(v=>v*s),hessian:a.hessian.map(row=>row.map(v=>v*s))};}
function multiply(a,b){return {value:a.value*b.value,constant:(a.constant&&a.value===0)||(b.constant&&b.value===0)||(a.constant&&b.constant),gradient:a.gradient.map((v,i)=>v*b.value+b.gradient[i]*a.value),hessian:a.hessian.map((row,i)=>row.map((v,j)=>v*b.value+b.hessian[i][j]*a.value+a.gradient[i]*b.gradient[j]+b.gradient[i]*a.gradient[j]))};}
const sum=items=>items.reduce(add,jet(0));

function evaluateScalar(model,controls,options) {
    const q=Array(12),nodes=[],flows=[];let valid=true,reason=null;
    for(const id of ORDER) {
        const input=id==='1'?1:IN[id].reduce((total,i)=>total+q[i],0);
        const coefficient=id==='1'?1:model.environments[id]+IN[id].reduce((total,i)=>total+model.epsilon[id][EDGES[i].from]*q[i],0);
        const rawOutput=input*coefficient,output=id==='1'?1:options.domain==='signed'?rawOutput:Math.max(0,rawOutput);
        if(!finite(output)||!finite(coefficient)){valid=false;reason??='Propagation non finie.';}
        if(id!=='1'&&options.domain==='efficiency'&&(coefficient<0||coefficient>1)){valid=false;reason??=`Coefficient du nœud ${id} hors [0,1].`;}
        nodes.push({id,input,coefficient,rawOutput,output,rectified:options.domain!=='signed'&&rawOutput<0});
        OUT[id].forEach((index,position)=>{const fraction=OUT[id].length===1?1:position===0?controls[`s${id}`]:1-controls[`s${id}`];q[index]=output*fraction;flows[index]={...EDGES[index],fraction,value:q[index]};});
    }
    const objectives={arrivals:IN['8'].reduce((total,i)=>total+Math.abs(q[i]),0),algebraicArrivals:IN['8'].reduce((total,i)=>total+q[i],0),output:nodes.find(node=>node.id==='8').output};
    return {controls:{...controls},nodes,flows,objectives,objective:objectives[options.objective],objectiveKind:options.objective,domain:options.domain,feasible:valid,reason,derivatives:{gradient:null,hessian:null,differentiable:null,computed:false}};
}
function evaluateReady(model,controls,options,detailed=true) {
    if(!detailed)return evaluateScalar(model,controls,options);
    const q=Array(12),nodeJets={},nodes=[],flows=[],kinks=[];
    const source=jet(1);nodeJets['1']={input:source,coefficient:jet(1),raw:source,output:source};
    let domainValid=true,reason=null;
    for(const id of ORDER) {
        if(id!=='1') {
            const input=sum(IN[id].map(i=>q[i]));
            const coefficient=add(jet(model.environments[id]),sum(IN[id].map(i=>scale(q[i],model.epsilon[id][EDGES[i].from]))));
            const raw=multiply(input,coefficient);
            const output=options.domain==='signed'||raw.value>0?raw:jet(0);
            if(options.domain!=='signed'&&raw.value===0&&!raw.constant)kinks.push({node:id,input:input.value,coefficient:coefficient.value,rawGradient:[...raw.gradient],reason:'Produit X·C nul : dérivées non retenues sans analyse supplémentaire du seuil.'});
            if(options.domain==='efficiency'&&(coefficient.value<0||coefficient.value>1)){domainValid=false;reason??=`Coefficient du nœud ${id} hors [0,1].`;}
            nodeJets[id]={input,coefficient,raw,output};
        }
        const node=nodeJets[id];
        if(!finite(node.output.value)||!finite(node.coefficient.value)){domainValid=false;reason??='Propagation non finie.';}
        nodes.push({id,input:node.input.value,coefficient:node.coefficient.value,rawOutput:node.raw.value,output:node.output.value,rectified:options.domain!=='signed'&&node.raw.value<0});
        OUT[id].forEach((index,position)=>{
            const fraction=OUT[id].length===1?jet(1):position===0?jet(controls[`s${id}`],KEYS.indexOf(`s${id}`)):add(jet(1),scale(jet(controls[`s${id}`],KEYS.indexOf(`s${id}`)),-1));
            q[index]=multiply(node.output,fraction);
            flows[index]={...EDGES[index],fraction:fraction.value,value:q[index].value};
        });
    }
    const arrivals=sum(IN['8'].map(index=>{
        const flow=q[index];
        if(options.domain==='signed'&&options.objective==='arrivals'&&flow.value===0&&!flow.constant)kinks.push({edge:EDGES[index].id,reason:'Valeur absolue d’un transfert nul : dérivées non retenues sans analyse supplémentaire.'});
        return flow.value<0?scale(flow,-1):flow;
    })),output=nodeJets['8'].output,chosen=options.objective==='arrivals'?arrivals:output;
    const differentiable=kinks.length===0&&chosen.gradient.every(finite)&&chosen.hessian.flat().every(finite);
    return {controls:{...controls},nodes,flows,objectives:{arrivals:arrivals.value,algebraicArrivals:nodeJets['8'].input.value,output:output.value},objective:chosen.value,
        objectiveKind:options.objective,domain:options.domain,feasible:domainValid&&finite(chosen.value),reason,
        derivatives:{gradient:differentiable?[...chosen.gradient]:null,hessian:differentiable?chosen.hessian.map(row=>[...row]):null,differentiable,kinks},
    };
}
export function evaluateConcordance(model,controls=model?.initialControls,options={}) {
    const ready=validateConcordanceModel(model);return evaluateReady(ready,readControls(controls??ready.initialControls),common(options));
}

// Directed IEEE-754 rounding for interval arithmetic. No model value is clipped.
const bits=new DataView(new ArrayBuffer(8));
function up(value){if(value===Infinity)return value;if(value===0)return Number.MIN_VALUE;bits.setFloat64(0,value);let raw=bits.getBigUint64(0);raw+=value>0?1n:-1n;bits.setBigUint64(0,raw);return bits.getFloat64(0);}
const down=value=>-up(-value),iv=value=>[value,value];
const ia=(a,b)=>[down(a[0]+b[0]),up(a[1]+b[1])];
const im=(a,b)=>{const values=[a[0]*b[0],a[0]*b[1],a[1]*b[0],a[1]*b[1]];return [down(Math.min(...values)),up(Math.max(...values))];};
const idiv=(a,b)=>{const values=[a[0]/b[0],a[0]/b[1],a[1]/b[0],a[1]/b[1]];return [down(Math.min(...values)),up(Math.max(...values))];};
const isum=items=>items.reduce(ia,iv(0));
const nonnegative=a=>[Math.max(0,a[0]),Math.max(0,a[1])];
const iabs=a=>a[0]<=0&&a[1]>=0?[0,Math.max(-a[0],a[1])]:[Math.min(Math.abs(a[0]),Math.abs(a[1])),Math.max(Math.abs(a[0]),Math.abs(a[1]))];
function oneInputRange(range,e,epsilon) {
    const candidates=[iv(range[0]),iv(range[1])];
    if(epsilon!==0){const stationary=idiv(iv(-e),im(iv(2),iv(epsilon)));if(stationary[1]>range[0]&&stationary[0]<range[1])candidates.push([Math.max(range[0],stationary[0]),Math.min(range[1],stationary[1])]);}
    const values=candidates.map(x=>ia(im(iv(e),x),im(iv(epsilon),im(x,x))));
    return [Math.min(...values.map(value=>value[0])),Math.max(...values.map(value=>value[1]))];
}
function readBox(box) {
    if(!Array.isArray(box)||box.length!==5)throw new TypeError('Une boîte de cinq intervalles est requise.');
    return box.map((interval,i)=>{if(!Array.isArray(interval)||interval.length!==2||!interval.every(finite)||interval[0]<0||interval[1]>1||interval[0]>interval[1])throw new RangeError(`Intervalle de ${KEYS[i]} invalide.`);return [...interval];});
}
function boundReady(model,box,options) {
    const q=Array(12),nodes={'1':{input:iv(1),coefficient:iv(1),output:iv(1)}};
    let impossible=false;
    for(const id of ORDER) {
        if(id!=='1') {
            const input=isum(IN[id].map(i=>q[i]));
            const coefficient=ia(iv(model.environments[id]),isum(IN[id].map(i=>im(iv(model.epsilon[id][EDGES[i].from]),q[i]))));
            const raw=IN[id].length===1?oneInputRange(q[IN[id][0]],model.environments[id],model.epsilon[id][EDGES[IN[id][0]].from]):im(input,coefficient);
            nodes[id]={input,coefficient,output:options.domain==='signed'?raw:nonnegative(raw)};
            if(options.domain==='efficiency'&&(coefficient[1]<0||coefficient[0]>1))impossible=true;
        }
        OUT[id].forEach((index,position)=>{
            const s=box[KEYS.indexOf(`s${id}`)],fraction=OUT[id].length===1?iv(1):position===0?s:[down(1-s[1]),up(1-s[0])];
            const transfer=im(nodes[id].output,nonnegative(fraction));
            q[index]=options.domain==='signed'?transfer:nonnegative(transfer);
        });
    }
    const arrivals=isum(IN['8'].map(i=>iabs(q[i]))),selected=options.objective==='arrivals'?arrivals:nodes['8'].output;
    // Negative transfers can cancel at junctions and change the sign of C and Y.
    // Bounds derived from nonnegative gain ceilings do not apply to that model.
    if(options.domain==='signed')return {box:box.map(interval=>[...interval]),upperBound:selected[1],lowerBound:selected[0],impossible,nodes,flows:q,cutBounds:null,arithmetic:'outward-rounded-intervals'};
    // A generic cut bound uses coefficient ceilings along all downstream paths.
    const weights={'8':1};
    for(const id of [...ORDER].reverse().filter(id=>id!=='8'))weights[id]=Math.max(...OUT[id].map(index=>{
        const to=EDGES[index].to;
        return to==='8'&&options.objective==='arrivals'?1:im(iv(Math.max(0,nodes[to].coefficient[1])),iv(weights[to]))[1];
    }));
    const sourceOutputs=isum(['2','5'].map(id=>im(iv(weights[id]),iv(nodes[id].output[1]))))[1];
    const gains=['2','5'].map(id=>im(iv(weights[id]),iv(Math.max(0,nodes[id].coefficient[1])))[1]);
    const sourceInputs=Math.max(...box[0].map(s=>ia(im(iv(gains[0]),iv(s)),im(iv(gains[1]),[down(1-s),up(1-s)]))[1]));
    const upperBound=Math.min(selected[1],sourceOutputs,sourceInputs);
    return {box:box.map(interval=>[...interval]),upperBound,lowerBound:selected[0],impossible,nodes,flows:q,cutBounds:{sourceInputs,sourceOutputs},arithmetic:'outward-rounded-intervals'};
}
export function boundConcordanceBox(model,box,options={}) {return boundReady(validateConcordanceModel(model),readBox(box),common(options));}

function initialSeed(ready,options){return readControls(options.initialControls??ready.initialControls);}
export function searchConcordanceGrid(model,options={}) {
    const mode=searchOptions(options,['divisions','maxEvaluations']),ready=validateConcordanceModel(model);
    const divisions=integer(options.divisions??10,1,100,'divisions'),limit=integer(options.maxEvaluations??200000,0,Number.MAX_SAFE_INTEGER,'maxEvaluations'),total=(divisions+1)**5;
    let best=null,evaluations=0,feasibleCount=0,cancelled=false;
    const snapshot=()=>({method:'grid',best,status:cancelled?'cancelled':evaluations===total?'complete':'evaluation-limit',complete:!cancelled&&evaluations===total,evaluations,feasibleCount,total,divisions,upperBound:null,gap:null});
    while(evaluations<total&&evaluations<limit) {
        if(options.shouldCancel?.()){cancelled=true;break;}
        let code=evaluations;const controls={};
        for(const key of KEYS){controls[key]=(code%(divisions+1))/divisions;code=Math.floor(code/(divisions+1));}
        const state=evaluateReady(ready,controls,mode,false);evaluations++;
        if(state.feasible){feasibleCount++;if(!best||state.objective>best.objective)best=evaluateReady(ready,controls,mode);}
        if(evaluations%1000===0)options.onProgress?.(snapshot());
    }
    const result=snapshot();options.onProgress?.(result);return result;
}

export function searchConcordanceLocal(model,options={}) {
    const mode=searchOptions(options,['initialControls','initialStep','minStep','maxEvaluations']),ready=validateConcordanceModel(model);
    const initialStep=positive(options.initialStep??.1,'initialStep'),minStep=positive(options.minStep??1e-5,'minStep'),limit=integer(options.maxEvaluations??5000,0,Number.MAX_SAFE_INTEGER,'maxEvaluations');
    if(initialStep>1||minStep>initialStep)throw new RangeError('Pas minimal≤pas initial≤1 requis.');
    const start=initialSeed(ready,options);let best=null,evaluations=0,step=initialStep,status='evaluation-limit';const history=[];
    const snapshot=()=>({method:'local',best,status,complete:status==='local-stop',evaluations,step,history:[...history],upperBound:null,gap:null});
    if(options.shouldCancel?.())status='cancelled';
    else if(limit>0){const first=evaluateReady(ready,start,mode);evaluations++;if(first.feasible)best=first;else status='no-feasible-start';}
    if(best)history.push({evaluations,step,controls:{...best.controls},objective:best.objective});
    while(best&&evaluations<limit&&step>=minStep&&status!=='cancelled') {
        if(options.shouldCancel?.()){status='cancelled';break;}
        let candidate=best;
        for(const key of KEYS)for(const sign of [-1,1]) {
            if(evaluations>=limit)break;
            if(options.shouldCancel?.()){status='cancelled';break;}
            const value=Math.min(1,Math.max(0,best.controls[key]+sign*step));
            if(value===best.controls[key])continue;
            const state=evaluateReady(ready,{...best.controls,[key]:value},mode,false);evaluations++;
            if(state.feasible&&state.objective>candidate.objective)candidate=state;
        }
        if(candidate!==best){best=evaluateReady(ready,candidate.controls,mode);history.push({evaluations,step,controls:{...best.controls},objective:best.objective});}
        else step/=2;
        options.onProgress?.(snapshot());
    }
    if(status!=='cancelled'&&best&&step<minStep)status='local-stop';
    const result=snapshot();options.onProgress?.(result);return result;
}

export function searchConcordanceGlobal(model,options={}) {
    const mode=searchOptions(options,['initialControls','maxNodes','tolerance']),ready=validateConcordanceModel(model),start=initialSeed(ready,options);
    const maxNodes=integer(options.maxNodes??4000,0,1000000,'maxNodes'),tolerance=positive(options.tolerance??1e-5,'tolerance');
    const root=boundReady(ready,Array.from({length:5},()=>[0,1]),mode),queue=root.impossible?[]:[{...root,id:0}],unresolved=[];
    let best=null,evaluations=0,processedNodes=0,nextId=1,closedUpper=-Infinity,cancelled=false;
    const consider=controls=>{const state=evaluateReady(ready,controls,mode,false);evaluations++;if(state.feasible&&(!best||state.objective>best.objective))best=evaluateReady(ready,controls,mode);};
    const snapshot=()=>{
        const upperBound=Math.max(best?.objective??-Infinity,closedUpper,...queue.map(node=>node.upperBound),...unresolved.map(node=>node.upperBound));
        const gap=best?Math.max(0,upperBound-best.objective):null,certified=!!best&&gap<=tolerance;
        const status=cancelled?'cancelled':certified?'certified':!queue.length&&!unresolved.length&&!best?'infeasible':unresolved.length&&!queue.length?'uncertain':'node-limit';
        return {method:'interval-global',best,status,complete:!cancelled&&(certified||status==='infeasible'),evaluations,processedNodes,openNodes:queue.length+unresolved.length,maxNodes,tolerance,upperBound:upperBound===-Infinity?null:upperBound,gap};
    };
    if(options.shouldCancel?.())cancelled=true;
    else if(!root.impossible){consider(start);for(let code=0;code<32;code++){if(options.shouldCancel?.()){cancelled=true;break;}consider(Object.fromEntries(KEYS.map((key,i)=>[key,(code>>i)&1])));}}
    options.onProgress?.(snapshot());
    while(!cancelled&&queue.length&&processedNodes<maxNodes) {
        if(options.shouldCancel?.()){cancelled=true;break;}
        if(snapshot().complete)break;
        queue.sort((a,b)=>b.upperBound-a.upperBound||a.id-b.id);const node=queue.shift();
        if(best&&node.upperBound<=best.objective+tolerance){closedUpper=Math.max(closedUpper,node.upperBound);continue;}
        processedNodes++;
        const widths=node.box.map(interval=>interval[1]-interval[0]),axis=widths.indexOf(Math.max(...widths));
        if(widths[axis]<=1e-12){unresolved.push(node);continue;}
        const middle=(node.box[axis][0]+node.box[axis][1])/2;
        for(const interval of [[node.box[axis][0],middle],[middle,node.box[axis][1]]]) {
            const box=node.box.map(value=>[...value]);box[axis]=interval;
            const child=boundReady(ready,box,mode);child.upperBound=Math.min(child.upperBound,node.upperBound);child.id=nextId++;
            if(child.impossible)continue;
            consider(Object.fromEntries(KEYS.map((key,i)=>[key,(box[i][0]+box[i][1])/2])));
            if(best&&child.upperBound<=best.objective+tolerance)closedUpper=Math.max(closedUpper,child.upperBound);else queue.push(child);
        }
        if(processedNodes%25===0)options.onProgress?.(snapshot());
    }
    const result={...snapshot(),certificate:{type:'interval-propagation-dag',arithmetic:'outward-rounded-intervals',rootUpperBound:root.upperBound,closedUpper:closedUpper===-Infinity?null:closedUpper,frontier:[...queue,...unresolved].map(node=>({id:node.id,box:node.box,upperBound:node.upperBound})),scope:{objective:mode.objective,domain:mode.domain}}};
    options.onProgress?.(result);return result;
}

/** q on the twelve arcs, then X2..X8, then Y2..Y8: 26 independent coordinates. */
export function concordanceWitnessPoint(state) {
    if(!state?.feasible)throw new TypeError('Une configuration compatible est requise.');
    return [...EDGES.map(edge=>state.flows.find(flow=>flow.id===edge.id).value),...IDS.map(id=>state.nodes.find(node=>node.id===id).input),...IDS.map(id=>state.nodes.find(node=>node.id===id).output)];
}

export function evaluateConcordanceLagrangian(model,point,options={}) {
    const ready=validateConcordanceModel(model),mode=common(options);
    if(!Array.isArray(point)||point.length!==26||point.some(value=>!finite(value)))throw new TypeError('26 coordonnées finies q, X, Y sont requises.');
    const multipliers=options.multipliers??Array(21).fill(0);
    if(!Array.isArray(multipliers)||multipliers.length!==21||multipliers.some(value=>!finite(value)))throw new TypeError('21 multiplicateurs finis sont requis.');
    const q=point.slice(0,12),X=Object.fromEntries(IDS.map((id,i)=>[id,point[12+i]])),Y=Object.fromEntries([['1',1],...IDS.map((id,i)=>[id,point[19+i]])]);
    const constraints=[],selectedGradient=Array(26).fill(0),hessian=Array.from({length:26},()=>Array(26).fill(0)),kinks=[];
    const coefficients={},active={};let objective=mode.objective==='output'?Y['8']:0;
    if(mode.objective==='output')selectedGradient[25]=1;
    else for(const index of IN['8']){objective+=Math.abs(q[index]);selectedGradient[index]=Math.sign(q[index]);if(q[index]===0)kinks.push({type:'absolute-flow',edge:EDGES[index].id,selection:0});}
    IDS.forEach((id,i)=>{
        const coefficient=ready.environments[id]+IN[id].reduce((sum,index)=>sum+ready.epsilon[id][EDGES[index].from]*q[index],0),raw=X[id]*coefficient,phi=mode.domain==='signed'||raw>0?1:0;
        coefficients[id]=coefficient;active[id]=phi;
        constraints.push({id:`input-${id}`,value:X[id]-IN[id].reduce((sum,index)=>sum+q[index],0),multiplier:multipliers[i]});
        if(mode.domain!=='signed'&&raw===0&&multipliers[7+i]!==0)kinks.push({type:'rectification',node:id,selection:0});
    });
    IDS.forEach((id,i)=>{const raw=X[id]*coefficients[id];constraints.push({id:`law-${id}`,value:Y[id]-(mode.domain==='signed'?raw:Math.max(0,raw)),multiplier:multipliers[7+i]});});
    for(let n=1;n<=7;n++){const id=String(n);constraints.push({id:`share-${id}`,value:OUT[id].reduce((sum,index)=>sum+q[index],0)-Y[id],multiplier:multipliers[14+n-1]});}
    IDS.forEach((id,i)=>{
        const lambda=multipliers[i],mu=multipliers[7+i],phi=active[id];
        selectedGradient[12+i]+=lambda-mu*phi*coefficients[id];
        selectedGradient[19+i]+=mu-(id==='8'?0:multipliers[14+Number(id)-1]);
        for(const index of IN[id]){
            const epsilon=ready.epsilon[id][EDGES[index].from];
            selectedGradient[index]+=-lambda-mu*phi*X[id]*epsilon;
            hessian[index][12+i]=hessian[12+i][index]=-mu*phi*epsilon;
        }
    });
    EDGES.forEach((edge,i)=>selectedGradient[i]+=multipliers[14+Number(edge.from)-1]);
    const lagrangian=objective+constraints.reduce((sum,constraint)=>sum+constraint.multiplier*constraint.value,0),residual=maxAbs(constraints.map(constraint=>constraint.value));
    let shareAdmissible=true;
    for(let n=1;n<=7;n++) {
        const id=String(n),supply=Y[id];
        for(const index of OUT[id]) {
            if(mode.domain==='signed') {
                // With signed supply, q/Y remains a fraction in [0,1]. At Y=0
                // every outgoing q must vanish; opposite signs are inadmissible.
                if(supply===0?q[index]!==0:supply<0?q[index]>0||q[index]<supply-1e-10:q[index]<0||q[index]>supply+1e-10)shareAdmissible=false;
            } else if(supply<0||q[index]<0||q[index]>supply+1e-10)shareAdmissible=false;
        }
    }
    const domainAdmissible=mode.domain==='signed'||(Object.values(X).every(value=>value>=0)&&Object.values(Y).every(value=>value>=0)&&(mode.domain!=='efficiency'||Object.values(coefficients).every(value=>value>=0&&value<=1)));
    return {point:[...point],objective,lagrangian,multipliers:[...multipliers],constraints,coefficients,residual,feasible:residual<=1e-10&&shareAdmissible&&domainAdmissible,shareAdmissible,domainAdmissible,
        differentiable:kinks.length===0,gradient:kinks.length?null:selectedGradient,selectedGradient,hessian:kinks.length?null:hessian,kinks,
        convention:`hX=X−Σq ; hY=${mode.domain==='signed'?'Y−XC':'Y−max(0,XC)'} ; hshare=Σq−Y, avec Y1=1 ; L=objectif+λhX+μhY+ηhshare.`};
}

/** Adjoint multipliers diagnose a reference; they do not provide a global certificate. */
export function explainConcordanceLagrangian(model,state,options={}) {
    const ready=validateConcordanceModel(model),mode=common({objective:options.objective??state?.objectiveKind,domain:options.domain??state?.domain}),checked=evaluateReady(ready,readControls(state?.controls),mode);
    if(!checked.feasible)throw new TypeError('Une référence compatible avec le domaine est requise.');
    const referencePoint=concordanceWitnessPoint(checked),supplied=concordanceWitnessPoint(state);
    if(maxAbs(referencePoint.map((value,i)=>value-supplied[i]))>1e-10)throw new TypeError('La référence ne correspond pas au modèle.');
    const byId=Object.fromEntries(checked.nodes.map(node=>[node.id,node])),p={'8':mode.objective==='output'?1:0},values={},selections=[];
    for(const id of [...ORDER].reverse().filter(id=>id!=='8')) {
        p[id]=0;
        for(const index of OUT[id]) {
            const edge=EDGES[index],node=byId[edge.to],phi=mode.domain==='signed'||node.rawOutput>0?1:0;
            if(mode.domain!=='signed'&&node.rawOutput===0)selections.push({node:edge.to,selection:0,reason:'Seuil de rectification : choix déclaré, pas une dérivée certifiée.'});
            const direct=edge.to==='8'&&mode.objective==='arrivals'?Math.sign(checked.flows[index].value):0;
            if(edge.to==='8'&&mode.objective==='arrivals'&&checked.flows[index].value===0)selections.push({edge:edge.id,selection:0,reason:'Valeur absolue d’un transfert nul : choix déclaré, pas une dérivée certifiée.'});
            const value=direct+p[edge.to]*phi*(node.coefficient+node.input*ready.epsilon[edge.to][id]);
            values[edge.id]=value;p[id]+=checked.flows[index].fraction*value;
        }
    }
    const mu=IDS.map(id=>-p[id]),lambda=IDS.map((id,i)=>mu[i]*(mode.domain==='signed'||byId[id].rawOutput>0?1:0)*byId[id].coefficient),eta=Array.from({length:7},(_,i)=>-p[String(i+1)]),multipliers=[...lambda,...mu,...eta];
    const atReference=evaluateConcordanceLagrangian(ready,referencePoint,{...mode,multipliers});
    return {available:true,referencePoint,multipliers,lambda,mu,eta,potentials:p,edgeValues:values,atReference,selections,
        maxSelectedGradient:maxAbs(atReference.selectedGradient),globalCertificate:false,
        interpretation:'Multiplicateurs adjoints à fractions fixées. Une petite dérivée ou un sous-gradient choisi ne prouve pas un maximum global ; L libre est bilinéaire par morceaux.'};
}
