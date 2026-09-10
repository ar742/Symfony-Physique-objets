import {createOptimisationScenario, evaluateOptimisation} from './optimisation-engine.mjs';
import {productionRate} from './production-engine.mjs';
import {element, svgElement, table, renderInspector} from './graph-studies.mjs';

const $ = id => document.getElementById(id);
const ids = Array.from({length:8}, (_, i) => 'M' + (i+1));
const controls = ['u','s1','s3','s5'];
const lawKeys = ['a','b','c','d'];
const names = {initial:'Départ compatible', local:'Petites variations', global:'Recherche globale'};
const number = value => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:6}).format(value);
const precise = value => String(value).replace('.', ',');
const compact = value => new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3}).format(value);
const small = value => Number.isFinite(value) ? value.toExponential(3) : 'non disponible';
let model, initial, local = null, globalResult = null, worker = null, selected = 'M1';
let localTime = null, globalTime = null, view = 'initial';

function numeric(id) {
  const raw = $(id).value.trim(), value = Number(raw);
  if (raw === '' || !Number.isFinite(value)) throw new Error('Le champ ' + id.replace('opt-','') + ' doit contenir un nombre fini.');
  return value;
}
function clearSvg(svg) {
  [...svg.children].filter(node => !['title','desc'].includes(node.localName)).forEach(node => node.remove());
}
function text(svg, x, y, value, attrs={}) {
  svg.append(svgElement('text',{x,y,class:'production-chart-text',...attrs},value));
}
function selectedState() {
  return view === 'local' && local ? local.best : view === 'global' && globalResult?.best ? globalResult.best : initial;
}
function stop(message) {
  if (worker) { worker.terminate(); worker = null; }
  $('optimization-cancel').hidden = true;
  $('optimization-compare').disabled = false;
  if (message) $('optimization-status').textContent = message;
}
function resetResults() {
  local = globalResult = localTime = globalTime = null;
  view = 'initial'; $('optimization-view').value = view;
  ['local','global'].forEach(key => $('optimization-view').querySelector('[value="' + key + '"]').disabled = true);
}
function load(preset) {
  stop(); model = createOptimisationScenario(preset === 'zero' ? 'plateau' : 'active');
  if (preset === 'abundant') {
    model.budget = .4;
    model.initialControls = {u:.3,s1:.5,s3:.5,s5:.5};
  }
  initial = evaluateOptimisation(model, model.initialControls);
  if (!initial.feasible) throw new Error(initial.reason);
  lawKeys.forEach(key => $('opt-'+key).value = String(model.parameters[key]));
  controls.forEach(key => $('opt-'+key).value = String(model.initialControls[key]));
  $('opt-budget').value = String(model.budget);
  $('opt-source-step').value = '.02'; $('opt-split-step').value = '.1'; $('opt-min-step').value = '.00001';
  resetResults(); $('optimization-error').textContent = '';
  $('optimization-status').textContent = 'Départ compatible chargé. Lancez les deux méthodes pour les comparer.';
  renderResults(); renderState();
}
function compare() {
  try {
    const next = {
      parameters:Object.fromEntries(lawKeys.map(key => [key,numeric('opt-'+key)])),
      budget:numeric('opt-budget'),
      initialControls:Object.fromEntries(controls.map(key => [key,numeric('opt-'+key)]))
    };
    const options = {sourceStep:numeric('opt-source-step'),splitStep:numeric('opt-split-step'),minStep:numeric('opt-min-step'),maxIterations:80};
    if (options.sourceStep < 1e-6 || options.sourceStep > 1 || options.splitStep < 1e-6 || options.splitStep > 1
      || options.minStep < 1e-6 || options.minStep > .1 || options.minStep > Math.min(options.sourceStep,options.splitStep)) {
      throw new Error('Choisissez des pas entre 0,000001 et 1, avec un seuil d’arrêt au plus égal aux deux pas et à 0,1.');
    }
    const state = evaluateOptimisation(next,next.initialControls);
    if (!state.feasible) throw new Error('Départ incompatible : ' + state.reason);
    stop(); model = next; initial = state; resetResults();
    $('optimization-error').textContent = '';
    $('optimization-status').textContent = 'Recherche locale, puis examen des 6 561 combinaisons de régimes…';
    $('optimization-cancel').hidden = false; $('optimization-compare').disabled = true;
    renderResults(); renderState();
    const running = new Worker(new URL('./production-optimization-worker.mjs',import.meta.url),{type:'module'});
    worker = running;
    running.onmessage = event => {
      if (worker !== running) return;
      const message = event.data;
      if (message.kind === 'error') {
        stop('Calcul interrompu. Le résultat partiel éventuellement obtenu reste identifié.');
        $('optimization-error').textContent = message.message;
        return;
      }
      if (message.kind === 'local') {
        local = message.result; localTime = message.milliseconds;
        $('optimization-view').querySelector('[value="local"]').disabled = false;
        $('optimization-status').textContent = 'Recherche locale terminée. Examen global des régimes en cours…';
      } else if (message.kind === 'global') {
        globalResult = message.result; globalTime = message.milliseconds;
        $('optimization-view').querySelector('[value="global"]').disabled = !globalResult.best;
        stop('Comparaison terminée. Examinez les productions, la borne et l’écart restant.');
      }
      renderResults(); renderState();
    };
    running.onerror = () => {
      if (worker !== running) return;
      stop('Le calcul n’a pas abouti.');
      $('optimization-error').textContent = 'Le moteur de comparaison n’a pas pu terminer. Rechargez la page puis réessayez.';
    };
    running.postMessage({model,options});
  } catch (error) {
    $('optimization-error').textContent = 'Réglages non appliqués : ' + error.message;
  }
}
function inspectResidual(state) {
  if (!state) return NaN;
  let residual = Math.max(0,-state.controls.u,state.controls.u-model.budget);
  ids.forEach((id,i) => {
    const incoming = i === 0 ? state.controls.u : state.flows.filter(flow=>flow.to===id).reduce((sum,flow)=>sum+flow.amount,0);
    const outgoing = i === 7 ? state.production : state.flows.filter(flow=>flow.from===id).reduce((sum,flow)=>sum+flow.amount,0);
    residual = Math.max(residual,Math.abs(incoming-state.input[i]),Math.abs(outgoing-state.outputs[i]),
      Math.abs(productionRate(state.input[i],model.parameters)-state.outputs[i]),-state.input[i],state.input[i]-1);
  });
  state.flows.forEach(flow=>{residual=Math.max(residual,-flow.amount);});
  return residual;
}
function setView(key, scroll=false) {
  if (key==='local' && !local || key==='global' && !globalResult?.best) return;
  view = key; $('optimization-view').value = key; renderState();
  if (scroll) $('optimization-map').scrollIntoView({block:'start'});
}
function renderResults() {
  $('optimization-applied').textContent = 'Paramètres appliqués : ' + lawKeys.map(key=>key+'='+precise(model.parameters[key])).join(' ; ')
    + ' ; B='+number(model.budget)+'. Départ : '+controls.map(key=>key+'='+number(initial.controls[key])).join(' ; ')+'.';
  const result = table(['Méthode / état','Production finale r','Écart à la borne globale','Contrôle des bilans et lois','Examiner'],'Même objectif et mêmes contraintes pour les deux méthodes');
  const entries = [['initial',initial],['local',local?.best],['global',globalResult?.best]];
  for (const [key,state] of entries) {
    const tr = element('tr');
    tr.append(element('th',names[key]));
    if (!state) {
      tr.append(element('td','Non calculé'),element('td','—'),element('td','—'),element('td','—'));
    } else {
      tr.append(element('td',number(state.production)),
        element('td',globalResult ? small(Math.max(0,globalResult.upperBound-state.production)) : 'Borne en attente'),
        element('td','Écart maximal '+small(inspectResidual(state))));
      const td = element('td'), button = element('button','Voir cet état');
      button.type = 'button'; button.setAttribute('aria-label','Afficher '+names[key]);
      button.addEventListener('click',()=>setView(key,true));td.append(button);tr.append(td);
    }
    result.body.append(tr);
  }
  $('optimization-results').replaceChildren(result.wrap);
  if (local) {
    const reason = local.status === 'iteration-limit' ? 'budget d’itérations atteint' : 'pas devenus inférieurs au seuil d’arrêt';
    $('optimization-results').append(element('p','Recherche locale : '+local.iterations+' itérations, '+local.evaluations+' évaluations ; '+reason+'. Un arrêt de cette recherche ne démontre pas un optimum.'));
  }
  if (globalResult) {
    const gap = Math.max(0,globalResult.upperBound-globalResult.best.production);
    if (globalResult.certificates.inconsistent) $('optimization-results').append(element('p','Le contrôle numérique a trouvé une contradiction entre la solution et la borne : aucun certificat global ne peut être retenu pour ces réglages.','optimization-figure-note'));
    $('optimization-results').append(element('p','Borne supérieure globale : '+number(globalResult.upperBound)+' ; écart avec la meilleure solution : '+small(gap)+'.',
      globalResult.status==='certified' ? 'graph-assessment' : 'optimization-figure-note'));
    $('optimization-results').append(element('p',globalResult.status==='certified'
      ? 'Optimum global établi numériquement à la tolérance 10⁻⁷ pour ce problème et ces contraintes. Les contrôles portent sur les régimes et leurs certificats.'
      : 'La meilleure solution calculée reste accompagnée de sa borne. Les contrôles ne permettent pas d’annoncer un optimum global à la tolérance 10⁻⁷.'));
  }
  renderHistory(); renderCertificate();
}
function renderHistory() {
  const rows = local?.history || [{iteration:0,production:initial.production,controls:initial.controls,sourceStep:null,splitStep:null,accepted:false}];
  const history = table(['Étape','r','u','s₁','s₃','s₅','Pas u / partages','Évolution'],'Recherche locale : essais retenus et réduction des pas');
  rows.forEach(row => {
    const tr=element('tr');
    tr.append(element('td',String(row.iteration)),element('td',number(row.production)));
    controls.forEach(key=>tr.append(element('td',number(row.controls[key]))));
    tr.append(element('td',row.sourceStep === null ? '—' : number(row.sourceStep)+' / '+number(row.splitStep)),
      element('td',row.iteration===0 ? 'Départ' : row.accepted ? 'Amélioration retenue' : 'Pas réduits / aucun gain'));
    history.body.append(tr);
  });
  $('optimization-local-history').replaceChildren(history.wrap);
  const svg=$('optimization-progress-chart');clearSvg(svg);
  const maxIteration=Math.max(1,...rows.map(row=>row.iteration)), x=value=>60+710*value/maxIteration, y=value=>250-215*value;
  [0,.5,1].forEach(value=>{
    svg.append(svgElement('line',{x1:60,y1:y(value),x2:770,y2:y(value),class:'production-chart-grid'}));
    text(svg,47,y(value)+5,number(value),{'text-anchor':'end'});
  });
  for (const tick of new Set([0,Math.round(maxIteration/2),maxIteration])) text(svg,x(tick),274,String(tick),{'text-anchor':'middle'});
  svg.append(svgElement('polyline',{points:rows.map(row=>x(row.iteration)+','+y(row.production)).join(' '),class:'production-curve-line'}));
  svg.append(svgElement('circle',{cx:x(rows[0].iteration),cy:y(rows[0].production),r:4,class:'production-operating'}));
  if (globalResult?.best) {
    svg.append(svgElement('line',{x1:60,y1:y(globalResult.best.production),x2:770,y2:y(globalResult.best.production),class:'optimization-reference'}));
    svg.append(svgElement('line',{x1:60,y1:y(globalResult.upperBound),x2:770,y2:y(globalResult.upperBound),class:'optimization-bound'}));
  }
  text(svg,60,20,'r · bleu : recherche locale ; vert : solution globale ; orange : borne');
  text(svg,770,298,'Étapes de recherche',{'text-anchor':'end'});
}
function renderCertificate() {
  const zone=$('optimization-certificate');
  if (!globalResult) {
    zone.replaceChildren(element('p','Le calcul global fournira ses bornes et le décompte des régimes examinés.'));
    return;
  }
  const regimes=globalResult.regimes;
  const certificates=globalResult.certificates;
  zone.replaceChildren(
    element('p',regimes.total+' combinaisons : '+regimes.feasible+' admissibles, '+regimes.infeasible+' incompatibles et '+regimes.uncertain+' non résolues avec certitude numérique.'),
    element('p','Borne supérieure '+number(globalResult.upperBound)+', meilleure production '+number(globalResult.best.production)+', écart '+small(globalResult.gap)+'.'),
    element('p','Durées indicatives dans ce navigateur : local '+number(localTime/1000)+' s ; global '+number(globalTime/1000)+' s. Ces durées ne constituent pas un classement général des méthodes.'),
    element('p',certificates.checked+' certificats contrôlés sur '+certificates.total+'. Combinaison portant la borne maximale : '+certificates.maxUpperRegime+' (0 : plateau nul ; 1 : croissance ; 2 : dernière portion ; ordre M1 à M8).'),
    element('p','La borne globale garde une majoration prudente pour tout régime dont le contrôle échoue. Les marges numériques et les multiplicateurs sont consignés dans les données de calcul.')
  );
  const button=element('button','Exporter les paramètres, résultats et certificats (JSON)');button.type='button';
  button.addEventListener('click',()=>{
    const record={model,initial,local,global:globalResult,units:'taux normalisés, modèle fictif',tolerance:1e-7};
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
    const link=element('a');link.href=url;link.download='comparaison-huit-machines.json';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  });zone.append(button);
}
function renderState() {
  const state=selectedState();
  if (!state) return;
  drawMap(state);drawCurve(state);inspect(state);
  $('optimization-commands').textContent = names[view]+' · Commandes de cet état : '+controls.map(key=>key+'='+number(state.controls[key])).join(' ; ')+'. Les champs du formulaire restent le départ préparé pour une nouvelle comparaison.';
  const values=table(['Machine','Entrée x','Production y','Régime','Analyse'],names[view]+' · Taux compatibles des huit machines');
  ids.forEach((id,i)=>{
    const tr=element('tr'), anchor=element('a',id);anchor.href='#atelier-'+id+'-1b';
    const last=element('td');last.append(anchor);
    tr.append(element('td',id),element('td',number(state.input[i])),element('td',number(state.outputs[i])),element('td',region(state.input[i])),last);
    values.body.append(tr);
  });$('optimization-state').replaceChildren(values.wrap);
  const flows=table(['De → Vers','Flux p','Part de la sortie source'],'Répartition intégrale de chaque production intermédiaire');
  state.flows.forEach(flow=>{
    const source=state.outputs[ids.indexOf(flow.from)],tr=element('tr');
    tr.append(element('td',flow.from+' → '+flow.to),element('td',number(flow.amount)),element('td',source>0?number(flow.amount/source):'Indifférente : production nulle'));
    flows.body.append(tr);
  });
  const tr=element('tr');tr.append(element('td','M8 → Résultat'),element('td',number(state.production)),element('td','1'));flows.body.append(tr);
  $('optimization-flows').replaceChildren(flows.wrap);
}
function region(x) {
  return x<=model.parameters.a?'Plateau nul':x<=model.parameters.b?'Croissance':model.parameters.d<model.parameters.c?'Décroissance':'Plateau final';
}
function drawMap(state) {
  const svg=$('optimization-map');clearSvg(svg);
  const positions={M1:[310,95],M2:[130,260],M3:[490,260],M4:[130,440],M5:[490,440],M6:[130,620],M7:[490,620],M8:[310,790]};
  const defs=svgElement('defs'),marker=svgElement('marker',{id:'optimization-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'});
  marker.append(svgElement('path',{d:'M 1 1 L 9 5 L 1 9',fill:'none',stroke:'var(--flow)','stroke-width':1.5}));defs.append(marker);svg.append(defs);
  text(svg,310,24,names[view]+' · u = '+number(state.controls.u)+' · B = '+number(model.budget),{'text-anchor':'middle',class:'optimization-legend'});
  svg.append(svgElement('path',{d:'M 310 32 L 310 49',class:'optimization-flow','marker-end':'url(#optimization-arrow)'}));
  for (const flow of state.flows) {
    const [ax,ay]=positions[flow.from],[bx,by]=positions[flow.to],length=Math.hypot(bx-ax,by-ay),ux=(bx-ax)/length,uy=(by-ay)/length;
    const attrs={x1:ax+ux*48,y1:ay+uy*48,x2:bx-ux*48,y2:by-uy*48,class:'optimization-flow','marker-end':'url(#optimization-arrow)'};
    if (flow.amount===0)attrs['data-idle']='';
    const edge=svgElement('line',attrs);edge.append(svgElement('title',{},flow.from+' → '+flow.to+' : '+number(flow.amount)));svg.append(edge);
    text(svg,(ax+bx)/2-uy*24,(ay+by)/2+ux*24,compact(flow.amount),{class:'production-transfer-label'});
  }
  ids.forEach((id,i)=>{
    const [x,y]=positions[id],link=svgElement('a',{href:'#atelier-'+id+'-1b',class:'optimization-node','aria-label':'Analyser '+id+' : entrée '+number(state.input[i])+', production '+number(state.outputs[i])});
    if(id===selected)link.setAttribute('aria-current','true');
    if(i===7)link.setAttribute('data-final','');
    link.append(svgElement('circle',{cx:x,cy:y,r:44}),svgElement('text',{x,y:y-7},id),svgElement('text',{x,y:y+19},'y='+compact(state.outputs[i])));
    link.append(svgElement('title',{},id+' · '+region(state.input[i])+'. Cliquer pour lire Exp. IN, TH et Exp. OUT.'));
    svg.append(link);
  });
  svg.append(svgElement('path',{d:'M 310 838 L 310 868',class:'optimization-flow','marker-end':'url(#optimization-arrow)'}));
  text(svg,310,904,'Résultat r = '+number(state.production),{class:'optimization-legend'});
  $('optimization-map-caption').textContent=names[view]+' · Flux sur les flèches ; production y dans les nœuds. Flèches pointillées : flux nul. Toutes les valeurs sont normalisées.';
}
function drawCurve(state) {
  const svg=$('optimization-curve');clearSvg(svg);
  const p=model.parameters,index=ids.indexOf(selected),x=v=>65+485*v,y=v=>255-220*v;
  [0,.5,1].forEach(value=>{
    svg.append(svgElement('line',{x1:x(0),y1:y(value),x2:x(1),y2:y(value),class:'production-chart-grid'}));
    text(svg,50,y(value)+5,number(value),{'text-anchor':'end'});text(svg,x(value),280,number(value),{'text-anchor':'middle'});
  });
  svg.append(svgElement('polyline',{points:[[0,0],[p.a,0],[p.b,p.c],[1,p.d]].map(([u,v])=>x(u)+','+y(v)).join(' '),class:'production-curve-line'}));
  svg.append(svgElement('circle',{cx:x(state.input[index]),cy:y(state.outputs[index]),r:7,class:'production-operating'}));
  text(svg,65,22,selected+' · Production y=f(x)');text(svg,550,309,'Alimentation x',{'text-anchor':'end'});
  $('optimization-curve-caption').textContent=names[view]+' : '+selected+', x='+number(state.input[index])+' → y='+number(state.outputs[index])+'. '+region(state.input[index])+'.';
}
function inspect(state) {
  const i=ids.indexOf(selected),incoming=state.flows.filter(flow=>flow.to===selected),outgoing=state.flows.filter(flow=>flow.from===selected);
  const supplies=i===0?'Apport extérieur u='+number(state.controls.u)+', limité par B='+number(model.budget)+'.':incoming.map(flow=>flow.from+' fournit '+number(flow.amount)).join(' ; ')+'.';
  const destinations=i===7?'Toute la production fournit le résultat final r='+number(state.production)+'.':outgoing.map(flow=>flow.to+' reçoit '+number(flow.amount)).join(' ; ')+'.';
  renderInspector({
    edge:selected,variant:'1b',anchorPrefix:'atelier-'+selected+'-1b',title:selected+' · Alimentation et production',
    summary:names[view]+' : attributs d’alimentation vers attributs de production, cas 1b. L’état est recalculé avec les lois et les bilans communs.',
    points:[
      {title:'Réunir les entrées compatibles',tip:'Les contributions des fournisseurs s’additionnent ; M1 reçoit seule un apport externe.',paragraphs:[supplies,'Somme des apports : x='+number(state.input[i])+', dans [0,1]. Aucun plafonnement ni surplus éliminé ne répare un dépassement dans cette étude.','Paramètres, apports, topologie et conversions κ=1 sont supposés. Les valeurs affichées sont calculées.']},
      {title:'Appliquer la loi commune f',tip:'La même fonction s’applique aux huit machines, chacune à son alimentation propre.',paragraphs:['Loi commune : '+lawKeys.map(key=>key+'='+precise(model.parameters[key])).join(' ; ')+'.','x='+number(state.input[i])+' appartient au régime « '+region(state.input[i])+' ». On obtient f(x)='+number(state.outputs[i])+'.','Le choix des flux est une commande de fonctionnement. Les petites variations et les programmes linéaires par régime sont deux méthodes pour rechercher ces commandes.']},
      {title:i===7?'Établir le résultat du processus':'Partager toute la production',tip:i===7?'La sortie de M8 est l’objectif r maximisé.':'Les flux sortants se partagent la production sans la compter deux fois.',paragraphs:['Production calculée : y='+number(state.outputs[i])+'. '+destinations,i===7?'L’objectif commun aux deux recherches est ce seul résultat r.':'La somme des flux sortants vaut y. Un partage est sans effet lorsque la production source est nulle.','Cet état compatible est une possibilité du modèle abstrait ; il ne constitue pas une mesure de fabrication.']}
    ],assessment:'Écart maximal des bilans, lois et bornes sur cet état : '+small(inspectResidual(state))+'. Un état compatible n’est pas nécessairement optimal.'
  });
  const links=element('p',undefined,'production-inspector-links');
  incoming.forEach(flow=>{const a=element('a','Source '+flow.from+' / 3.0');a.href='#atelier-'+flow.from+'-1b-3.0';links.append(a);});
  outgoing.forEach(flow=>{const a=element('a','Destination '+flow.to+' / 1.0');a.href='#atelier-'+flow.to+'-1b-1.0';links.append(a);});
  const old=$('optimization-inspector').querySelector('.production-inspector-links');
  if(old)old.replaceWith(links);else $('optimization-inspector').append(links);
}
function restore(scroll) {
  const match=/^#atelier-(M[1-8])-1b(?:-([1-3])\.0)?$/.exec(location.hash);
  if(!match)return;
  selected=match[1];$('optimization-machine').value=selected;renderState();
  if(scroll)requestAnimationFrame(()=>{
    const target=match[2]?$(location.hash.slice(1)):$('optimization-inspector');
    target.scrollIntoView({block:'start'});
    if(match[2])target.focus({preventScroll:true});
    else{$('inspector-title').tabIndex=-1;$('inspector-title').focus({preventScroll:true});}
  });
}
try {
  $('optimization-controls').addEventListener('submit',event=>{event.preventDefault();compare();});
  $('optimization-cancel').addEventListener('click',()=>stop('Calcul arrêté. Les résultats partiels restent affichés ; la comparaison globale peut être relancée.'));
  ['active','zero','abundant'].forEach(preset=>$('optimization-start-'+preset).addEventListener('click',()=>load(preset)));
  $('optimization-view').addEventListener('change',()=>setView($('optimization-view').value));
  $('optimization-machine').addEventListener('change',()=>{selected=$('optimization-machine').value;history.replaceState(null,'','#atelier-'+selected+'-1b');renderState();});
  window.addEventListener('hashchange',()=>restore(true));
  window.addEventListener('pagehide',()=>stop());
  document.addEventListener('click',event=>{
    const a=event.target.closest?.('a[href^="#atelier-"]');
    if(a && a.getAttribute('href')===location.hash){event.preventDefault();restore(true);}
  });
  load('active');restore(Boolean(location.hash));
} catch(error) {
  stop('L’atelier n’a pas pu démarrer.');
  $('optimization-error').textContent=error.message;
}
