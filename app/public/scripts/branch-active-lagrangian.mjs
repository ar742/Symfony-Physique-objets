/** Analytic NLP certificate for the complementary example with twelve active branches. */
import {BRANCH_GRAPH,branchProductionRate,evaluateBranches} from './branches-engine.mjs';
import {createActiveBranchesScenario,isActiveBranchesModel} from './branch-active-example.mjs';

const EDGES=BRANCH_GRAPH.edges;
const POTENTIALS=[.35,.41,.44,.48,.41,.48,.44,1];
const MU=POTENTIALS.slice(0,7),NU=EDGES.map(edge=>POTENTIALS[Number(edge.to)-1]);
const ALLOWED=['1-2','2-3','2-8'];
const UPPER_BOUND=.447553125,TOLERANCE=1e-10,TYPE='analytic-twelve-active-branches-nlp';
const maxAbsolute=values=>Math.max(0,...values.map(Math.abs));
const ordered=model=>EDGES.map(edge=>model.branches.find(branch=>branch.id===edge.id));
const modelFromState=state=>({source:1,branches:state.branches.map(branch=>({id:branch.id,from:branch.from,to:branch.to,...branch.parameters}))});
const pointFromState=state=>['input','output'].flatMap(key=>EDGES.map(edge=>state.branches.find(branch=>branch.id===edge.id)[key]));
const coefficients=parameters=>{const beta=(parameters.c-parameters.d)/(1-parameters.b);return {alpha:parameters.c+beta*parameters.b,beta};};

function assertPoint(point) {
    if(!Array.isArray(point)||point.length!==24||point.some(value=>!Number.isFinite(value)))throw new TypeError('Un point de 24 coordonnées finies est requis.');
    if(point.some(value=>value<0||value>1))throw new RangeError('Le diagnostic est défini sur [0,1]²⁴ ; aucun écrêtage ni prolongement implicite.');
}

function derivatives(x,parameters) {
    const {alpha,beta}=coefficients(parameters),rising=parameters.c/parameters.b;
    if(x===parameters.b)return {first:null,second:null,left:2*parameters.c,right:alpha-2*beta*x,side:null,kink:true};
    return {first:x<parameters.b?2*rising*x:alpha-2*beta*x,second:x<parameters.b?2*rising:-2*beta,side:x===0?'right':x===1?'left':'two-sided',kink:false};
}

function evaluatePoint(branches,point) {
    assertPoint(point);
    const x=point.slice(0,12),y=point.slice(12),balances=MU.map((_,i)=>i===0?1:0),laws=[];
    const gradient=Array(24).fill(0),hessian=Array.from({length:24},()=>Array(24).fill(0)),derivativeDetails=[];
    let objective=0,expandedLagrangian=MU[0];
    for(let i=0;i<12;i++) {
        const source=Number(EDGES[i].from)-1,destination=Number(EDGES[i].to)-1;
        balances[source]-=x[i];
        if(destination<7)balances[destination]+=y[i];else objective+=y[i];
        const production=branchProductionRate(x[i],branches[i]);
        laws.push(production-y[i]);
        expandedLagrangian+=NU[i]*production-MU[source]*x[i];
        const local=derivatives(x[i],branches[i]);
        derivativeDetails.push({variable:`x_${EDGES[i].id.replace('-','_')}`,...local});
        gradient[i]=local.first===null?null:NU[i]*local.first-MU[source];
        gradient[12+i]=(destination===7?1:MU[destination])-NU[i];
        hessian[i][i]=local.second===null?null:NU[i]*local.second;
    }
    const balanceContributions=balances.map((value,i)=>MU[i]*value),lawContributions=laws.map((value,i)=>NU[i]*value);
    const lagrangian=objective+balanceContributions.reduce((a,b)=>a+b,0)+lawContributions.reduce((a,b)=>a+b,0);
    const residual=Math.max(maxAbsolute(balances),maxAbsolute(laws));
    return {
        point:[...point],objective,lagrangian,expandedLagrangian,expansionResidual:Math.abs(lagrangian-expandedLagrangian),gradient,hessian,derivativeDetails,
        constraints:{balances:balances.map((value,i)=>({id:`h${i+1}`,value,multiplier:MU[i],contribution:balanceContributions[i]})),laws:laws.map((value,i)=>({id:EDGES[i].id,value,multiplier:NU[i],contribution:lawContributions[i]}))},
        residual,feasible:residual<=TOLERANCE,differentiable:gradient.every(Number.isFinite),boundStatus:point.map(value=>value===0?'lower':value===1?'upper':'interior'),
    };
}

