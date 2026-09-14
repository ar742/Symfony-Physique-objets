import {evaluateConcordance} from './concordance-engine.mjs';

export const CONCORDANCE_SPLITS = ['s1','s2','s5','s3','s7'];

/** A compatible section of the complete rectified network, never a fitted dome. */
export function sampleConcordanceSurface(model, state, {x='s1',y='s2',radius=.15,steps=30}={}) {
    if (!CONCORDANCE_SPLITS.includes(x) || !CONCORDANCE_SPLITS.includes(y) || x===y) throw new RangeError('Choisir deux partages distincts.');
    if (!Number.isFinite(radius) || radius<=0 || radius>1) throw new RangeError('Le rayon doit être strictement positif et au plus égal à 1.');
    if (!Number.isInteger(steps) || steps<4 || steps>60) throw new RangeError('Le maillage doit compter entre 4 et 60 divisions.');
    if (!state?.feasible) throw new RangeError('Une configuration réalisable est nécessaire pour centrer la coupe.');
    const options={objective:'output',domain:'rectified'};
    const range=key=>[Math.max(0,state.controls[key]-radius),Math.min(1,state.controls[key]+radius)];
    const ranges={x:range(x),y:range(y)};
    const coordinates=key=>[...new Set([...Array.from({length:steps+1},(_,i)=>ranges[key][0]+i*(ranges[key][1]-ranges[key][0])/steps),state.controls[key==='x'?x:y]])].sort((a,b)=>a-b);
    const at=(u,v)=>{
        const result=evaluateConcordance(model,{...state.controls,[x]:u,[y]:v},options);
        return {x:u,y:v,z:result.feasible?result.objective:null,feasible:result.feasible,reason:result.reason??null};
    };
    const xs=coordinates('x'),ys=coordinates('y');
    const points=ys.map(v=>xs.map(u=>at(u,v)));
    const reference=at(state.controls[x],state.controls[y]);
    const profiles={x:xs.map(u=>at(u,reference.y)),y:ys.map(v=>at(reference.x,v))};
    const values=points.flat().filter(p=>p.feasible&&Number.isFinite(p.z)).map(p=>p.z);
    if (!values.length) throw new RangeError('Aucun point calculable dans cette fenêtre.');
    const low=Math.min(...values),high=Math.max(...values),margin=Math.max((high-low)*.1,Math.max(1,Math.abs(low),Math.abs(high))*1e-5);
    ranges.z=[low-margin,high+margin];
    return {axes:{x,y},radius,steps,points,reference,profiles,ranges,
        frozen:Object.fromEntries(CONCORDANCE_SPLITS.filter(key=>key!==x&&key!==y).map(key=>[key,state.controls[key]])),
        objective:'Exp. OUT₈ après TH₈',constraints:'Lois rectifiées, associations et partages recalculés à chaque point.'};
}
