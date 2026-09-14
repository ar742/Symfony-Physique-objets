import {createConcordanceScenario,evaluateConcordance,explainConcordanceLagrangian} from './concordance-engine.mjs';
import {sampleConcordanceSurface,CONCORDANCE_SPLITS} from './concordance-surfaces.mjs';
import {randomizeConcordance,createNegativeConcordanceScenario} from './concordance-scenarios.mjs';
import {CONCORDANCE_SAMPLE_RESULTS} from './concordance-sample-results.mjs';
import {element,svgElement,table,renderInspector} from './graph-studies.mjs';

const $=id=>document.getElementById(id);
const edges=[[1,2],[1,5],[2,3],[2,8],[5,3],[5,7],[7,6],[7,4],[3,4],[3,6],[4,8],[6,8]].map(([from,to])=>({id:`${from}-${to}`,from:String(from),to:String(to)}));
const ids=Array.from({length:8},(_,i)=>String(i+1));
let options={objective:'output',domain:'rectified'};
const signed=()=>options.domain==='signed';
const law=()=>signed()?'XᵢCᵢ':'max(0, XᵢCᵢ)';
const names={initial:'Configuration initiale',grid:'Grille finie',local:'Petites variations',global:'Recherche globale'};
const num=value=>Number.isFinite(value)?new Intl.NumberFormat('fr-FR',{maximumSignificantDigits:9}).format(Object.is(value,-0)?0:value):'—';
const compact=value=>Number.isFinite(value)?new Intl.NumberFormat('fr-FR',{maximumSignificantDigits:4}).format(value):'—';
const scientific=value=>Number.isFinite(value)?value.toExponential(3):'—';
let model,initial,results={},times={},surface=null,worker=null,phase=null,view='initial',selected='2',settings=null;
const state=()=>view==='initial'?initial:results[view]?.best??initial;
const clear=svg=>[...svg.children].filter(n=>!['title','desc'].includes(n.localName)).forEach(n=>n.remove());
const text=(svg,x,y,label,attrs={})=>svg.append(svgElement('text',{x,y,class:'production-chart-text',...attrs},label));
function numberInput(id,min,max,integer=false) {
    const raw=$(id).value.trim(),value=Number(raw);
    if(raw===''||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value))) throw new RangeError(`${$(id).labels?.[0]?.textContent??id} : saisir ${integer?'un entier':'une valeur'} entre ${min} et ${max}.`);
    return value;
}
function stop(message) {
    if(worker){worker.terminate();worker=null;}
    if(phase&&results[phase]?.partial)results[phase]={...results[phase],status:'cancelled',complete:false,partial:false};
    phase=null;$('concordance-compare').disabled=false;$('concordance-cancel').hidden=true;
    if(message)$('concordance-status').textContent=message;
}
function resetResults(){results={};times={};view='initial';$('concordance-view').value=view;}
function showDraft() {
    $('concordance-domain').value=options.domain;
    ids.filter(id=>id!=='1').forEach(id=>$('concordance-env-'+id).value=model.environments[id]);
    edges.forEach(e=>$('concordance-epsilon-'+e.id).value=model.epsilon[e.to]?.[e.from]??0);
    CONCORDANCE_SPLITS.forEach(key=>$('concordance-'+key).value=model.initialControls[key]);
}
function apply() {
    try {
        const next=structuredClone(model);
        next.environments=Object.fromEntries(ids.filter(id=>id!=='1').map(id=>[id,numberInput('concordance-env-'+id,0,1)]));
        next.epsilon=Object.fromEntries(ids.map(id=>[id,{...model.epsilon[id]}]));
        edges.forEach(e=>next.epsilon[e.to][e.from]=numberInput('concordance-epsilon-'+e.id,-1,1));
        next.initialControls=Object.fromEntries(CONCORDANCE_SPLITS.map(key=>[key,numberInput('concordance-'+key,0,1)]));
        if(next.provenance&&edges.some(e=>next.epsilon[e.to][e.from]!==model.epsilon[e.to]?.[e.from]))next.provenance={...next.provenance,manuallyModified:true};
        const nextOptions={objective:'output',domain:$('concordance-domain').value};
        const result=evaluateConcordance(next,next.initialControls,nextOptions);
        if(!result.feasible)throw new Error(result.reason);
        stop();model=next;options=nextOptions;initial=result;resetResults();$('concordance-error').textContent='';
        $('concordance-status').textContent='Configuration appliquée. Les valeurs affichées proviennent des sept transformations nodales.';
        render();return true;
    }catch(error){$('concordance-error').textContent=error.message;return false;}
}
function load() {
    stop();options={objective:'output',domain:'rectified'};model=createConcordanceScenario();showDraft();initial=evaluateConcordance(model,model.initialControls,options);
    resetResults();$('concordance-error').textContent='';$('concordance-status').textContent='Exemple pédagogique chargé. La comparaison numérique se lance avec le bouton ci-dessous.';
    render();
}
function loadModel(next,domain,message) {
    stop();model=next;options={objective:'output',domain};showDraft();initial=evaluateConcordance(model,model.initialControls,options);
    resetResults();$('concordance-error').textContent='';$('concordance-status').textContent=message;render();
}
function randomize() {
    try {
        const seed=numberInput('concordance-seed',0,4294967295,true);
        if(!apply())return;
        loadModel(randomizeConcordance(model,seed),options.domain,'Matrice tirée et appliquée. La graine et le modèle complet sont conservés dans l’export.');
    }catch(error){$('concordance-error').textContent=error.message;}
}
function compare() {
    if(!apply())return;
    try {
        settings={divisions:numberInput('concordance-grid-divisions',1,20,true),maxNodes:numberInput('concordance-budget',1,30000,true)};
        worker=new Worker(new URL('./concordance-worker.mjs?v=20260914-signed',import.meta.url),{type:'module'});
        $('concordance-compare').disabled=true;$('concordance-cancel').hidden=false;
        worker.onmessage=({data})=>{
            if(data.kind==='phase'){phase=data.phase;$('concordance-status').textContent='Calcul en cours : '+names[phase]+'.';return;}
            if(data.kind==='error'){stop('Calcul interrompu.');$('concordance-error').textContent=data.message;return;}
            if(data.kind==='done'){
                stop('Comparaison terminée. Les statuts distinguent une exploration finie, un résultat local et une borne globale.');
                view=results.global?.best?'global':results.local?.best?'local':'grid';$('concordance-view').value=view;render();return;
            }
            results[data.kind]={...data.result,partial:data.partial};times[data.kind]=data.milliseconds;
            renderResults();
        };
        worker.onerror=event=>{stop('Le calcul a rencontré une erreur.');$('concordance-error').textContent=event.message;};
        worker.postMessage({model,settings,options});
    }catch(error){stop();$('concordance-error').textContent=error.message;}
}
function addRow(body,values){const row=element('tr');values.forEach((v,i)=>row.append(element(i===0?'th':'td',String(v))));body.append(row);}
function renderStudies() {
    const study=CONCORDANCE_SAMPLE_RESULTS;
    const t=table(['Graine','Loi','Sortie au départ','Meilleure sortie trouvée','Borne supérieure','Écart restant','Conclusion'],'Trois tirages étudiés à environnements 0,5 ; objectif Y₈ après TH₈');
    const actions=element('div',undefined,'optimization-actions');
    const details=element('details');details.append(element('summary','Lire les fractions obtenues et les budgets des études'));
    const configurations=table(['Graine · loi','Méthode du meilleur témoin',...CONCORDANCE_SPLITS,'Nœuds à sortie négative'],'Configurations réalisables retenues ; bornes et budgets distincts');
    for(const item of study.cases)for(const domain of ['rectified','signed']) {
        const run=item.modes[domain],label=domain==='signed'?'Signée':'Mise à zéro';
        addRow(t.body,[item.seed,label,num(run.initial.objective),num(run.bestObtained.objective),num(run.global.upperBound),scientific(run.gapToBestObtained),run.global.status==='certified'?'Borne fermée à la tolérance':'Maximum global non certifié']);
        addRow(configurations.body,[item.seed+' · '+label,names[run.bestObtained.method],...CONCORDANCE_SPLITS.map(key=>num(run.bestObtained.controls[key])),run.bestObtained.negativeOutputNodes.join(', ')||'Aucun']);
        const button=element('button',`Charger la graine ${item.seed} · ${label.toLowerCase()}`);button.type='button';
        button.addEventListener('click',()=>{
            const base=createConcordanceScenario();base.environments={...study.model.environments};base.initialControls={...study.model.initialControls};
            $('concordance-seed').value=item.seed;
            loadModel(randomizeConcordance(base,item.seed),domain,`Étude de la graine ${item.seed} chargée au départ. Lancer la comparaison pour recalculer les recherches et explorer leurs configurations.`);
            $('concordance-parameters-title').scrollIntoView({block:'start'});
        });actions.append(button);
    }
    details.append(configurations.wrap,element('p',`Grille : ${study.settings.grid.divisions} divisions par axe, au plus ${study.settings.grid.maxEvaluations} évaluations. Recherche locale : pas ${study.settings.local.initialStep} jusqu’à ${study.settings.local.minStep}, au plus ${study.settings.local.maxEvaluations} évaluations. Recherche globale : au plus ${study.settings.global.maxNodes} subdivisions, tolérance absolue ${study.settings.global.tolerance}.`));
    $('concordance-random-studies').replaceChildren(t.wrap,element('p','Valeurs calculées et conservées avec leurs paramètres, fractions obtenues et budgets. Le meilleur témoin est choisi parmi grille, recherche locale et recherche globale ; une borne encore ouverte ne permet pas de conclure au maximum exact. Charger un tirage remet ses fractions au départ pour refaire l’étude.','small-note'),...study.cases.map(item=>element('p',`Graine ${item.seed} : ${item.interpretation}`)),details,actions);
}
function renderResults() {
    [...$('concordance-view').options].forEach(option=>option.disabled=option.value!=='initial'&&!results[option.value]?.best);
    const t=table(['Méthode','Sortie finale Y₈','Borne supérieure','Écart à la borne','Travail effectué','État'],'Même objectif après TH₈, mêmes environnements et concordances');
    addRow(t.body,[names.initial,num(initial.objective),'—','—','Une propagation','Point de départ']);
    for(const kind of ['grid','local','global']) {
        const r=results[kind];if(!r)continue;
        const status=r.partial?'En cours':r.status==='certified'?'Certifié à la tolérance numérique':kind==='grid'?(r.complete?'Grille complète à ce pas':'Grille incomplète · budget ou arrêt'):kind==='local'?'Résultat local · pas de preuve globale':r.status==='cancelled'?'Arrêt demandé':'Borne encore ouverte · budget atteint';
        const work=`${r.evaluations??0} évaluations${kind==='global'?` · ${r.processedNodes??0} subdivisions`:''} · ${num((times[kind]??0)/1000)} s`;
        addRow(t.body,[names[kind],num(r.best?.objective),num(r.upperBound),scientific(r.gap),work,status]);
    }
    $('concordance-results').replaceChildren(t.wrap);
    if(results.global)$('concordance-results').append(element('p',signed()?'La borne globale utilise des intervalles signés. Les bornes de coupure qui supposent des flux positifs sont désactivées. Le lagrangien reste un diagnostic local distinct ; une borne ouverte ne certifie pas le maximum.':'La borne globale combine la propagation d’intervalles et des bornes sur les flux traversant des coupures du réseau. Les multiplicateurs du lagrangien affichés plus bas sont un diagnostic local distinct. Un écart non fermé reste visible.','small-note'));
}
function inspect() {
    const s=state(),node=s.nodes.find(n=>String(n.id)===selected),incoming=s.flows.filter(e=>String(e.to)===selected),outgoing=s.flows.filter(e=>String(e.from)===selected);
    const supply=incoming.length?incoming.map(e=>`${e.from}→${e.to} : ${num(e.value)}`).join(' ; '):'La source impose Y₁=1.';
    const terms=incoming.map(e=>`(${num(model.epsilon[selected]?.[e.from]??0)} × ${num(e.value)})`).join(' + ');
    renderInspector({edge:'Nœud '+selected,variant:'1b',anchorPrefix:'concordance-noeud-'+selected,
        title:'Nœud '+selected+' · Alimentation, transformation et sortie',
        summary:names[view]+' ; quantités calculées, sans mesure ni durée de propagation supposées.',
        points:[
            {title:selected==='1'?'Source imposée':'Associer les contributions reçues',tip:'Somme des transferts des prédécesseurs.',paragraphs:[supply,selected==='1'?'La loi des nœuds 2 à 8 ne s’applique pas au nœud source.':`X${selected} = ${num(node.input)}. L’environnement e${selected} = ${num(model.environments[selected])}.`]},
            {title:selected==='1'?'Répartir la source':signed()?'Appliquer la loi signée':'Appliquer la loi avec mise à zéro',tip:'Le coefficient dépend des contributions reçues, avec leurs concordances.',paragraphs:selected==='1'?['Y₁=1 ; s₁ est envoyé vers 2 et 1−s₁ vers 5.']:[`C${selected} = ${num(model.environments[selected])} + ${terms||'0'} = ${num(node.coefficient)}. Chaque terme ajouté vaut ε${selected},j × qj,${selected}.`,`Y${selected} = ${signed()?`X${selected} × C${selected}`:`max(0, X${selected} × C${selected})`} = ${num(node.output)}. ${signed()?'Les valeurs négatives sont conservées et transmises.':'Une sortie négative devient zéro.'} Une sortie positive n’est pas plafonnée.`]},
            {title:selected==='8'?'Résultat après TH₈':'Produire et partager',tip:'Chaque flèche transporte une part de cette sortie.',paragraphs:[selected==='8'?`L’entrée X₈=${num(node.input)} est transformée en sortie finale r=Y₈=${num(node.output)}.`:`Y${selected} = ${num(node.output)} ; ${outgoing.map(e=>`${e.from}→${e.to} reçoit ${num(e.fraction)} × Y${selected} = ${num(e.value)}`).join(' ; ')}.`, 'Les croisements graphiques sans nœud ne créent aucun échange. Les flèches absentes portent un transfert nul.']},
        ],assessment:'La causalité décrit ici la dépendance calculatoire du graphe fixé. Les étapes de recherche d’un optimum ne sont pas des instants physiques.'});
}
const positions={'1':[380,65],'2':[150,250],'5':[620,250],'3':[285,470],'7':[620,470],'4':[205,700],'6':[560,700],'8':[380,900]};
const labels={'1-2':[245,150],'1-5':[535,150],'2-3':[165,378],'2-8':[100,550],'5-3':[398,337],'5-7':[688,367],'7-6':[652,607],'7-4':[409,624],'3-4':[193,598],'3-6':[425,548],'4-8':[260,822],'6-8':[536,823]};
function drawMap() {
    const s=state(),svg=$('concordance-map');clear(svg);
    const defs=svgElement('defs'),marker=svgElement('marker',{id:'concordance-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'});
    marker.append(svgElement('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'context-stroke'}));defs.append(marker);svg.append(defs);
    for(const e of s.flows) {
        const [ax,ay]=positions[e.from],[bx,by]=positions[e.to],length=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/length,uy=(by-ay)/length;
        let path=`M ${ax+ux*49} ${ay+uy*49} L ${bx-ux*51} ${by-uy*51}`;
        if(e.id==='2-8')path='M 108 267 Q 34 320 34 485 L 34 775 Q 34 900 328 900';
        if(e.id==='7-4')path='M 588 504 Q 466 705 254 700';
        const link=svgElement('a',{href:'#concordance-noeud-'+e.to,class:'branch-arc','aria-label':`Contribution ${e.from} vers ${e.to} : ${num(e.value)} ; examiner le nœud ${e.to}`});
        link.append(svgElement('title',{},`q${e.from},${e.to} = ${num(e.value)} ; part ${num(e.fraction)} de Y${e.from}`),svgElement('path',{d:path,class:'branch-hit'}),svgElement('path',{d:path,class:'branch-line','marker-end':'url(#concordance-arrow)'}));
        const [x,y]=labels[e.id];link.append(svgElement('text',{x,y,class:'branch-label'},e.id+' : '+compact(e.value)));svg.append(link);
    }
    s.nodes.forEach(n=>{
        const [x,y]=positions[n.id],link=svgElement('a',{href:'#concordance-noeud-'+n.id,class:'branch-junction','aria-label':`Analyser le nœud ${n.id}, sortie ${num(n.output)}`});
        if(String(n.id)==='8')link.setAttribute('data-final','');
        link.append(svgElement('title',{},`Nœud ${n.id} ; X=${num(n.input)} ; C=${num(n.coefficient)} ; Y=${num(n.output)}`),svgElement('circle',{cx:x,cy:y,r:47}),svgElement('text',{x,y:y-8},n.id),svgElement('text',{x,y:y+18,class:'branch-total'},'Y='+compact(n.output)));svg.append(link);
    });
}
function renderLagrangian() {
    const zone=$('concordance-lagrangian');zone.replaceChildren();
    try {
        const diagnostic=explainConcordanceLagrangian(model,state(),options);
        zone.append(element('p','Le calcul adjoint remonte le graphe depuis p₈=1. Les multiplicateurs ci-dessous concernent la configuration affichée ; ils ne constituent pas à eux seuls une borne globale.'));
        const multipliers=table(['Nœud i','λᵢ · apports','μᵢ · loi','ηᵢ · partage','pᵢ · sensibilité aval'],'Multiplicateurs calculés pour les 21 égalités, avec les signes du lagrangien ci-dessus');
        ids.forEach(id=>{const n=Number(id);addRow(multipliers.body,[id,n>1?num(diagnostic.lambda[n-2]):'—',n>1?num(diagnostic.mu[n-2]):'—',n<8?num(diagnostic.eta[n-1]):'—',num(diagnostic.potentials[id])]);});zone.append(multipliers.wrap);
        zone.append(element('p',(signed()?'En mode signé, φᵢ=1 partout, y compris si XᵢCᵢ≤0. ':'Dans une portion régulière, φᵢ=1 si XᵢCᵢ>0 et φᵢ=0 si XᵢCᵢ<0. ')+'∂L/∂Xᵢ=λᵢ−μᵢφᵢCᵢ ; ∂L/∂Yᵢ=μᵢ−ηᵢ pour i<8 ; ∂L/∂Y₈=1+μ₈.','branch-formula'));
        zone.append(element('p','Pour une liaison i→j : ∂L/∂qᵢⱼ=ηᵢ−λⱼ−μⱼφⱼXⱼεⱼᵢ. Ces dérivées portent sur 26 coordonnées indépendantes, alors que la nappe de Y₈ réapplique les contraintes.','branch-formula'));
        zone.append(element('p',`Résidu maximal des égalités : ${scientific(diagnostic.atReference.residual)}. ${diagnostic.atReference.differentiable?'Norme maximale du gradient libre de L : '+scientific(diagnostic.maxSelectedGradient)+'.':'Un seuil intervient : le vecteur sélectionné ne remplace pas une dérivée classique.'}`));
        zone.append(element('p','Le lagrangien libre contient des produits Xᵢqⱼᵢ : ses coupes peuvent être des selles. Une nappe de rendement avec maximum ne signifie pas que le lagrangien possède un maximum dans toutes ses variables libres.','small-note'));
        const pre=element('pre',JSON.stringify(diagnostic,null,2));
        const details=element('details');details.append(element('summary','Multiplicateurs, variables, dérivées et résidus numériques'),pre);zone.append(details);
        const s=state();zone.append(element('p',`Sur ce réseau compatible : toutes les égalités sont satisfaites, donc L = Y₈ = ${num(s.objective)}.`,'branch-formula'));
        windowDiagnostic=diagnostic;
    }catch(error){zone.append(element('p','Diagnostic du lagrangien indisponible : '+error.message));windowDiagnostic=null;}
}
let windowDiagnostic=null;
function render() {
    renderResults();const s=state();
    $('concordance-law-formula').textContent='Loi appliquée : Yᵢ = '+law()+'.';
    $('concordance-lagrangian-law').replaceChildren(element('span','+ Σ'),element('sub','i=2…8'),element('span',' μᵢ (Yᵢ − '+law()+')'));
    const provenance=model.provenance;
    $('concordance-provenance').textContent=provenance?.kind==='random-matrix'?`Matrice appliquée : graine ${provenance.seed} · ${provenance.algorithm}${provenance.manuallyModified?' · coefficients actifs modifiés après tirage':''}. Les environnements et les parts sont réglés séparément.`:'Modèle construit ; aucun tirage aléatoire appliqué. Le bouton de tirage conserve les environnements et les parts saisis.';
    const nodes=table(['Nœud','Exp. IN X','Coefficient brut C','Produit brut X × C','Exp. OUT Y = '+(signed()?'XC':'max(0, XC)')],'État calculé ; la source impose Y₁=1');
    s.nodes.forEach(n=>addRow(nodes.body,[n.id,num(n.input),num(n.coefficient),String(n.id)==='1'?'Source':num(n.input*n.coefficient),num(n.output)]));
    $('concordance-state').replaceChildren(element('p',`${signed()?'Mode signé':'Mode avec mise à zéro'} · ${names[view]} : r = Y₈ = ${num(s.objective)} ; somme algébrique reçue en 8 = ${num(s.nodes.find(n=>String(n.id)==='8')?.input)}.`,'branch-focus-value'),nodes.wrap);
    const flows=table(['Liaison','Part de la sortie source','Transfert q','Influence sur la destination'],'Les douze flèches transportent les subdivisions ; les fonctions sont dans les nœuds');
    s.flows.forEach(e=>addRow(flows.body,[`${e.from} → ${e.to}`,num(e.fraction),num(e.value),`ε${e.to},${e.from} = ${num(model.epsilon[e.to]?.[e.from]??0)}`]));
    $('concordance-flows').replaceChildren(flows.wrap);
    const matrix=table(['Destination i / fournisseur j',...ids],'Matrice ε : * désigne un coefficient actif ; les autres apports sont nuls, diagonale nulle');
    ids.forEach(id=>addRow(matrix.body,[id,...ids.map(from=>num(model.epsilon[id]?.[from]??0)+(edges.some(e=>e.to===id&&e.from===from)?' *':''))]));$('concordance-matrix').replaceChildren(matrix.wrap);
    drawMap();inspect();renderLagrangian();renderSurface();
}
function renderSurface() {
    const svg=$('concordance-surface');clear(svg);$('concordance-derivatives').replaceChildren();$('concordance-samples').replaceChildren();surface=null;
    try {
        const x=$('concordance-axis-x').value,y=$('concordance-axis-y').value,radius=numberInput('concordance-radius',.000001,1);
        surface=sampleConcordanceSurface(model,state(),{x,y,radius,steps:30});
        const {ranges,reference}=surface;
        const project=p=>{const u=(p.x-ranges.x[0])/(ranges.x[1]-ranges.x[0]),v=(p.y-ranges.y[0])/(ranges.y[1]-ranges.y[0]),z=(p.z-ranges.z[0])/(ranges.z[1]-ranges.z[0]);return{x:445+225*(u-v),y:395+90*(u+v-1)-240*z,depth:u+v+z*.1};};
        const cells=[];
        for(let i=0;i<surface.points.length-1;i++)for(let j=0;j<surface.points[i].length-1;j++){
            const points=[surface.points[i][j],surface.points[i][j+1],surface.points[i+1][j+1],surface.points[i+1][j]];
            if(!points.every(p=>p.feasible&&Number.isFinite(p.z)))continue;
            const projected=points.map(project);cells.push({points,projected,depth:projected.reduce((a,p)=>a+p.depth,0)/4});
        }
        cells.sort((a,b)=>a.depth-b.depth).forEach(cell=>{
            const height=cell.points.reduce((sum,p)=>sum+(p.z-ranges.z[0])/(ranges.z[1]-ranges.z[0]),0)/4;
            const polygon=svgElement('polygon',{points:cell.projected.map(p=>p.x+','+p.y).join(' '),class:'branch-surface-tile','fill-opacity':.15+.4*height}),p=cell.points[0],label=`${x}=${num(p.x)} ; ${y}=${num(p.y)} ; Y₈=${num(p.z)}`;
            polygon.append(svgElement('title',{},label));polygon.addEventListener('pointerenter',()=>$('concordance-surface-caption').textContent=label);polygon.addEventListener('click',()=>$('concordance-surface-caption').textContent=label);svg.append(polygon);
        });
        const origin={x:ranges.x[0],y:ranges.y[0],z:ranges.z[0]};
        for(const axis of ['x','y','z']){
            const a=project(origin),b=project({...origin,[axis]:ranges[axis][1]});svg.append(svgElement('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'branch-surface-axis'}));
            for(const f of [0,.5,1]){const value=ranges[axis][0]+f*(ranges[axis][1]-ranges[axis][0]),p=project({...origin,[axis]:value});text(svg,p.x+(axis==='z'?-50:0),p.y+22,compact(value),{'text-anchor':'middle'});}
            text(svg,b.x+(axis==='z'?-45:0),b.y+(axis==='z'?-20:47),axis==='z'?'Y₈':surface.axes[axis],{'text-anchor':'middle'});
        }
        for(const axis of ['x','y']){
            let d='',pen=false;for(const p of surface.profiles[axis]){if(!p.feasible||!Number.isFinite(p.z)){pen=false;continue;}const q=project(p);d+=(pen?' L ':' M ')+q.x+' '+q.y;pen=true;}svg.append(svgElement('path',{d,class:'branch-surface-section'}));
        }
        const p=project(reference);svg.append(svgElement('circle',{cx:p.x,cy:p.y,r:7,class:'branch-surface-marker reference'}));text(svg,p.x,p.y-18,'Référence : '+num(reference.z),{'text-anchor':'middle'});
        $('concordance-surface-caption').textContent=`Coupe compatible de Y₈ : ${x} et ${y} varient ; les trois autres parts restent fixées. Échelle verticale locale en valeurs absolues. Le point orange est la référence choisie, sans affirmation automatique de maximum.`;
        const derivatives=state().derivatives,zone=$('concordance-derivatives');
        zone.append(element('h3','Dérivées à la configuration de référence'));
        const tab=table(['Variable','Valeur','∂Y₈ / ∂s'],'Dérivées par propagation des lois, avant arrondi');
        CONCORDANCE_SPLITS.forEach((key,i)=>addRow(tab.body,[key,num(state().controls[key]),derivatives?.differentiable?num(derivatives.gradient?.[i]):'Seuil : dérivée non affirmée']));zone.append(tab.wrap);
        if(derivatives?.differentiable&&derivatives.hessian){const i=CONCORDANCE_SPLITS.indexOf(x),j=CONCORDANCE_SPLITS.indexOf(y),h=derivatives.hessian;zone.append(element('p',`Hessienne de cette coupe : [${num(h[i][i])} ; ${num(h[i][j])} / ${num(h[j][i])} ; ${num(h[j][j])}].`,'branch-formula'));}
        zone.append(element('p','dXᵢ = Σⱼ dqⱼᵢ ; dCᵢ = Σⱼ εᵢⱼ dqⱼᵢ. '+(signed()?'En mode signé, dYᵢ = Cᵢ dXᵢ + Xᵢ dCᵢ pour tout signe du produit.':'Si XᵢCᵢ>0, dYᵢ = Cᵢ dXᵢ + Xᵢ dCᵢ ; si XᵢCᵢ<0, dYᵢ=0. Au seuil, les dérivées doivent être examinées séparément.')+' Puis dqᵢₖ = sᵢₖ dYᵢ + Yᵢ dsᵢₖ.','branch-formula'));
        const samples=table([x,y,'Y₈','Statut'],'Points du maillage : la loi et toutes les associations sont recalculées');
        surface.points.flat().forEach(p=>addRow(samples.body,[num(p.x),num(p.y),num(p.z),p.feasible?'Compatible':p.reason]));const details=element('details');details.append(element('summary',`Lire les ${surface.points.flat().length} points de la nappe`),samples.wrap);$('concordance-samples').append(details);
    }catch(error){surface=null;$('concordance-surface-caption').textContent=error.message;text(svg,450,250,'Choisir deux axes distincts et un rayon valide.',{'text-anchor':'middle'});}
}
function restoreNode(scroll) {
    const match=/^#concordance-noeud-([1-8])(?:-([123])\.0)?$/.exec(location.hash);if(!match)return;
    selected=match[1];$('concordance-node').value=selected;inspect();
    if(scroll)requestAnimationFrame(()=>{const target=match[2]?$(location.hash.slice(1)):$('concordance-inspector');target?.scrollIntoView({block:'start'});});
}
try {
    $('concordance-form').addEventListener('submit',event=>{event.preventDefault();apply();});
    $('concordance-reset').addEventListener('click',load);
    $('concordance-randomize').addEventListener('click',randomize);
    $('concordance-negative').addEventListener('click',()=>{loadModel(createNegativeConcordanceScenario(),'signed','Exemple signé chargé : r = −1 pour tout partage, par conservation des apports en amont.');$('concordance-parameters-title').scrollIntoView({block:'start'});});
    $('concordance-compare').addEventListener('click',compare);
    $('concordance-cancel').addEventListener('click',()=>{stop('Calcul arrêté ; les résultats déjà obtenus sont conservés avec leur statut.');renderResults();});
    $('concordance-view').addEventListener('change',()=>{view=$('concordance-view').value;render();});
    $('concordance-node').addEventListener('change',()=>{selected=$('concordance-node').value;location.hash='concordance-noeud-'+selected;inspect();});
    ['concordance-axis-x','concordance-axis-y','concordance-radius'].forEach(id=>$(id).addEventListener('change',renderSurface));
    $('concordance-center').addEventListener('click',()=>{const best=['initial','grid','local','global'].map(key=>({key,s:key==='initial'?initial:results[key]?.best})).filter(item=>item.s?.feasible).sort((a,b)=>b.s.objective-a.s.objective)[0];view=best.key;$('concordance-view').value=view;render();});
    $('concordance-export').addEventListener('click',()=>{
        const record={version:2,model,semantics:{objective:'Exp. OUT₈ après TH₈',negativeOutputs:signed()?'preserved':'replaced-with-zero',positiveOutputs:'not-capped',epsilon:'destination-then-source',inactiveCoefficients:'retained-with-zero-transfer',shares:'fractions-in-[0,1]'},options,settings,initial,results,timesMilliseconds:times,displayedView:view,lagrangian:windowDiagnostic,surface};
        const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'})),link=element('a');link.href=url;link.download='etude-concordances.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    window.addEventListener('hashchange',()=>restoreNode(true));
    document.addEventListener('click',event=>{const link=event.target.closest?.('a[href^="#concordance-noeud-"]');if(link&&link.getAttribute('href')===location.hash){event.preventDefault();restoreNode(true);}});
    $('concordance-node').value=selected;load();renderStudies();restoreNode(Boolean(location.hash));
}catch(error){$('concordance-error').textContent='L’atelier n’a pas pu démarrer : '+error.message;}
