import {createConcordanceScenario,validateConcordanceModel} from './concordance-engine.mjs';

export const CONCORDANCE_RANDOM_ALGORITHM='lcg32-numerical-recipes-v1';
const MODULUS=4294967296;
const nodes=Array.from({length:8},(_,index)=>String(index+1));
const zeroMatrix=()=>Object.fromEntries(nodes.map(to=>[to,Object.fromEntries(nodes.map(from=>[from,0]))]));

/**
 * Deterministic educational PRNG, not a source of independent or secure draws.
 * z[n+1]=(1664525*z[n]+1013904223) modulo 2^32;
 * epsilon=2*z[n+1]/2^32-1, on the uniform discrete grid [-1,1).
 * Visit destination rows 1..8, then source columns 1..8. The diagonal consumes
 * no draw and stays zero. All 56 other entries are retained, including the
 * 44 entries without an arc, which cannot influence this fixed DAG.
 */
export function randomizeConcordance(model,seed) {
    if(!Number.isInteger(seed)||seed<0||seed>=MODULUS)throw new RangeError('La graine doit être un entier entre 0 et 4 294 967 295.');
    const ready=validateConcordanceModel(model),epsilon=zeroMatrix();
    let state=seed;
    for(const to of nodes)for(const from of nodes)if(to!==from) {
        state=(Math.imul(1664525,state)+1013904223)>>>0;
        epsilon[to][from]=2*state/MODULUS-1;
    }
    return {...ready,epsilon,provenance:{kind:'random-matrix',seed,algorithm:CONCORDANCE_RANDOM_ALGORITHM}};
}

/** The signed law yields Y8=-1 for every choice of the five shares. */
export function createNegativeConcordanceScenario() {
    const base=createConcordanceScenario(),epsilon=zeroMatrix();
    epsilon['8']['2']=epsilon['8']['4']=epsilon['8']['6']=-1;
    return {...base,environments:{...base.environments,'8':0},epsilon,
        provenance:{kind:'negative-output-example',version:1}};
}