function makeCertificate(branches,witnessPoint) {
    const terms=branches.map((parameters,i)=>{
        const {alpha,beta}=coefficients(parameters),source=Number(EDGES[i].from)-1,linear=NU[i]*alpha-MU[source],quadratic=-NU[i]*beta;
        const argmax=-linear/(2*quadratic),upperBound=-linear*linear/(4*quadratic);
        return {id:EDGES[i].id,sourceMultiplier:MU[source],destinationMultiplier:NU[i],alpha,beta,b:parameters.b,linear,quadratic,argmax,witnessInput:witnessPoint[i],upperBound,
            expression:`ν${EDGES[i].id.replace('-','')} g${EDGES[i].id.replace('-','')}(x)−μ${EDGES[i].from} x`,
            reason:'Pour x≤b, la parabole αx−βx² dépasse la loi réelle de αx(1−x/b)≥0 ; au-delà elle lui est égale. β>0 rend le maximum séparé unique.'};
    });
    const computedBoxSupremum=MU[0]+terms.reduce((sum,term)=>sum+term.upperBound,0);
    const numericalMargin=128*Number.EPSILON*(1+Math.abs(MU[0])+terms.reduce((sum,term)=>sum+Math.abs(term.linear)+Math.abs(term.quadratic)+Math.abs(term.upperBound),0));
    return {
        type:TYPE,scope:'fixed-recognised-laws',domain:'[0,1]²⁴',constant:MU[0],upperBound:UPPER_BOUND,computedBoxSupremum,numericalMargin,numericalUpperBound:Math.max(UPPER_BOUND,computedBoxSupremum)+numericalMargin,terms,
        expression:'L=μ1+Σ_e[μ_destination g_e(x_e)−μ_source x_e]',
        proof:'Les douze termes sont majorés par leurs paraboles strictement concaves, maximisées aux entrées du témoin. La somme vaut 0,447553125 ; le témoin respecte les 19 égalités et atteint cette borne.',
        uniqueness:'Toutes les entrées maximisantes sont uniques. Les lois imposent ensuite les sorties ; les cinq alimentations nodales positives identifient les cinq fractions.',
        provenance:'Multiplicateurs analytiques du réseau non linéaire ; aucun multiplicateur de PL réutilisé.',arithmetic:'analytic-design-with-floating-point-checks',
    };
}

/** This proof is available only for the twelve recognised laws and a verified reference. */
export function explainActiveLagrangian(state) {
    if(!state?.feasible||!Array.isArray(state.branches))return {available:false,reason:'Une configuration compatible est requise.'};
    let model,referencePoint,recomputed;
    try {
        model=modelFromState(state);
        if(!isActiveBranchesModel(model))return {available:false,reason:'Ce certificat concerne uniquement les lois de l’exemple complémentaire à douze branches actives.'};
        referencePoint=pointFromState(state);assertPoint(referencePoint);recomputed=evaluateBranches(model,state.controls);
    } catch {return {available:false,reason:'La configuration de référence ne peut pas être vérifiée.'};}
    const recomputedPoint=pointFromState(recomputed);
    if(!recomputed.feasible||maxAbsolute(referencePoint.map((value,i)=>value-recomputedPoint[i]))>TOLERANCE||!Number.isFinite(state.production)||Math.abs(state.production-recomputed.production)>TOLERANCE)return {available:false,reason:'Les flux de référence ne correspondent pas aux lois et aux partages déclarés.'};
    const branches=ordered(model),witness=evaluateBranches(createActiveBranchesScenario()),witnessPoint=pointFromState(witness);
    const atReference=evaluatePoint(branches,referencePoint),atWitness=evaluatePoint(branches,witnessPoint);
    if(!atReference.feasible)return {available:false,reason:'La référence ne satisfait pas les bilans et les lois.'};
    const variables=['input','output'].flatMap((quantity,k)=>EDGES.map((edge,i)=>({index:k*12+i,id:`${k===0?'x':'y'}_${edge.id.replace('-','_')}`,branch:edge.id,quantity,label:`${k===0?'x':'y'}${edge.id.replace('-','')} · ${edge.from}→${edge.to}`,lower:0,upper:1})));
    return {
        available:true,type:TYPE,model,variables,variableNames:variables.map(variable=>variable.id),referencePoint,witnessPoint,
        multipliers:{balances:MU.map((value,i)=>({id:String(i+1),symbol:`μ${i+1}`,value})),laws:EDGES.map((edge,i)=>({id:edge.id,symbol:`ν${edge.id.replace('-','')}`,value:NU[i]})),units:'production normalisée par unité de résidu de bilan ou de loi'},
        certificate:makeCertificate(branches,witnessPoint),atReference,atWitness,
        stationarity:{convention:'L + αᵀz + βᵀ(1−z), α≥0, β≥0',lowerMultipliers:Array(24).fill(0),upperMultipliers:Array(24).fill(0),correctedGradient:[...atWitness.gradient],residual:maxAbsolute(atWitness.gradient),complementarityResidual:0},
        explanation:'Les 24 coordonnées du témoin sont strictement entre 0 et 1. Les 24 dérivées libres y sont nulles à l’arrondi près ; aucun multiplicateur de borne n’est nécessaire.',
    };
}

export function evaluateActiveLagrangianPoint(diagnostic,point) {
    if(!diagnostic?.available||diagnostic.type!==TYPE||!isActiveBranchesModel(diagnostic.model))throw new TypeError('Un diagnostic analytique reconnu est requis.');
    return evaluatePoint(ordered(diagnostic.model),point);
}

