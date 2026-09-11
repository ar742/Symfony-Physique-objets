/** A posteriori nonlinear dual bound from a smooth interior witness, without preset metadata. */
import {BRANCH_GRAPH,evaluateBranches,branchProductionRate} from './branches-engine.mjs';

const EDGES=BRANCH_GRAPH.edges,BOUNDARY=1e-12,STATE_TOLERANCE=1e-10;
const maxAbsolute=values=>Math.max(0,...values.map(Math.abs));
const quadraticPieces=p=>[
    {lower:0,upper:p.a,A:0,B:0},
    {lower:p.a,upper:p.b,A:p.c/(p.b-p.a),B:-p.a*p.c/(p.b-p.a)},
    {lower:p.b,upper:1,A:(p.d-p.c)/(1-p.b),B:p.c-(p.d-p.c)*p.b/(1-p.b)},
];

/** Maximise one weighted branch law on its whole domain, for potentials of either sign. */
export function boundBranchPotential(parameters,{sourcePotential,destinationPotential}) {
    branchProductionRate(0,parameters);
    if(!Number.isFinite(sourcePotential)||!Number.isFinite(destinationPotential))throw new TypeError('Deux potentiels finis sont requis.');
    const pieces=quadraticPieces(parameters).map(piece=>{
        const A=destinationPotential*piece.A,B=destinationPotential*piece.B-sourcePotential;
        const abscissae=[piece.lower,piece.upper];
        if(A<0) {
            const stationary=-B/(2*A);
            if(stationary>piece.lower&&stationary<piece.upper)abscissae.push(stationary);
        }
        const candidates=[...new Set(abscissae)].map(x=>({x,value:destinationPotential*branchProductionRate(x,parameters)-sourcePotential*x,polynomialValue:A*x*x+B*x}));
        return {...piece,weightedA:A,weightedB:B,candidates,maximum:Math.max(...candidates.map(candidate=>candidate.value))};
    });
    const all=pieces.flatMap(piece=>piece.candidates),rawMaximum=Math.max(...all.map(candidate=>candidate.value));
    const magnitude=1+Math.abs(sourcePotential)+Math.abs(destinationPotential)+pieces.reduce((sum,piece)=>sum+Math.abs(piece.weightedA)+Math.abs(piece.weightedB),0);
    const numericalMargin=256*Number.EPSILON*magnitude;
    if(!Number.isFinite(rawMaximum)||!Number.isFinite(numericalMargin))throw new RangeError('Les coefficients ne permettent pas une borne flottante finie.');
    return {sourcePotential,destinationPotential,pieces,rawMaximum,numericalMargin,upperBound:rawMaximum+numericalMargin,maximizers:all.filter(candidate=>candidate.value===rawMaximum).map(candidate=>candidate.x)};
}

function smoothDerivative(x,p) {
    const pieces=quadraticPieces(p);
    for(const knot of [p.a,p.b])if(knot>0&&knot<1&&Math.abs(x-knot)<=BOUNDARY) {
        const index=knot===p.a?0:1,left=2*pieces[index].A*knot+pieces[index].B,right=2*pieces[index+1].A*knot+pieces[index+1].B;
        if(left!==right)return null;
    }
    const piece=x<p.a?pieces[0]:x<p.b?pieces[1]:pieces[2];
    return 2*piece.A*x+piece.B;
}

/** Column-pivoted Householder QR on the explicitly scaled stationarity equations. */
function leastSquares(A,b) {
    const rows=A.length,columns=A[0].length,R=A.map(row=>[...row]),q=[...b],permutation=Array.from({length:columns},(_,i)=>i),diagonal=[];
    const reference=Math.max(...Array.from({length:columns},(_,j)=>Math.hypot(...R.map(row=>row[j]))));
    for(let k=0;k<columns;k++) {
        let selected=k,norm=-1;
        for(let j=k;j<columns;j++) {
            const value=Math.hypot(...R.slice(k).map(row=>row[j]));
            if(value>norm){norm=value;selected=j;}
        }
        if(!(norm>1e-12*reference))return {available:false,reason:'stationarity-rank-deficient',rank:k};
        if(selected!==k){for(const row of R)[row[k],row[selected]]=[row[selected],row[k]];[permutation[k],permutation[selected]]=[permutation[selected],permutation[k]];}
        const vector=R.slice(k).map(row=>row[k]),alpha=vector[0]>=0?-norm:norm;
        vector[0]-=alpha;
        const factor=2/vector.reduce((sum,value)=>sum+value*value,0);
        for(let j=k;j<columns;j++) {
            const dot=vector.reduce((sum,value,i)=>sum+value*R[k+i][j],0);
            vector.forEach((value,i)=>R[k+i][j]-=factor*value*dot);
        }
        const dot=vector.reduce((sum,value,i)=>sum+value*q[k+i],0);
        vector.forEach((value,i)=>q[k+i]-=factor*value*dot);
        R[k][k]=alpha;for(let i=k+1;i<rows;i++)R[i][k]=0;
        diagonal.push(Math.abs(alpha));
    }
    const permuted=Array(columns).fill(0),solution=Array(columns).fill(0);
    for(let i=columns-1;i>=0;i--){let rhs=q[i];for(let j=i+1;j<columns;j++)rhs-=R[i][j]*permuted[j];permuted[i]=rhs/R[i][i];}
    permutation.forEach((original,j)=>solution[original]=permuted[j]);
    if(solution.some(value=>!Number.isFinite(value)))return {available:false,reason:'nonfinite-potentials'};
    return {available:true,solution,rank:columns,columnPermutation:permutation,diagonal,diagonalRatio:Math.max(...diagonal)/Math.min(...diagonal)};
}

function unavailable(reason,detail=null){return {available:false,status:'unavailable',reason,detail};}

