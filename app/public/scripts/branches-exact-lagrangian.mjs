/** Analytic nonlinear Lagrangian certificate for the recognised teaching laws only. */
import {BRANCH_GRAPH, branchProductionRate, evaluateBranches} from './branches-engine.mjs';
import {createInteriorPeakScenario, isInteriorPeakModel} from './branch-interior-example.mjs';

const EDGES=BRANCH_GRAPH.edges;
const MU=[0,.75,1,1,1,1,1];
const NU=EDGES.map(edge=>edge.id==='1-2'?.75:1);
const ALLOWED=['1-2','2-3','2-8'];
const UPPER_BOUND=7/32;
const TOLERANCE=1e-10;
const TYPE='analytic-interior-peak-nlp';
const modelFromState=state=>({source:1,branches:state.branches.map(branch=>({id:branch.id,from:branch.from,to:branch.to,...branch.parameters}))});
const ordered=model=>EDGES.map(edge=>model.branches.find(branch=>branch.id===edge.id));
const pointFromState=state=>['input','output'].flatMap(key=>EDGES.map(edge=>state.branches.find(branch=>branch.id===edge.id)[key]));
const maxAbsolute=values=>Math.max(0,...values.map(Math.abs));

/** One-sided derivatives at the domain ends; no averaged derivative at a kink. */
function productionDerivatives(x,parameters) {
    const {b,c,d}=parameters;
    const leftA=c/b,rightA=(d-c)/(1-b),rightB=c-rightA*b;
    if(x===b) {
        const left=2*leftA*x,right=2*rightA*x+rightB;
        const smooth=left===right,twiceSmooth=smooth&&leftA===rightA;
        return {first:smooth?left:null,second:twiceSmooth?2*leftA:null,left,right,side:null,kink:!smooth};
    }
    const first=x<b?2*leftA*x:2*rightA*x+rightB;
    return {first,second:2*(x<b?leftA:rightA),side:x===0?'right':x===1?'left':'two-sided',kink:false};
}

function assertPoint(point) {
    if(!Array.isArray(point)||point.length!==24||point.some(value=>!Number.isFinite(value)))throw new TypeError('Un point de 24 coordonnées finies est requis.');
    if(point.some(value=>value<0||value>1))throw new RangeError('Le diagnostic est défini sur la boîte [0,1]²⁴ ; aucune extension ou troncature implicite.');
}

function evaluatePoint(branches,point) {
    assertPoint(point);
    const x=point.slice(0,12),y=point.slice(12),balances=MU.map((_,i)=>i===0?1:0);
    const laws=[],derivativeDetails=[],gradient=Array(24).fill(0);
    const hessian=Array.from({length:24},()=>Array(24).fill(0));
    let objective=0;
    for(let i=0;i<12;i++) {
        const edge=EDGES[i],source=Number(edge.from)-1,destination=Number(edge.to)-1;
        balances[source]-=x[i];
        if(destination<7)balances[destination]+=y[i];else objective+=y[i];
        laws.push(branchProductionRate(x[i],branches[i])-y[i]);
        const derivatives=productionDerivatives(x[i],branches[i]);
        derivativeDetails.push({variable:`x_${edge.id.replace('-','_')}`,...derivatives});
        gradient[i]=derivatives.first===null?null:-MU[source]+NU[i]*derivatives.first;
        gradient[12+i]=(destination===7?1:MU[destination])-NU[i];
        hessian[i][i]=derivatives.second===null?null:NU[i]*derivatives.second;
    }
    const balanceContributions=balances.map((value,i)=>MU[i]*value),lawContributions=laws.map((value,i)=>NU[i]*value);
    const lagrangian=objective+balanceContributions.reduce((a,b)=>a+b,0)+lawContributions.reduce((a,b)=>a+b,0);
    const residual=Math.max(maxAbsolute(balances),maxAbsolute(laws));
    return {
        point:[...point],objective,lagrangian,gradient,hessian,derivativeDetails,
        constraints:{balances:balances.map((value,i)=>({id:`h${i+1}`,value,multiplier:MU[i],contribution:balanceContributions[i]})),laws:laws.map((value,i)=>({id:EDGES[i].id,value,multiplier:NU[i],contribution:lawContributions[i]}))},
        residual,feasible:residual<=TOLERANCE,differentiable:gradient.every(Number.isFinite),
        boundStatus:point.map(value=>value===0?'lower':value===1?'upper':'interior'),
    };
}