function axis(center,radius,steps,extra) {
    const low=Math.max(0,center-radius),high=Math.min(1,center+radius);
    return [...new Set([low,high,center,...extra.filter(value=>value>=low&&value<=high),...Array.from({length:steps+1},(_,i)=>low+(high-low)*i/steps)])].sort((a,b)=>a-b);
}
const readable=value=>String(Number(value.toPrecision(12))).replace('.',',');
function gradientFormula(parameters,index,coordinate) {
    const {alpha,beta}=coefficients(parameters),mu=MU[Number(EDGES[index].from)-1],nu=NU[index];
    return `∂L/∂${coordinate}≈${readable(2*nu*parameters.c/parameters.b)}${coordinate}−${readable(mu)} pour ${coordinate}<${readable(parameters.b)} ; ${readable(nu*alpha-mu)}−${readable(2*nu*beta)}${coordinate} pour ${coordinate}>${readable(parameters.b)} ; non définie à la cassure ${readable(parameters.b)}.`;
}

/** Vary two real inputs, leaving the other 22 input/output coordinates fixed. */
export function sampleActiveLagrangianSurface(state,{x='1-2',y='2-3',radius=.08,steps=60}={}) {
    if(!ALLOWED.includes(x)||!ALLOWED.includes(y)||x===y)throw new RangeError('Deux arcs distincts parmi 1-2, 2-3 et 2-8 sont requis.');
    if(!Number.isFinite(radius)||radius<=0||radius>1||!Number.isInteger(steps)||steps<2||steps>60)throw new RangeError('Rayon dans ]0,1] et résolution entière de 2 à 60 requis.');
    const diagnostic=explainActiveLagrangian(state);
    if(!diagnostic.available)throw new TypeError(diagnostic.reason);
    const branches=ordered(diagnostic.model),ix=EDGES.findIndex(edge=>edge.id===x),iy=EDGES.findIndex(edge=>edge.id===y),center=diagnostic.referencePoint;
    const peakX=diagnostic.witnessPoint[ix],peakY=diagnostic.witnessPoint[iy];
    const xs=axis(center[ix],radius,steps,[branches[ix].b,peakX]),ys=axis(center[iy],radius,steps,[branches[iy].b,peakY]);
    const at=(u,v)=>{
        const point=[...center];point[ix]=u;point[iy]=v;
        const result=evaluatePoint(branches,point);
        return {x:u,y:v,z:result.lagrangian,feasible:result.feasible,residual:result.residual,gradient:[result.gradient[ix],result.gradient[iy]],hessian:[[result.hessian[ix][ix],0],[0,result.hessian[iy][iy]]],derivativeSides:[result.derivativeDetails[ix].side,result.derivativeDetails[iy].side]};
    };
    const points=ys.map(v=>xs.map(u=>at(u,v))),reference={...at(center[ix],center[iy]),kind:'reference',label:'Configuration de référence, contraintes vérifiées'};
    const peak={...at(peakX,peakY),inWindow:peakX>=xs[0]&&peakX<=xs.at(-1)&&peakY>=ys[0]&&peakY<=ys.at(-1)};
    peak.attainsGlobalBound=Math.abs(peak.z-UPPER_BOUND)<=TOLERANCE;
    const term=(i,value)=>NU[i]*branchProductionRate(value,branches[i])-MU[Number(EDGES[i].from)-1]*value;
    const constant=diagnostic.atReference.lagrangian-term(ix,center[ix])-term(iy,center[iy]);
    const formulaTerm=(i,coordinate)=>`${readable(NU[i])} g${EDGES[i].id.replace('-','')}(${coordinate})−${readable(MU[Number(EDGES[i].from)-1])}${coordinate}`;
    const zs=points.flat().map(point=>point.z).filter(Number.isFinite);
    return {
        kind:'nlp',xLabel:`x${x.replace('-','')} · Entrée ${x.replace('-','→')}`,yLabel:`x${y.replace('-','')} · Entrée ${y.replace('-','→')}`,zLabel:'L_NLP · Exemple à douze branches actives',
        points,markers:[reference],ranges:{x:[xs[0],xs.at(-1)],y:[ys[0],ys.at(-1)],z:[Math.min(0,...zs),Math.max(1,...zs)]},
        frozen:diagnostic.variables.filter(variable=>variable.index!==ix&&variable.index!==iy).map(variable=>({key:variable.id,value:center[variable.index]})),
        formula:`L(x,y)=${formulaTerm(ix,'x')}+${formulaTerm(iy,'y')}+C ; C≈${readable(constant)}.`,formulaConstant:constant,
        derivativeFormula:{dx:gradientFormula(branches[ix],ix,'x'),dy:gradientFormula(branches[iy],iy,'y')},peak,diagnostic,
        interpretation:'Les 22 autres coordonnées restent figées. Les points hors contraintes sont des valeurs du lagrangien, pas des productions réalisables. Aux extrémités de [0,1], les dérivées sont unilatérales.',
    };
}
