import {BRANCH_GRAPH, createBranchesScenario, evaluateBranches, branchProductionRate} from './branches-engine.mjs';
import {createParameterBox, validateParameterBox} from './branches-parameter-envelope.mjs';
import {productionRate} from './production-engine.mjs';
import {element, svgElement, table, renderInspector} from './graph-studies.mjs';

const $ = id => document.getElementById(id);
const keys = ['a','b','c','d'], splits = ['s1','s2','s5','s3','s7'];
const edges = BRANCH_GRAPH.edges;
const names = {initial:'Partages initiaux',grid:'Grille de partages',global:'Global · fonctions fixées',bounded:'Global · paramètres bornés',free:'Construction · paramètres libres'};
const number = value => Number.isFinite(value) ? new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(value) : '—';
const compact = value => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3}).format(value);
const precise = value => String(value).replace('.', ',');
const small = value => Number.isFinite(value) ? value.toExponential(3) : '—';
const clone = value => structuredClone(value);
const arrow = id => id.replace('-', ' → ');
let model, initial, draftLaws, boxes, appliedBoxes = null, results = {}, times = {}, phases = {};
let worker = null, runningKind = null, selected = '1-2', view = 'initial', options = null;
let editingLaw = '1-2', editingBox = '1-2', boundedOptions = null;