function certificate() {
    const terms=[
        {id:'1-2',expression:'(3/4) g12(x12)',upperBound:3/16,argmax:.5,reason:'g12(u)≤u(1−u)≤1/4'},
        ...['2-3','2-8'].map(id=>({id,expression:`q(x${id.replace('-','')})−(3/4)x${id.replace('-','')}`,upperBound:1/64,argmax:.125,reason:'q(t)−(3/4)t≤t/4−t²=1/64−(t−1/8)²'})),
        {id:'1-5',expression:'g15(x15)',upperBound:0,argmaxInterval:[0,1],reason:'La loi de 1→5 est identiquement nulle.'},
        ...EDGES.filter(edge=>!['1-2','1-5','2-3','2-8'].includes(edge.id)).map(edge=>({id:edge.id,expression:`g${edge.id.replace('-','')}(x)−x`,upperBound:0,argmaxSet:'{0} ∪ [0,001 ; 1]',reason:'Le rendement de branche vérifie 0≤f≤1.'})),
    ];
    return {type:TYPE,scope:'fixed-recognised-laws',domain:'[0,1]²⁴',upperBound:UPPER_BOUND,upperBoundFraction:'7/32',terms,expression:'L=(3/4)g12(x12)+q(x23)−(3/4)x23+q(x28)−(3/4)x28+g15(x15)+Σ_8_aval(g_e(x_e)−x_e)',proof:'La somme des bornes séparées vaut 3/16+1/64+1/64=7/32 ; le témoin compatible atteint cette somme.',provenance:'Multiplicateurs analytiques du réseau non linéaire ; aucun multiplicateur de PL réutilisé.',arithmetic:'analytic-bound-with-floating-point-evaluation'};
}

/** Recognise laws and verify the supplied state before exposing the certificate. */
export function explainExactLagrangian(state) {
    if(!state?.feasible||!Array.isArray(state.branches))return {available:false,reason:'Une configuration compatible est requise.'};
    let model,referencePoint,recomputed;
    try {
        model=modelFromState(state);
        if(!isInteriorPeakModel(model))return {available:false,reason:'Ce certificat analytique concerne uniquement les lois de l’exemple à sommet intérieur.'};
        referencePoint=pointFromState(state);
        assertPoint(referencePoint);
        recomputed=evaluateBranches(model,state.controls);
    } catch {
        return {available:false,reason:'La configuration de référence ne peut pas être vérifiée.'};
    }
    if(!recomputed.feasible||maxAbsolute(referencePoint.map((value,i)=>value-pointFromState(recomputed)[i]))>TOLERANCE||!Number.isFinite(state.production)||Math.abs(state.production-recomputed.production)>TOLERANCE)return {available:false,reason:'Les flux de référence ne correspondent pas aux lois et aux partages déclarés.'};
    const branches=ordered(model),witness=evaluateBranches(createInteriorPeakScenario()),witnessPoint=pointFromState(witness);
    const atReference=evaluatePoint(branches,referencePoint),atWitness=evaluatePoint(branches,witnessPoint);
    if(!atReference.feasible)return {available:false,reason:'La référence ne satisfait pas les bilans et les lois.'};
    const variables=['input','output'].flatMap((quantity,k)=>EDGES.map((edge,i)=>({index:k*12+i,id:`${k===0?'x':'y'}_${edge.id.replace('-','_')}`,branch:edge.id,quantity,label:`${k===0?'x':'y'}${edge.id.replace('-','')} · ${edge.from}→${edge.to}`,lower:0,upper:1})));
    const lowerMultipliers=witnessPoint.map((value,i)=>value===0&&atWitness.gradient[i]<0?-atWitness.gradient[i]:0),upperMultipliers=Array(24).fill(0);
    const correctedGradient=atWitness.gradient.map((value,i)=>value+lowerMultipliers[i]-upperMultipliers[i]);
    return {
        available:true,type:TYPE,model,variables,variableNames:variables.map(variable=>variable.id),referencePoint,witnessPoint,
        multipliers:{balances:MU.map((value,i)=>({id:String(i+1),symbol:`μ${i+1}`,value})),laws:EDGES.map((edge,i)=>({id:edge.id,symbol:`ν${edge.id.replace('-','')}`,value:NU[i]})),units:'production normalisée par unité de résidu de bilan ou de loi'},
        certificate:certificate(),atReference,atWitness,
        stationarity:{convention:'L + αᵀz + βᵀ(1−z), α≥0, β≥0',lowerMultipliers,upperMultipliers,correctedGradient,residual:maxAbsolute(correctedGradient),complementarityResidual:maxAbsolute(witnessPoint.map((value,i)=>lowerMultipliers[i]*value+upperMultipliers[i]*(1-value)))},
        explanation:'Les dérivées libres des six entrées aval nulles valent −1 au témoin ; les multiplicateurs de borne inférieure valent 1. Les autres dérivées libres y sont nulles.',
    };
}

/** Evaluate the full 24-variable L and actual equality residuals inside its box. */
export function evaluateExactLagrangianPoint(diagnostic,point) {
    if(!diagnostic?.available||diagnostic.type!==TYPE||!isInteriorPeakModel(diagnostic.model))throw new TypeError('Un diagnostic analytique reconnu est requis.');
    return evaluatePoint(ordered(diagnostic.model),point);
}

