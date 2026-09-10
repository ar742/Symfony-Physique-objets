import {evaluateBranches} from './branches-engine.mjs';
import {evaluateLagrangianPoint} from './branches-lagrangian.mjs';

export const SPLIT_VARIABLES = [
    {id:'s1',label:'s1 · Part en 1 vers 2'}, {id:'s2',label:'s2 · Part en 2 vers 3'},
    {id:'s5',label:'s5 · Part en 5 vers 3'}, {id:'s3',label:'s3 · Part en 3 vers 4'},
    {id:'s7',label:'s7 · Part en 7 vers 6'},
];
const splitIds=SPLIT_VARIABLES.map(variable=>variable.id);
export function modelForState(state) {
    if(!state?.feasible)throw new TypeError('Une configuration compatible est requise.');
    return {source:1,branches:state.branches.map(branch=>({id:branch.id,from:branch.from,to:branch.to,...branch.parameters}))};
}
function settings(radius,steps) {
    if(!Number.isFinite(radius)||radius<=0||radius>1||!Number.isInteger(steps)||steps<2||steps>60)throw new RangeError('Fenêtre dans ]0,1] et résolution de 2 à 60 requises.');
}
function axis(center,upper,radius,steps,extra=[]) {
    const lo=Math.max(0,center-radius),hi=Math.min(upper,center+radius);
    return [...new Set([lo,hi,center,...extra.filter(value=>value>=lo&&value<=hi),...Array.from({length:steps+1},(_,i)=>lo+(hi-lo)*i/steps)])].sort((a,b)=>a-b);
}
function sameLaws(first,second) {
    return first.branches.every(branch=>{
        const other=second.branches.find(item=>item.id===branch.id);
        return other&&['a','b','c','d'].every(key=>other.parameters[key]===branch.parameters[key]);
    });
}
function ranges(points) {
    const values=points.flat();
    return {x:[Math.min(...values.map(p=>p.x)),Math.max(...values.map(p=>p.x))],y:[Math.min(...values.map(p=>p.y)),Math.max(...values.map(p=>p.y))],z:[Math.min(0,...values.map(p=>p.z)),Math.max(1,...values.map(p=>p.z))]};
}

/** Recompute every downstream flow with three fractions and all twelve laws frozen. */
export function sampleYieldSurface(state,{x='s1',y='s2',radius=.15,steps=24,comparison=null}={}) {
    settings(radius,steps);
    if(!splitIds.includes(x)||!splitIds.includes(y)||x===y)throw new RangeError('Deux fractions distinctes sont requises.');
    const model=modelForState(state),comparable=comparison?.feasible&&sameLaws(state,comparison);
    const xs=axis(state.controls[x],1,radius,steps,comparable?[comparison.controls[x]]:[]);
    const ys=axis(state.controls[y],1,radius,steps,comparable?[comparison.controls[y]]:[]);
    const at=(u,v)=>{
        const result=evaluateBranches(model,{...state.controls,[x]:u,[y]:v});
        if(!result.feasible)throw new Error('La coupe de partages doit conserver les bilans.');
        return {x:u,y:v,z:result.production,feasible:true};
    };
    const points=ys.map(v=>xs.map(u=>at(u,v))),markers=[{...at(state.controls[x],state.controls[y]),kind:'reference',label:'Configuration de référence'}];
    let comparisonStatus='absent';
    if(comparable) {
        const u=comparison.controls[x],v=comparison.controls[y];
        const projected=splitIds.some(key=>key!==x&&key!==y&&Math.abs(state.controls[key]-comparison.controls[key])>1e-12);
        comparisonStatus=projected?'projected':'same-slice';
        if(u>=xs[0]&&u<=xs.at(-1)&&v>=ys[0]&&v<=ys.at(-1))markers.push({...at(u,v),kind:'grid',label:projected?'Grille projetée dans cette coupe, rendement recalculé':'Meilleur résultat de la grille dans cette coupe',projected,originalYield:comparison.production});
        else comparisonStatus+='-outside';
    } else if(comparison)comparisonStatus='different-laws';
    return {kind:'yield',xLabel:SPLIT_VARIABLES.find(item=>item.id===x).label,yLabel:SPLIT_VARIABLES.find(item=>item.id===y).label,zLabel:'Rendement r',points,markers,ranges:ranges(points),comparisonStatus,frozen:splitIds.filter(key=>key!==x&&key!==y).map(key=>({key,value:state.controls[key]}))};
}

/** Slice the recorded LP Lagrangian; never substitute a penalized yield surface. */
export function sampleLagrangianSurface(diagnostic,{x=0,y=1,radius=.15,steps=24}={}) {
    settings(radius,steps);
    if(!diagnostic?.available||!Number.isInteger(x)||!Number.isInteger(y)||x===y||x<0||y<0||x>=diagnostic.bestPoint.length||y>=diagnostic.bestPoint.length)throw new RangeError('Deux variables distinctes du PL enregistré sont requises.');
    const xs=axis(diagnostic.bestPoint[x],diagnostic.bounds[x],radius,steps),ys=axis(diagnostic.bestPoint[y],diagnostic.bounds[y],radius,steps);
    const at=(u,v)=>{
        const point=[...diagnostic.bestPoint];point[x]=u;point[y]=v;
        const value=evaluateLagrangianPoint(diagnostic,point);
        return {x:u,y:v,z:value.lagrangian,feasible:value.feasible,residual:value.residuals.primal};
    };
    const points=ys.map(v=>xs.map(u=>at(u,v)));
    return {kind:'lagrangian',xLabel:diagnostic.variableNames[x],yLabel:diagnostic.variableNames[y],zLabel:'L du PL '+diagnostic.recordId,points,markers:[{...at(diagnostic.bestPoint[x],diagnostic.bestPoint[y]),kind:'reference',label:'Meilleure configuration réalisable'}],ranges:ranges(points),recordId:diagnostic.recordId,frozen:diagnostic.bestPoint.map((value,j)=>({key:diagnostic.variableNames[j],value})).filter((_,j)=>j!==x&&j!==y)};
}

/** A2 and A5 have only one degree of freedom when the twelve laws are fixed. */
export function sampleCoupledInputs(state,{radius=.15,steps=48}={}) {
    settings(radius,steps);
    const model=modelForState(state),shares=axis(state.controls.s1,1,radius,steps);
    const at=share=>{
        const result=evaluateBranches(model,{...state.controls,s1:share});
        return {x:result.available['2'],y:result.available['5'],z:result.production,share,feasible:result.feasible};
    };
    const points=[shares.map(at)];
    return {kind:'coupled',xLabel:'Exp. IN 2 · Somme A2',yLabel:'Exp. IN 5 · Somme A5',zLabel:'Rendement r',points,markers:[{...at(state.controls.s1),kind:'reference',label:'Configuration de référence'}],ranges:ranges(points),frozen:splitIds.filter(key=>key!=='s1').map(key=>({key,value:state.controls[key]}))};
}
