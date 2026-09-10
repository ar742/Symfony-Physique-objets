import {productionRate, createProductionScenario, simulateProduction} from './production-engine.mjs';
import {element, svgElement, table, number, renderInspector} from './graph-studies.mjs';

const $ = id => document.getElementById(id);
const fields = ['a', 'b', 'c', 'd', 'external', 'initial'];
const palette = ['var(--tone-blue)', 'var(--tone-orange)', 'var(--tone-green)'];
const tolerance = 1e-7;
const precise = value => String(value).replace('.', ',');
let model, simulation, drafts, selected = 'M1', cycle = 40;

function clearSvg(svg) {
  [...svg.children].filter(node => !['title', 'desc'].includes(node.localName)).forEach(node => node.remove());
}
function annotate(svg, x, y, text, attrs = {}) {
  svg.append(svgElement('text', {x, y, class:'production-chart-text', ...attrs}, text));
}
function indexOf(id) { return model.machines.findIndex(machine => machine.id === id); }
function currentMachine() { return model.machines[indexOf(selected)]; }
function rememberDraft() {
  if (!drafts) return;
  drafts.set(selected, Object.fromEntries(fields.map(key => [key, $(`machine-${key}`).value])));
}
function showDraft() {
  fields.forEach(key => { $(`machine-${key}`).value = drafts.get(selected)[key]; });
}
function numeric(raw, name) {
  if (raw.trim() === '' || !Number.isFinite(Number(raw))) throw new Error(`${name} : indiquez un nombre fini.`);
  return Number(raw);
}
function allocationFields() {
  $('production-allocation-inputs').replaceChildren(...model.allocations.map(edge => {
    const field = element('div', undefined, 'graph-field');
    const label = element('label', `${edge.from} → ${edge.to}`), input = element('input');
    input.id = `allocation-${edge.from}-${edge.to}`; label.htmlFor = input.id;
    Object.assign(input, {type:'number', min:'0', max:'1', step:'any', required:true, value:String(edge.fraction)});
    field.append(label, input); return field;
  }));
}
function setScenario(preset) {
  const next = createProductionScenario(preset);
  const allEdges = next.machines.flatMap(from => next.machines.filter(to => to.id !== from.id).map(to =>
    next.allocations.find(edge => edge.from === from.id && edge.to === to.id) || {from:from.id, to:to.id, fraction:0, conversion:1}));
  next.allocations = allEdges;
  const result = simulateProduction(next, {cycles:40, tolerance});
  model = next; simulation = result; cycle = 40;
  drafts = new Map(model.machines.map(machine => [machine.id, Object.fromEntries(fields.map(key => [key, String(machine[key])]))]));
  $('production-machine').value = selected;
  $('production-cycles').value = '40';
  $('production-preset-description').textContent = model.description;
  $('production-prime').hidden = preset !== 'threshold';
  $('production-error').textContent = '';
  showDraft(); allocationFields(); renderRun();
}
function applySettings() {
  try {
    rememberDraft();
    const next = {...model, machines:model.machines.map(machine => ({...machine, ...Object.fromEntries(fields.map(key => [key, numeric(drafts.get(machine.id)[key], `${machine.id} / ${key}`)]))})), allocations:model.allocations.map(edge => ({...edge, fraction:numeric($(`allocation-${edge.from}-${edge.to}`).value, `${edge.from} → ${edge.to}`)}))};
    const cycles = numeric($('production-cycles').value, 'Nombre de cycles');
    if (!Number.isInteger(cycles) || cycles < 1 || cycles > 200) throw new Error('Choisissez un nombre entier de cycles de 1 à 200.');
    const result = simulateProduction(next, {cycles, tolerance});
    model = next; simulation = result; cycle = cycles;
    $('production-error').textContent = '';
    $('production-preset-description').textContent = 'Réglages personnalisés appliqués. Les paramètres peuvent être comparés en rechargeant un exemple.';
    renderRun();
  } catch (error) { $('production-error').textContent = `Réglages non appliqués : ${error.message}`; }
}
function drawMap(row) {
  const svg = $('production-map'); clearSvg(svg);
  const locations = {M1:{x:140,y:100}, M2:{x:480,y:100}, M3:{x:310,y:325}};
  const defs = svgElement('defs'), marker = svgElement('marker', {id:'production-arrow', viewBox:'0 0 10 10', refX:9, refY:5, markerWidth:7, markerHeight:7, orient:'auto-start-reverse'});
  marker.append(svgElement('path', {d:'M 1 1 L 9 5 L 1 9', fill:'none', stroke:'var(--flow)', 'stroke-width':1.5})); defs.append(marker); svg.append(defs);
  row.flows.filter(flow => flow.fraction > 0).forEach(flow => {
    const a = locations[flow.from], b = locations[flow.to], length = Math.hypot(b.x-a.x,b.y-a.y);
    const ux = (b.x-a.x)/length, uy = (b.y-a.y)/length, nx = -uy, ny = ux;
    const from = {x:a.x+ux*48,y:a.y+uy*48}, to = {x:b.x-ux*48,y:b.y-uy*48};
    const control = {x:(a.x+b.x)/2+nx*35,y:(a.y+b.y)/2+ny*35};
    const group = svgElement('g');
    group.append(svgElement('title', {}, `${flow.from} → ${flow.to} : fraction ${number(flow.fraction)}, production envoyée ${number(flow.nextSent)} pour le cycle ${cycle+1}.`));
    group.append(svgElement('path', {d:`M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`, class:'production-transfer', 'marker-end':'url(#production-arrow)'}));
    group.append(svgElement('text', {x:(from.x+2*control.x+to.x)/4+nx*14,y:(from.y+2*control.y+to.y)/4+ny*14, class:'production-transfer-label'}, number(flow.nextSent)));
    svg.append(group);
  });
  model.machines.forEach((machine,index) => {
    const {x,y} = locations[machine.id];
    const link = svgElement('a', {href:`#machine-${machine.id}-1b`, class:'production-machine', 'data-machine':machine.id, 'aria-label':`Analyser ${machine.id} : production ${number(row.outputs[index])}`});
    if (machine.id === selected) link.setAttribute('aria-current','true');
    link.append(svgElement('title', {}, `${machine.id} · alimentation ${number(row.input[index])}, production ${number(row.outputs[index])}. Cliquer pour Exp. IN, TH, Exp. OUT.`));
    link.append(svgElement('circle', {cx:x,cy:y,r:43,stroke:palette[index]}));
    link.append(svgElement('text', {x,y:y-7}, machine.id));
    link.append(svgElement('text', {x,y:y+17}, `y=${number(row.outputs[index])}`));
    link.append(svgElement('text', {x,y:y+76,class:'machine-external'}, `e=${number(machine.external)}`)); svg.append(link);
  });
  $('production-map-caption').textContent = `Nœuds : productions du cycle ${cycle}. Flèches : parts de ces productions offertes pour le cycle ${cycle+1}. Les nombres sont des taux normalisés, pas des pourcentages de répartition.`;
}
function drawCurve(row) {
  const machine = currentMachine(), index = indexOf(selected), svg = $('production-curve'); clearSvg(svg);
  const x = v => 60+420*v, y = v => 260-220*v;
  [0,.5,1].forEach(value => {
    svg.append(svgElement('line',{x1:x(0),y1:y(value),x2:x(1),y2:y(value),class:'production-chart-grid'}));
    annotate(svg, 46,y(value)+5,number(value),{'text-anchor':'end'});
    annotate(svg,x(value),283,number(value),{'text-anchor':'middle'});
  });
  svg.append(svgElement('path',{d:`M ${x(0)} ${y(1)} V ${y(0)} H ${x(1)}`,fill:'none',class:'production-chart-axis'}));
  const knots = [[0,0],[machine.a,0],[machine.b,machine.c],[1,machine.d]];
  svg.append(svgElement('polyline',{points:knots.map(([u,v])=>`${x(u)},${y(v)}`).join(' '),class:'production-curve-line'}));
  knots.slice(1).forEach(([u,v])=>svg.append(svgElement('circle',{cx:x(u),cy:y(v),r:4,class:'production-knot'})));
  const probe = Number($('production-probe').value), value = productionRate(probe,machine);
  svg.append(svgElement('circle',{cx:x(row.input[index]),cy:y(row.outputs[index]),r:8,class:'production-operating'}));
  svg.append(svgElement('circle',{cx:x(probe),cy:y(value),r:5,class:'production-sample'}));
  annotate(svg,60,21,`${selected} · Production f(x)`); annotate(svg,480,318,'Alimentation x',{'text-anchor':'end'});
  $('production-probe-result').textContent = `x = ${number(probe)} → f(x) = ${number(value)}`;
  $('production-law-values').replaceChildren(element('p',`${selected} · paramètres appliqués : a=${precise(machine.a)}, b=${precise(machine.b)}, c=${precise(machine.c)}, d=${precise(machine.d)}.`), element('p',`Au cycle ${cycle} : alimentation x(${cycle-1})=${number(row.input[index])} → production y(${cycle})=${number(row.outputs[index])}.`));
}
function drawHistory() {
  const svg = $('production-history-chart'); clearSvg(svg);
  const x = index => 55+770*index/simulation.cycles, y = value => 250-210*value;
  [0,.5,1].forEach(value => {svg.append(svgElement('line',{x1:55,y1:y(value),x2:825,y2:y(value),class:'production-chart-grid'})); annotate(svg,42,y(value)+5,number(value),{'text-anchor':'end'});});
  for (const tick of new Set([0,Math.round(simulation.cycles/4),Math.round(simulation.cycles/2),Math.round(simulation.cycles*3/4),simulation.cycles])) annotate(svg,x(tick),274,String(tick),{'text-anchor':'middle'});
  model.machines.forEach((machine,index) => svg.append(svgElement('polyline',{points:simulation.history.map(row=>`${x(row.index)},${y(row.outputs[index])}`).join(' '),class:'production-series',stroke:palette[index],'stroke-dasharray':['none','8 6','1 6'][index]})));
  svg.append(svgElement('line',{x1:x(cycle),y1:35,x2:x(cycle),y2:250,stroke:'var(--ink)','stroke-dasharray':'3 3'}));
  annotate(svg,55,22,'Production y'); annotate(svg,825,297,'Cycle',{'text-anchor':'end'});
}
function fillHistory() {
  const view = table(['Cycle','M1','M2','M3','Examiner'],'Productions depuis l’état initial');
  simulation.history.forEach(row => {
    const tr = element('tr'); tr.dataset.cycle = row.index;
    tr.append(element('td',String(row.index)),...row.outputs.map(value=>element('td',number(value))));
    const action = element('td');
    if (row.index > 0) {
      const button = element('button','Voir'); button.type='button'; button.setAttribute('aria-label',`Examiner le cycle ${row.index}`);
      button.addEventListener('click',()=>{cycle=row.index;renderCycle();}); action.append(button);
    } else action.textContent='État initial';
    tr.append(action); view.body.append(tr);
  }); $('production-history').replaceChildren(view.wrap);
}
function inspect(row) {
  const machine = currentMachine(), index = indexOf(selected);
  const incoming = row.flows.filter(flow=>flow.to===selected && flow.fraction>0), outgoing = row.flows.filter(flow=>flow.from===selected && flow.fraction>0);
  const sources = incoming.length ? incoming.map(flow=>`${flow.from} : ${number(flow.sent)} livré × κ=${number(flow.conversion)} = ${number(flow.offered)} offert`).join(' ; ') : 'Aucun fournisseur interne dans ce réglage.';
  const destinations = outgoing.length ? outgoing.map(flow=>`${flow.to} : r=${number(flow.fraction)}, soit ${number(flow.nextSent)} de production livrée et ${number(flow.nextOffered)} d’alimentation offerte`).join(' ; ') : 'Aucune production affectée à une autre machine.';
  const region = row.input[index] <= machine.a ? 'le plateau nul' : row.input[index] <= machine.b ? 'le segment croissant (éventuellement nul si c=0)' : machine.d < machine.c ? 'le segment décroissant' : 'le plateau final';
  renderInspector({edge:selected,variant:'1b',anchorPrefix:`machine-${selected}-1b`,title:`${selected} · Alimentation et production`,summary:`Cas 1b : des attributs d’alimentation vers un attribut de production. Nombres normalisés entre 0 et 1, natures différentes. État examiné au cycle ${cycle}.`,points:[
    {title:'Rassembler les alimentations',tip:'Les productions du cycle précédent fournissent les contributions internes ; l’apport externe s’ajoute séparément.',paragraphs:[`Pour produire au cycle ${cycle}, on utilise l’état y(${cycle-1}). Apport externe constant : e=${number(machine.external)}. Contributions internes : ${sources}`,`Alimentation offerte : ${number(row.rawInput[index])}. Alimentation retenue x(${cycle-1})=${number(row.input[index])} ; excédent non absorbé : ${number(row.overflow[index])}. Le plafonnement à 1 ne distribue pas cet excédent entre les fournisseurs.`, 'Statut : apports, coefficients, loi et état initial supposés ; taux ultérieurs calculés. La conversion κ rend les contributions compatibles dans le modèle abstrait, sans établir un bilan énergétique industriel.']},
    {title:'Appliquer la loi à seuil et deux segments',tip:'TH applique f à l’alimentation totale retenue. Les mêmes productions précédentes alimentent toutes les machines.',paragraphs:[`Paramètres appliqués : a=${precise(machine.a)}, b=${precise(machine.b)}, c=${precise(machine.c)}, d=${precise(machine.d)}. f(x)=0 jusqu’à a ; c(x−a)/(b−a) jusqu’à b ; c+(d−c)(x−b)/(1−b) ensuite.`,`x=${number(row.input[index])} se situe sur ${region}. Résultat : f(x)=${number(row.outputs[index])}. La production maximale de cette seule machine est c, atteinte en b (éventuellement sur un plateau).`, 'La mise à jour est simultanée et comporte un décalage d’un cycle. Ce n’est pas une résolution par ordre de visite des nœuds, ni une recherche de plus court chemin ou d’optimum global.']},
    {title:'Produire et répartir la sortie',tip:'Les parts livrées sont disponibles au prochain cycle. Le reste de la production sort du périmètre.',paragraphs:[`Résultat calculé : y(${cycle})=${number(row.outputs[index])}. Répartition pour le cycle ${cycle+1} : ${destinations}`,`Part de production sortant de l’atelier : ${number(row.externalOutputs[index])}. Les fractions envoyées et la fraction restante se partagent la sortie de ${selected}, sans double comptage.`, 'Le reste de production n’est pas l’excédent d’alimentation. Les natures des grandeurs et les références de normalisation restent distinctes.']}
  ],assessment:`Contrôle de répartition de ${selected} : productions livrées + production externe = ${number(row.outputs[index])}. Le calcul porte sur une machine et ses unités de référence. Une somme brute des productions de machines différentes ne mesure pas à elle seule la valeur produite par l’entreprise.`});
  const links = element('p',undefined,'production-inspector-links');
  incoming.forEach(flow=>{const a=element('a',`Source ${flow.from} / 3.0`);a.href=`#machine-${flow.from}-1b-3.0`;links.append(a);});
  outgoing.forEach(flow=>{const a=element('a',`Destination ${flow.to} / 1.0`);a.href=`#machine-${flow.to}-1b-1.0`;links.append(a);});
  const existing = $('production-inspector').querySelector('.production-inspector-links');
  if (existing) existing.replaceWith(links); else $('production-inspector').append(links);
  // Links preserve the inspected cycle; the paragraphs identify which transition is described.
  links.append(element('span','Liens vers les analyses au même cycle ; les échanges décrits portent sur des cycles consécutifs.','small-note'));
}
function renderCycle() {
  const row = simulation.history[cycle];
  $('production-cycle').value=String(cycle); $('production-cycle-value').textContent=`${cycle} sur ${simulation.cycles}`;
  $('production-previous').disabled=cycle<=1; $('production-next').disabled=cycle>=simulation.cycles;
  const state = table(['Machine','Alimentation offerte','Alimentation retenue','Excédent non absorbé','Production','Production externe'],`Cycle ${cycle} : entrées issues du cycle ${cycle-1}, puis productions`);
  model.machines.forEach((machine,index)=>{
    const tr=element('tr'), cell=element('td'), link=element('a',machine.id); link.href=`#machine-${machine.id}-1b`;cell.append(link);
    tr.append(cell,...[row.rawInput[index],row.input[index],row.overflow[index],row.outputs[index],row.externalOutputs[index]].map(value=>element('td',number(value))));state.body.append(tr);
  }); $('production-state').replaceChildren(state.wrap);
  const flows=table(['De → Vers','Fraction de sortie r','Production livrée','Alimentation offerte (κ=1)'],`Transferts du cycle ${cycle} vers ${cycle+1}`);
  row.flows.filter(flow=>flow.fraction>0).forEach(flow=>{const tr=element('tr');tr.append(...[`${flow.from} → ${flow.to}`,number(flow.fraction),number(flow.nextSent),number(flow.nextOffered)].map(value=>element('td',value)));flows.body.append(tr);});
  $('production-flows').replaceChildren(flows.body.children.length?flows.wrap:element('p','Aucun transfert interne ; toute la production sort du périmètre.'));
  if (row.overflow.some(value=>value>0)) $('production-state').append(element('p','L’alimentation offerte dépasse la capacité 1 pour au moins une machine. L’excédent affiché n’est pas stocké.','production-alert'));
  document.querySelectorAll('#production-history [data-cycle]').forEach(tr=>tr.toggleAttribute('data-current',Number(tr.dataset.cycle)===cycle));
  drawMap(row); drawCurve(row); drawHistory(); inspect(row);
}
function renderRun() {
  $('production-cycle').max=String(simulation.cycles);
  const paragraphs=[element('p',`Calcul de ${simulation.cycles} cycles à partir des productions initiales renseignées. Résidu après le dernier cycle : ${simulation.residual.toExponential(3)} ; tolérance ${tolerance.toExponential(0)}.`)];
  paragraphs.push(element('p',simulation.status==='approximate'?'L’état final serait presque inchangé par un cycle supplémentaire, à la tolérance choisie. Ce constat ne prouve ni sa stabilité ni un optimum.':'L’état final varie encore de plus que la tolérance sur un cycle supplémentaire. L’horizon calculé ne permet pas d’annoncer une stabilisation.',simulation.status==='approximate'?'graph-assessment':'production-alert'));
  if (simulation.period2Observed) paragraphs.push(element('p','Une alternance de période 2 est observée en fin de calcul à la tolérance choisie. Le graphe temporel permet d’examiner cette alternance ; ce diagnostic ne classe pas tous les comportements possibles.','production-alert'));
  $('production-results').replaceChildren(...paragraphs); fillHistory(); renderCycle();
}
function restoreMachine(scroll=true) {
  const match=/^#machine-(M[1-3])-1b(?:-([1-3])\.0)?$/.exec(location.hash); if(!match)return;
  rememberDraft(); selected=match[1]; $('production-machine').value=selected; showDraft();renderCycle();
  if(scroll)requestAnimationFrame(()=>{const target=match[2]?$(location.hash.slice(1)):$('production-inspector');target.scrollIntoView({block:'start'});if(match[2])target.focus({preventScroll:true});else{$('inspector-title').tabIndex=-1;$('inspector-title').focus({preventScroll:true});}});
}