function axis(center,radius,steps,extra) {
    const low=Math.max(0,center-radius),high=Math.min(1,center+radius);
    return [...new Set([low,high,center,...extra.filter(value=>value>=low&&value<=high),...Array.from({length:steps+1},(_,i)=>low+(high-low)*i/steps)])].sort((a,b)=>a-b);
}

const term=(id,value,parameters)=>id==='1-2'?.75*branchProductionRate(value,parameters):branchProductionRate(value,parameters)-.75*value;
const termFormula=(id,coordinate)=>id==='1-2'?`(3/4)g12(${coordinate})`:`q(${coordinate})−(3/4)${coordinate}`;
function derivativeFormula(id,coordinate) {
    return id==='1-2'
        ?`∂L/∂${coordinate}=(3/4)g12′(${coordinate}) : 13,5${coordinate} pour ${coordinate}<0,1 ; 0,75−1,5${coordinate} pour ${coordinate}>0,1 ; non définie en 0,1.`
        :`∂L/∂${coordinate}=q′(${coordinate})−3/4 : 198${coordinate}−0,75 pour ${coordinate}<0,01 ; 0,25−2${coordinate} pour ${coordinate}>0,01 ; non définie en 0,01.`;
}

/** A free-coordinate slice of L, normally outside the network equalities. */
export function sampleExactLagrangianSurface(state,{x='1-2',y='2-3',radius=.1,steps=60}={}) {
    if(!ALLOWED.includes(x)||!ALLOWED.includes(y)||x===y)throw new RangeError('Deux arcs distincts parmi 1-2, 2-3 et 2-8 sont requis.');
    if(!Number.isFinite(radius)||radius<=0||radius>1||!Number.isInteger(steps)||steps<2||steps>60)throw new RangeError('Rayon dans ]0,1] et résolution entière de 2 à 60 requis.');
    const diagnostic=explainExactLagrangian(state);
    if(!diagnostic.available)throw new TypeError(diagnostic.reason);
    const branches=ordered(diagnostic.model),ix=EDGES.findIndex(edge=>edge.id===x),iy=EDGES.findIndex(edge=>edge.id===y);
    const center=diagnostic.referencePoint,peakX=x==='1-2'?.5:.125,peakY=y==='1-2'?.5:.125;
    const xs=axis(center[ix],radius,steps,[branches[ix].b,peakX]),ys=axis(center[iy],radius,steps,[branches[iy].b,peakY]);
    const at=(u,v)=>{
        const point=[...center];point[ix]=u;point[iy]=v;
        const result=evaluatePoint(branches,point);
        return {x:u,y:v,z:result.lagrangian,feasible:result.feasible,residual:result.residual,gradient:[result.gradient[ix],result.gradient[iy]],hessian:[[result.hessian[ix][ix],0],[0,result.hessian[iy][iy]]],derivativeSides:[result.derivativeDetails[ix].side,result.derivativeDetails[iy].side]};
    };
    const points=ys.map(v=>xs.map(u=>at(u,v))),reference={...at(center[ix],center[iy]),kind:'reference',label:'Configuration de référence, contraintes vérifiées'};
    const peak={...at(peakX,peakY),inWindow:peakX>=xs[0]&&peakX<=xs.at(-1)&&peakY>=ys[0]&&peakY<=ys.at(-1)};
    peak.attainsGlobalBound=Math.abs(peak.z-UPPER_BOUND)<=TOLERANCE;
    const constant=diagnostic.atReference.lagrangian-term(x,center[ix],branches[ix])-term(y,center[iy],branches[iy]);
    const zs=points.flat().map(point=>point.z).filter(Number.isFinite);
    return {
        kind:'nlp',xLabel:`x${x.replace('-','')} · Entrée ${x.replace('-','→')}`,yLabel:`x${y.replace('-','')} · Entrée ${y.replace('-','→')}`,zLabel:'L_NLP · Multiplicateurs analytiques',
        points,markers:[reference],ranges:{x:[xs[0],xs.at(-1)],y:[ys[0],ys.at(-1)],z:[Math.min(0,...zs),Math.max(1,...zs)]},
        frozen:diagnostic.variables.filter(variable=>variable.index!==ix&&variable.index!==iy).map(variable=>({key:variable.id,value:center[variable.index]})),
        formula:`L(x,y)=${termFormula(x,'x')}+${termFormula(y,'y')}+C ; C=${constant}.`,formulaConstant:constant,
        derivativeFormula:{dx:derivativeFormula(x,'x'),dy:derivativeFormula(y,'y')},
        peak,diagnostic,interpretation:'Les 22 autres coordonnées x/y restent figées. Un point hors contraintes est une valeur du lagrangien, pas un rendement réalisable. Les dérivées aux extrémités de [0,1] sont unilatérales.',
    };
}