function numeric(id) {
    const raw = $(id).value.trim();
    if (raw === '' || !Number.isFinite(Number(raw))) throw new Error('Le champ '+id+' doit contenir un nombre fini.');
    return Number(raw);
}
function budget() {
    const n = numeric('branches-node-budget');
    if (!Number.isSafeInteger(n) || n < 1 || n > 50000) throw new Error('Le budget global doit être un entier entre 1 et 50 000.');
    return n;
}
function clearSvg(svg) { [...svg.children].filter(node=>!['title','desc'].includes(node.localName)).forEach(node=>node.remove()); }
function svgText(svg, x, y, value, attrs={}) { svg.append(svgElement('text',{x,y,class:'production-chart-text',...attrs},value)); }
function lawText(parameters) { return keys.map(key=>key+'='+precise(parameters[key])).join(' ; '); }
function validateLaw(parameters) {
    try { productionRate(0,parameters); }
    catch(error) { throw new Error(error.message.replace('Les productions','Les coefficients de rendement')); }
}
function stateFor(key) { return key === 'initial' ? initial : results[key]?.best; }
function displayed() { return stateFor(view) || initial; }
function updateLawDraft() {
    const branch = draftLaws.find(branch=>branch.id===editingLaw);
    keys.forEach(key=>branch[key]=$('branch-'+key).value === '' ? NaN : Number($('branch-'+key).value));
}
function showLawDraft() {
    const branch = draftLaws.find(branch=>branch.id===editingLaw);
    keys.forEach(key=>$('branch-'+key).value=Number.isFinite(branch[key]) ? String(branch[key]) : '');
}
function updateBoxDraft() {
    boxes[editingBox]=Object.fromEntries(keys.map(key=>[key,['min','max'].map(suffix=>{
        const raw=$('box-'+key+'-'+suffix).value;return raw === '' ? NaN : Number(raw);
    })]));
}
function showBoxDraft() {
    keys.forEach(key=>['min','max'].forEach((suffix,i)=>{
        const value=boxes[editingBox][key][i];$('box-'+key+'-'+suffix).value=Number.isFinite(value) ? String(value) : '';
    }));
}
function enableActions(busy) {
    $('branches-compare').disabled=busy;$('branches-design-run').disabled=busy;
    $('branches-cancel').hidden=!busy;
}
function stop(message, incomplete=false) {
    if (worker) {worker.terminate();worker=null;}
    if (incomplete && runningKind && results[runningKind] && phases[runningKind] === 'running') {
        phases[runningKind]='stopped';
        results[runningKind]={...results[runningKind],status:'cancelled'};
    }
    runningKind=null;enableActions(false);
    if(message)$('branches-status').textContent=message;
}
function resetResults() {
    results={};times={};phases={};appliedBoxes=null;boundedOptions=null;view='initial';$('branches-view').value=view;
    [...$('branches-view').options].forEach(option=>option.disabled=option.value!=='initial');
}
function load(preset='default') {
    stop();model=createBranchesScenario();
    if(preset==='between')model.branches.forEach(branch=>branch.b=.83);
    initial=evaluateBranches(model,model.initialControls);
    draftLaws=clone(model.branches);boxes=Object.fromEntries(edges.map(edge=>[edge.id,createParameterBox()]));
    editingLaw=editingBox='1-2';$('branch-choice').value=editingLaw;$('branches-box-choice').value=editingBox;
    showLawDraft();showBoxDraft();splits.forEach(key=>$('branch-'+key).value='.5');
    $('branches-divisions').value='10';$('branches-grid-budget').value='200000';$('branches-node-budget').value='10000';
    options=null;resetResults();$('branches-error').textContent='';$('branches-design-error').textContent='';
    $('branches-status').textContent=preset==='between'?'Exemple b=0,83 chargé sur les douze branches. Lancez la comparaison avec la grille au pas 0,1.':'Douze lois proposées et partages à 0,5 chargés. Lancez la comparaison.';
    $('branches-design-status').textContent='Plages proposées : a [0,2 ; 0,4], b [0,7 ; 0,9], c [0,8 ; 1], d [0,5 ; 0,7].';
    renderResults();renderState();
}
function start(mode) {
    const errorId=mode==='fixed'?'branches-error':'branches-design-error';
    try {
        const maxNodes=budget();
        if(mode==='fixed') {
            updateLawDraft();
            const next={source:1,branches:clone(draftLaws),initialControls:Object.fromEntries(splits.map(key=>[key,numeric('branch-'+key)]))};
            next.branches.forEach(branch=>{try{validateLaw(branch);}catch(error){throw new Error('Branche '+arrow(branch.id)+' : '+error.message);}});
            const nextInitial=evaluateBranches(next,next.initialControls);
            if(!nextInitial.feasible)throw new Error('Partages initiaux incompatibles : '+nextInitial.reason);
            const nextOptions={grid:{divisions:numeric('branches-divisions'),maxEvaluations:numeric('branches-grid-budget')},global:{maxNodes,tolerance:1e-7}};
            stop();model=next;initial=nextInitial;options=nextOptions;resetResults();
            $('branches-design-status').textContent='Les paramètres fixés ont changé ; relancez le calcul borné pour afficher une nouvelle comparaison.';
        } else {
            updateBoxDraft();
            const ready=Object.fromEntries(edges.map(edge=>{
                try{return[edge.id,validateParameterBox(boxes[edge.id])];}catch(error){throw new Error('Branche '+arrow(edge.id)+' : '+error.message);}
            }));
            stop();appliedBoxes=clone(ready);boundedOptions={maxNodes,tolerance:1e-7};results.bounded=null;phases.bounded='running';
            if(view==='bounded'){view='initial';$('branches-view').value=view;}
            $('branches-view').querySelector('[value="bounded"]').disabled=true;
        }
        $(errorId).textContent='';enableActions(true);runningKind=mode==='fixed'?'grid':'bounded';phases[runningKind]='running';
        $('branches-status').textContent=mode==='fixed'?'Exploration de la grille, puis recherche globale continue…':'Recherche globale des partages et des paramètres dans les plages appliquées…';
        if(mode==='bounded')$('branches-design-status').textContent='Plages appliquées aux douze branches. Calcul global en cours…';
        renderResults();renderState();
        const running=new Worker(new URL('./branch-study-worker.mjs',import.meta.url),{type:'module'});worker=running;
        running.onmessage=({data})=>{
            if(worker!==running)return;
            if(data.kind==='error') {
                stop('Calcul interrompu ; les résultats partiels restent identifiés.',true);$(errorId).textContent=data.message;renderResults();return;
            }
            if(data.kind==='done') {
                stop('Calcul terminé. Examinez les configurations, les bornes et les éventuels budgets atteints.');
                if(mode==='bounded')$('branches-design-status').textContent='Calcul terminé pour les plages appliquées ; le résultat et sa borne figurent dans le tableau.';
                renderResults();return;
            }
            const key=data.kind;results[key]=data.result;times[key]=data.milliseconds;phases[key]=data.partial?'running':'done';runningKind=key;
            $('branches-view').querySelector('[value="'+key+'"]').disabled=!data.result.best;
            $('branches-status').textContent=key==='grid'
                ? 'Grille : '+number(data.result.evaluated)+' / '+number(data.result.total)+' configurations testées.'
                : names[key]+' : '+number(data.result.processedNodes)+' sous-problèmes ; meilleure production '+number(data.result.best?.production)+' ; borne '+number(data.result.upperBound)+'.';
            renderResults();if(view===key)renderState();
        };
        running.onerror=()=>{
            if(worker!==running)return;stop('Le calcul n’a pas abouti.',true);$(errorId).textContent='Le moteur de calcul n’a pas pu terminer. Rechargez la page puis réessayez.';renderResults();
        };
        running.postMessage({mode,model,parameterBoxes:mode==='bounded'?appliedBoxes:undefined,
            options:mode==='fixed'?options:{global:boundedOptions}});
    } catch(error) {$(errorId).textContent='Réglages non appliqués : '+error.message;}
}
function freeConstruction() {
    const free=createBranchesScenario();
    free.branches.forEach(branch=>Object.assign(branch,{a:.3,b:.5,c:1,d:1}));
    Object.assign(free.initialControls,{s1:1,s2:0});
    const best=evaluateBranches(free,free.initialControls);
    if(!best.feasible || Math.abs(best.production-1)>1e-12)throw new Error('La construction libre doit atteindre r=1.');
    results.free={best,upperBound:1,gap:0,status:'constructed',complete:true};phases.free='done';
    $('branches-view').querySelector('[value="free"]').disabled=false;
    setView('free');renderResults();
    $('branches-design-status').textContent='Construction libre affichée : r=1, soit 100 %, atteint la borne de conservation par le trajet 1→2→8 sans perte. Les plages préparées sont conservées.';
    $('branches-results-heading').scrollIntoView({block:'start'});
}
function residual(state) {
    if(!state?.feasible)return NaN;
    let value=0;
    for(const branch of state.branches)value=Math.max(value,Math.abs(branchProductionRate(branch.input,branch.parameters)-branch.output),-branch.input,branch.input-1,-branch.output,branch.output-branch.input);
    value=Math.max(value,state.production-1,Math.abs(1-state.production-state.branches.reduce((sum,branch)=>sum+branch.input-branch.output,0)));
    for(const node of BRANCH_GRAPH.nodes) {
        const incoming=node.id==='1'?1:state.branches.filter(edge=>edge.to===node.id).reduce((sum,edge)=>sum+edge.output,0);
        const outgoing=node.id==='8'?state.production:state.branches.filter(edge=>edge.from===node.id).reduce((sum,edge)=>sum+edge.input,0);
        value=Math.max(value,Math.abs(incoming-outgoing));
    }
    return value;
}
function setView(key) {if(!stateFor(key))return;view=key;$('branches-view').value=key;renderState();}
function describeResult(key,result) {
    if(!result)return 'Non calculé';
    if(key==='free')return 'Borne atteinte par construction';
    if(phases[key]==='running')return 'En cours · résultat partiel';
    if(phases[key]==='stopped')return 'Arrêt demandé · résultat partiel';
    if(key==='grid')return result.complete?'Grille entièrement explorée':'Budget atteint · grille partielle';
    return result.status==='certified'?'Optimum numérique à 10⁻⁷':result.status==='uncertain'?'Régions numériquement non résolues':'Budget atteint · optimum non établi';
}
function renderResults() {
    const result=table(['Étude / méthode','Rendement global r','Borne supérieure','Écart à la borne','Portée','Examiner'],'Fonctions fixées : grille et global comparables. Paramètres bornés ou libres : domaines de conception différents.');
    for(const key of Object.keys(names)) {
        const state=stateFor(key),record=results[key];
        const bound=['initial','grid'].includes(key)?results.global?.upperBound:record?.upperBound;
        const tr=element('tr');tr.append(element('th',names[key]),element('td',number(state?.production)),element('td',number(bound)),element('td',state&&Number.isFinite(bound)?small(Math.max(0,bound-state.production)):'—'),element('td',key==='initial'?'Configuration compatible, sans optimalité':describeResult(key,record)));
        const cell=element('td');if(state){const button=element('button','Voir cet état');button.type='button';button.setAttribute('aria-label','Afficher '+names[key]);button.addEventListener('click',()=>{setView(key);$('branches-map').scrollIntoView({block:'start'});});cell.append(button);}else cell.textContent='—';tr.append(cell);result.body.append(tr);
    }
    const zone=$('branches-results');zone.replaceChildren(result.wrap);
    if(results.grid)zone.append(element('p','Grille : '+number(results.grid.evaluated)+' / '+number(results.grid.total)+' configurations testées, dont '+number(results.grid.feasibleCount)+' compatibles. '+(results.grid.complete?'Le maximum est établi sur cette grille finie.':'La partie non visitée ne permet aucune conclusion de maximum de grille.')));
    const certificate=$('branches-certificates');certificate.replaceChildren();
    for(const key of ['grid','global','bounded'])if(results[key]) {
        const r=results[key];
        certificate.append(element('p',names[key]+' : '+describeResult(key,r)+'. Durée indicative '+number(times[key]/1000)+' s. '+(key==='grid'?'Pas '+number(1/r.divisions)+'.':number(r.processedNodes)+' sous-problèmes résolus ; '+number(r.openNodes)+' régions ouvertes ou non résolues. Borne '+number(r.upperBound)+' ; écart '+small(r.gap)+'.')));
        if(r.certificates) {
            certificate.append(element('p','Certificats numériques : '+number(r.certificates.records.length)+' programmes linéaires enregistrés ; '+number(r.certificates.unresolved)+' régions non résolues. L’export contient les multiplicateurs, les intervalles et les marges.'));
            if(Number.isFinite(r.certificates.sourceBound))certificate.append(element('p','Borne après le partage de la source : '+number(r.certificates.sourceBound)+'. Elle maximise la somme des deux productions de départ sur tous les partages. Les branches suivantes ne peuvent augmenter ce total. Si une configuration atteint déjà cette borne, aucun programme linéaire supplémentaire n’est nécessaire.'));
        }
    }
    certificate.append(element('p','Les durées dépendent du navigateur et des réglages. Une région ouverte peut déjà être dominée par la meilleure solution ; sa borne reste prise en compte. Les états affichés sont recalculés avec leurs fonctions complètes.'));
    if(appliedBoxes) {
        const bounds=table(['Branche','a min / max','b min / max','c min / max','d min / max'],'Plages effectivement appliquées au calcul borné');
        edges.forEach(edge=>{const tr=element('tr');tr.append(element('th',arrow(edge.id)));keys.forEach(key=>tr.append(element('td',appliedBoxes[edge.id][key].map(precise).join(' / '))));bounds.body.append(tr);});certificate.append(bounds.wrap);
    }
}
function renderState() {
    const state=displayed();
    $('branches-commands').textContent=names[view]+' · Source=1 ; rendement r='+number(state.production)+' ('+number(100*state.production)+' %) ; pertes totales 1−r='+number(1-state.production)+' ; '+splits.map(key=>key+'='+precise(state.controls[key])).join(' ; ')+'. Écart maximal des bilans et lois : '+small(residual(state))+'.';
    const balances=table(['Nœud','Somme disponible','Total réparti / collecté','Rôle'],'Sommes aux nœuds : aucun traitement f au nœud');
    BRANCH_GRAPH.nodes.forEach(node=>{
        const outgoing=state.branches.filter(edge=>edge.from===node.id).reduce((sum,edge)=>sum+edge.input,0);
        const tr=element('tr');tr.append(element('th',node.id),element('td',number(state.available[node.id])),element('td',number(node.id==='8'?state.production:outgoing)),element('td',node.id==='1'?'Source fixée':node.id==='8'?'Résultat r':'Somme puis partage intégral'));balances.body.append(tr);
    });$('branches-balances').replaceChildren(balances.wrap);
    const flows=table(['Branche','Part reçue de la somme','Exp. IN x','Coefficient f(x)','Exp. OUT x f(x)','Perte x−y','a','b','c','d'],'Configuration affichée : flux, coefficients de rendement et paramètres effectifs');
    state.branches.forEach(branch=>{
        const tr=element('tr'),th=element('th'),link=element('a',arrow(branch.id));link.href='#reseau-'+branch.id+'-1b';th.append(link);tr.append(th,element('td',number(branch.fraction)),element('td',number(branch.input)),element('td',number(productionRate(branch.input,branch.parameters))),element('td',number(branch.output)),element('td',number(branch.input-branch.output)));
        keys.forEach(key=>tr.append(element('td',precise(branch.parameters[key]))));flows.body.append(tr);
    });$('branches-flows').replaceChildren(flows.wrap);
    drawMap(state);drawCurve(state);inspect(state);
}
const positions={'1':[380,65],'2':[150,250],'5':[620,250],'3':[285,470],'7':[620,470],'4':[205,700],'6':[560,700],'8':[380,900]};
const labels={'1-2':[245,150],'1-5':[535,150],'2-3':[165,378],'2-8':[100,550],'5-3':[398,337],'5-7':[688,367],'7-6':[652,607],'7-4':[409,624],'3-4':[193,598],'3-6':[425,548],'4-8':[260,822],'6-8':[536,823]};
function drawMap(state) {
    const svg=$('branches-map');clearSvg(svg);
    const defs=svgElement('defs'),marker=svgElement('marker',{id:'branches-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
    marker.append(svgElement('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'context-stroke'}));defs.append(marker);svg.append(defs);
    for(const branch of state.branches) {
        const [ax,ay]=positions[branch.from],[bx,by]=positions[branch.to],len=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/len,uy=(by-ay)/len;
        let path='M '+(ax+ux*47)+' '+(ay+uy*47)+' L '+(bx-ux*49)+' '+(by-uy*49);
        if(branch.id==='2-8')path='M 108 267 Q 34 320 34 485 L 34 775 Q 34 900 330 900';
        if(branch.id==='7-4')path='M 588 504 Q 466 705 252 700';
        const link=svgElement('a',{href:'#reseau-'+branch.id+'-1b',class:'branch-arc','data-edge':branch.id,'aria-label':'Analyser '+arrow(branch.id)+' : entrée '+number(branch.input)+', sortie '+number(branch.output)});
        if(branch.id===selected){link.setAttribute('data-selected','');link.setAttribute('aria-current','true');}
        link.append(svgElement('title',{},arrow(branch.id)+' · x='+number(branch.input)+' × f(x)='+number(productionRate(branch.input,branch.parameters))+' → y='+number(branch.output)+' · '+lawText(branch.parameters)),svgElement('path',{d:path,class:'branch-hit'}),svgElement('path',{d:path,class:'branch-line','marker-end':'url(#branches-arrow)'}));
        const [x,y]=labels[branch.id];link.append(svgElement('text',{x,y,class:'branch-label'},branch.id+' : '+compact(branch.output)));svg.append(link);
    }
    BRANCH_GRAPH.nodes.forEach(node=>{
        const [x,y]=positions[node.id],group=svgElement('g',{class:'branch-junction'});if(node.id==='8')group.setAttribute('data-final','');
        group.append(svgElement('title',{},'Nœud '+node.id+' · '+(node.id==='8'?'r':'Somme disponible')+'='+number(state.available[node.id])),svgElement('circle',{cx:x,cy:y,r:44}),svgElement('text',{x,y:y-6},node.id),svgElement('text',{x,y:y+19,class:'branch-total'},(node.id==='8'?'r=':'Σ=')+compact(state.available[node.id])));svg.append(group);
    });
    $('branches-map-caption').textContent=names[view]+' · Chaque flèche affiche son identifiant et sa sortie x f(x). Chaque disque affiche une somme. Les croisements sans disque ne sont pas des raccords. Cliquer sur une flèche ouvre Exp.–TH–Exp.';
}
function drawCurve(state) {
    const branch=state.branches.find(edge=>edge.id===selected),p=branch.parameters,svg=$('branches-curve');clearSvg(svg);
    const x=v=>65+485*v,y=v=>255-220*v;
    [0,.5,1].forEach(value=>{svg.append(svgElement('line',{x1:x(0),y1:y(value),x2:x(1),y2:y(value),class:'production-chart-grid'}));svgText(svg,50,y(value)+5,number(value),{'text-anchor':'end'});svgText(svg,x(value),280,number(value),{'text-anchor':'middle'});});
    const samples=[...new Set([...Array.from({length:101},(_,i)=>i/100),p.a,p.b])].sort((a,b)=>a-b);
    svg.append(svgElement('line',{x1:x(0),y1:y(0),x2:x(1),y2:y(1),class:'branch-identity'}),svgElement('polyline',{points:[[0,0],[p.a,0],[p.b,p.c],[1,p.d]].map(([u,v])=>x(u)+','+y(v)).join(' '),class:'branch-coefficient-line'}),svgElement('polyline',{points:samples.map(u=>x(u)+','+y(branchProductionRate(u,p))).join(' '),class:'production-curve-line'}),svgElement('circle',{cx:x(branch.input),cy:y(branch.output),r:7,class:'production-operating'}));
    svgText(svg,65,22,arrow(selected)+' · Coefficient f et sortie x f(x)');svgText(svg,550,309,'Entrée allouée x',{'text-anchor':'end'});
    $('branches-curve-caption').textContent=names[view]+' · Trait bleu : sortie y=x f(x) ; vert pointillé : coefficient f(x) ; diagonale : y=x sans perte. Point orange : x='+number(branch.input)+', f(x)='+number(productionRate(branch.input,p))+', y='+number(branch.output)+'. '+lawText(p)+'.';
}
function inspect(state) {
    const branch=state.branches.find(edge=>edge.id===selected),p=branch.parameters;
    const incoming=state.branches.filter(edge=>edge.to===branch.from),next=state.branches.filter(edge=>edge.from===branch.to);
    const supply=branch.from==='1'?'Le nœud 1 reçoit exactement 1 de l’extérieur.':incoming.map(edge=>arrow(edge.id)+' fournit '+number(edge.output)).join(' ; ')+'.';
    const region=branch.input<=p.a?'plateau nul':branch.input<=p.b?'portion croissante':'dernière portion affine';
    renderInspector({edge:arrow(selected),variant:'1b',anchorPrefix:'reseau-'+selected+'-1b',title:arrow(selected)+' · Une transformation de branche',
        summary:names[view]+' · Exp. IN : alimentation allouée ; TH : fonction propre à cette branche ; Exp. OUT : production contribuée au nœud suivant. La normalisation commune ne confond pas alimentation et production.',
        points:[
            {title:'Allouer une part de la somme',tip:'Les productions reçues s’additionnent au nœud de départ ; cette branche reçoit sa part.',paragraphs:[supply,'Somme disponible en '+branch.from+' : '+number(state.available[branch.from])+'. Fraction allouée : '+precise(branch.fraction)+'. Entrée de la branche : x='+number(branch.input)+', dans [0,1].','Topologie, conversions égales à 1 et paramètres sont supposés ; les flux sont calculés. Le modèle n’introduit ni stock ni délai.']},
            {title:'Multiplier par son rendement f',tip:'La branche produit x f(x). Le coefficient est porté par la liaison '+arrow(selected)+'.',paragraphs:['Paramètres effectifs du coefficient : '+lawText(p)+'.','Coefficient f nul jusqu’à a ; c(x−a)/(b−a) jusqu’à b ; c+(d−c)(x−b)/(1−b) ensuite. L’entrée '+number(branch.input)+' se situe dans le régime « '+region+' » du coefficient.','On calcule f(x)='+number(productionRate(branch.input,p))+' puis y=x f(x)='+number(branch.output)+'. Les paramètres des autres branches peuvent différer ; les bilans les relient. La production est quadratique par morceaux, même si f est affine par morceaux.']},
            {title:'Transmettre la production utile',tip:branch.to==='8'?'La sortie contribue directement au rendement global r.':'La sortie s’ajoute aux autres arrivées puis la somme est partagée.',paragraphs:['La branche fournit y='+number(branch.output)+' au nœud '+branch.to+'. Sa perte vaut x−y='+number(branch.input-branch.output)+'.',branch.to==='8'?'Cette contribution s’additionne aux deux autres arrivées : r='+number(state.production)+', pour une source égale à 1.':'La somme disponible en '+branch.to+' vaut '+number(state.available[branch.to])+', puis est entièrement allouée à '+next.map(edge=>arrow(edge.id)).join(' et ')+'.','Les pertes sont exactement celles des coefficients : Σ(x−y)=1−r. Aucun flux n’est dupliqué. La cohérence de cette configuration ne prouve pas son optimalité ; consulter la borne.']}
        ],assessment:'Contrôle interne des bilans, lois et bornes : résidu maximal '+small(residual(state))+'. Il ne s’agit pas d’une confrontation à des mesures indépendantes.'});
    const links=element('p',undefined,'production-inspector-links');
    incoming.forEach(edge=>{const a=element('a','Amont '+arrow(edge.id)+' / 3.0');a.href='#reseau-'+edge.id+'-1b-3.0';links.append(a);});
    next.forEach(edge=>{const a=element('a','Aval '+arrow(edge.id)+' / 1.0');a.href='#reseau-'+edge.id+'-1b-1.0';links.append(a);});
    const old=$('branches-inspector').querySelector('.production-inspector-links');if(old)old.replaceWith(links);else $('branches-inspector').append(links);
}
function restore(scroll) {
    const match=/^#reseau-([1-8]-[1-8])-1b(?:-([1-3])\.0)?$/.exec(location.hash);
    if(!match || !edges.some(edge=>edge.id===match[1]))return;
    selected=match[1];$('branches-inspect').value=selected;renderState();
    if(scroll)requestAnimationFrame(()=>{const target=match[2]?$(location.hash.slice(1)):$('branches-inspector');target.scrollIntoView({block:'start'});if(match[2])target.focus({preventScroll:true});else{$('inspector-title').tabIndex=-1;$('inspector-title').focus({preventScroll:true});}});
}
try {
    $('branches-controls').addEventListener('submit',event=>{event.preventDefault();start('fixed');});
    $('branches-design').addEventListener('submit',event=>{event.preventDefault();start('bounded');});
    $('branch-choice').addEventListener('change',()=>{updateLawDraft();editingLaw=$('branch-choice').value;showLawDraft();});
    $('branches-box-choice').addEventListener('change',()=>{updateBoxDraft();editingBox=$('branches-box-choice').value;showBoxDraft();});
    $('branches-copy-law').addEventListener('click',()=>{try{updateLawDraft();const branch=draftLaws.find(edge=>edge.id===editingLaw);validateLaw(branch);const p=Object.fromEntries(keys.map(key=>[key,branch[key]]));draftLaws=draftLaws.map(edge=>({...edge,...p}));$('branches-error').textContent='';$('branches-status').textContent='Loi copiée dans les douze réglages préparés. Cliquez sur « Appliquer et comparer ».';}catch(error){$('branches-error').textContent=error.message;}});
    $('branches-copy-box').addEventListener('click',()=>{try{updateBoxDraft();const box=validateParameterBox(boxes[editingBox]);boxes=Object.fromEntries(edges.map(edge=>[edge.id,clone(box)]));$('branches-design-error').textContent='';$('branches-design-status').textContent='Plages copiées dans les douze réglages préparés. Lancez le calcul borné pour les appliquer.';}catch(error){$('branches-design-error').textContent=error.message;}});
    $('branches-cancel').addEventListener('click',()=>{stop('Calcul arrêté. Les résultats partiels reçus restent affichés ; relancez pour poursuivre une nouvelle recherche.',true);renderResults();});
    $('branches-reset').addEventListener('click',()=>load());$('branches-between').addEventListener('click',()=>load('between'));$('branches-free').addEventListener('click',freeConstruction);
    $('branches-view').addEventListener('change',()=>setView($('branches-view').value));
    $('branches-inspect').addEventListener('change',()=>{selected=$('branches-inspect').value;history.replaceState(null,'','#reseau-'+selected+'-1b');renderState();});
    $('branches-export').addEventListener('click',()=>{
        const record={model,initial,branchLaw:'y = x * f(x)',objective:'global yield r; source=1; r<=1',options:{fixed:options,bounded:boundedOptions},parameterBoxes:appliedBoxes,results,timesMilliseconds:times,phases,displayedView:view,displayedBranch:selected,units:'flux normalisés et coefficients de rendement, données fictives',tolerance:1e-7};
        const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const link=element('a');link.href=url;link.download='reseau-douze-branches.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    window.addEventListener('hashchange',()=>restore(true));window.addEventListener('pagehide',()=>stop());
    document.addEventListener('click',event=>{const link=event.target.closest?.('a[href^="#reseau-"]');if(link&&link.getAttribute('href')===location.hash){event.preventDefault();restore(true);}});
    load();restore(Boolean(location.hash));
} catch(error) {stop('L’atelier n’a pas pu démarrer.');$('branches-error').textContent=error.message;}