/**
 * A small stationarity residual helps find potentials; it is never an optimality proof.
 * Only the global piecewise supremum and its gap to the checked witness can certify.
 */
export function certifySmoothWitness(model,state,{tolerance=1e-7}={}) {
    if(!Number.isFinite(tolerance)||tolerance<=0)throw new RangeError('Une tolérance strictement positive est requise.');
    if(!state?.feasible||!Array.isArray(state.branches))return unavailable('invalid-witness');
    let checked,branches;
    try {
        checked=evaluateBranches(model,state.controls);
        branches=EDGES.map(edge=>model.branches.find(branch=>branch.id===edge.id));
        if(state.branches.length!==12||new Set(state.branches.map(branch=>branch.id)).size!==12)return unavailable('invalid-witness-topology');
        for(let i=0;i<12;i++) {
            const previous=state.branches.find(branch=>branch.id===EDGES[i].id),current=checked.branches[i];
            if(!previous||previous.from!==current.from||previous.to!==current.to||!['a','b','c','d'].every(key=>previous.parameters?.[key]===branches[i][key]))return unavailable('model-witness-mismatch');
            if(!Number.isFinite(previous.input)||!Number.isFinite(previous.output)||Math.abs(previous.input-current.input)>STATE_TOLERANCE||Math.abs(previous.output-current.output)>STATE_TOLERANCE)return unavailable('inconsistent-witness-flows');
        }
        if(!Number.isFinite(state.production)||Math.abs(state.production-checked.production)>STATE_TOLERANCE)return unavailable('inconsistent-witness-production');
    } catch(error) {return unavailable('invalid-model-or-witness',error.message);}
    if(!checked.feasible)return unavailable('infeasible-witness');
    if(checked.branches.some(branch=>[branch.input,branch.output].some(value=>value<=BOUNDARY||value>=1-BOUNDARY)))return unavailable('witness-not-interior');
    const derivatives=checked.branches.map((branch,i)=>smoothDerivative(branch.input,branches[i]));
    if(derivatives.some(value=>value===null||!Number.isFinite(value)))return unavailable('witness-at-kink');
    const A=[],b=[],scales=[];
    for(let i=0;i<12;i++) {
        const row=Array(7).fill(0),source=Number(EDGES[i].from)-1,destination=Number(EDGES[i].to)-1;
        row[source]=1;
        const rhs=destination===7?derivatives[i]:0;
        if(destination!==7)row[destination]-=derivatives[i];
        A.push(row);b.push(rhs);scales.push(Math.max(1,...row.map(Math.abs),Math.abs(rhs)));
    }
    const scaledA=A.map((row,i)=>row.map(value=>value/scales[i])),scaledB=b.map((value,i)=>value/scales[i]);
    const solved=leastSquares(scaledA,scaledB);
    if(!solved.available)return unavailable(solved.reason,solved);
    const potentials=[...solved.solution,1],stationarity=A.map((row,i)=>row.reduce((sum,value,j)=>sum+value*potentials[j],0)-b[i]);
    let terms;
    try {
        terms=branches.map((branch,i)=>({id:branch.id,...boundBranchPotential(branch,{sourcePotential:potentials[Number(branch.from)-1],destinationPotential:potentials[Number(branch.to)-1]})}));
    } catch(error) {return unavailable('nonfinite-dual-bound',error.message);}
    const rawUpperBound=potentials[0]+terms.reduce((sum,term)=>sum+term.rawMaximum,0);
    const summationMargin=256*Number.EPSILON*(1+Math.abs(potentials[0])+terms.reduce((sum,term)=>sum+Math.abs(term.rawMaximum),0));
    const numericalMargin=summationMargin+terms.reduce((sum,term)=>sum+term.numericalMargin,0);
    const dualUpperBound=rawUpperBound+numericalMargin,upperBound=Math.min(1,dualUpperBound),production=checked.production;
    if(!Number.isFinite(dualUpperBound)||upperBound<production)return unavailable('numerical-bound-inconsistent',{production,rawUpperBound,numericalMargin});
    const gap=upperBound-production,witnessL=potentials[0]+checked.branches.reduce((sum,branch)=>sum+potentials[Number(branch.to)-1]*branch.output-potentials[Number(branch.from)-1]*branch.input,0);
    return {
        available:true,status:gap<=tolerance?'certified':'unresolved',production,upperBound,gap,tolerance,potentials,terms,
        residuals:{stationarity:maxAbsolute(stationarity),stationarityVector:stationarity,weightedStationarity:maxAbsolute(stationarity.map((value,i)=>value/scales[i])),lagrangianIdentity:Math.abs(witnessL-production)},
        leastSquares:{method:'column-pivoted-householder-qr',A,b,rowScales:scales,scaledA,scaledB,rank:solved.rank,columnPermutation:solved.columnPermutation,diagonal:solved.diagonal,diagonalRatio:solved.diagonalRatio},
        certificate:{type:'computed-smooth-witness-nlp',constant:potentials[0],rawUpperBound,numericalMargin,dualUpperBound,universalBound:1,upperBound,witnessL,
            expression:'L=μ1+Σ_e[μ_destination g_e(x_e)−μ_source x_e], avec μ8=1',
            method:'Supremum global de chaque quadratique par morceaux : extrémités et point stationnaire intérieur seulement si le coefficient quadratique est négatif.',
            provenance:'Potentiels calculés depuis les dérivées du témoin ; aucun preset, multiplicateur prédéfini ni multiplicateur de PL.',
            arithmetic:'floating-point-with-margins',interpretation:'Le résidu des moindres carrés ne certifie rien seul. Le statut certified signifie que la borne globale numérique est à la tolérance du témoin vérifié.'},
    };
}