try {
  $('production-controls').addEventListener('submit',event=>{event.preventDefault();applySettings();});
  $('load-production-preset').addEventListener('click',()=>setScenario($('production-preset').value));
  $('production-machine').addEventListener('change',()=>{rememberDraft();selected=$('production-machine').value;showDraft();history.replaceState(null, '', `#machine-${selected}-1b`);renderCycle();});
  $('production-probe').addEventListener('input',()=>drawCurve(simulation.history[cycle]));
  $('production-cycle').addEventListener('input',()=>{cycle=Number($('production-cycle').value);renderCycle();});
  $('production-previous').addEventListener('click',()=>{if(cycle>1){cycle--;renderCycle();}});
  $('production-next').addEventListener('click',()=>{if(cycle<simulation.cycles){cycle++;renderCycle();}});
  $('production-prime').addEventListener('click',()=>{rememberDraft();drafts.forEach(draft=>{draft.initial='0.8';});showDraft();applySettings();});
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#machine-"]');
    if (link && link.getAttribute('href') === location.hash) {
      event.preventDefault(); restoreMachine(true);
    }
  });
  window.addEventListener('hashchange',()=>restoreMachine());
  setScenario('balanced'); restoreMachine(Boolean(location.hash));
  $('load-production-preset').disabled=false;$('production-controls').querySelector('[type=submit]').disabled=false;
} catch(error) { $('production-error').textContent=`L’atelier n’a pas pu démarrer : ${error.message}`; }
