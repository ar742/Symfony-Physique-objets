import {CITY_GRAPH, distance, weightedCityGraph, dijkstra, bellmanFord, floydWarshall, enumerateSimplePaths, dependentRoutes} from './graph-engine.mjs';

const $ = id => document.getElementById(id);
const number = value => new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 3}).format(value);
const sequence = path => path.join(' → ');
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}
function table(headers, caption) {
  const wrap = element('div', undefined, 'graph-table-wrap');
  const node = element('table', undefined, 'graph-table');
  if (caption) node.append(element('caption', caption));
  const head = element('thead'), row = element('tr'), body = element('tbody');
  headers.forEach(text => { const th = element('th', text); th.scope = 'col'; row.append(th); });
  head.append(row); node.append(head, body); wrap.append(node);
  return {wrap, body};
}
function branchHash(edge, variant, point = '') {
  return `#branche-${edge}-${variant}${point ? `-${point}.0` : ''}`;
}
function renderInspector(model) {
  $('branch-coordinate').textContent = `${model.edge} · Cas ${model.variant} · Trois positions`;
  $('inspector-title').textContent = model.title;
  $('branch-summary').textContent = model.summary;
  const nodes = [...document.querySelectorAll('.graph-inspector [data-loop-node]')];
  model.points.forEach((point, index) => {
    const id = index + 1, coordinate = `${model.edge} / ${id}.0`;
    const section = document.querySelector(`[data-graph-point="${id}"]`);
    section.id = branchHash(model.edge, model.variant, id).slice(1);
    section.querySelector('.eyebrow').textContent = `${coordinate} · ${['Exp. IN', 'TH', 'Exp. OUT'][index]}`;
    section.querySelector('h3').textContent = point.title;
    section.querySelector('.graph-point-content').replaceChildren(...point.paragraphs.map(text => element('p', text)));
    const node = nodes[index];
    const anchor = node.querySelector('a');
    anchor.href = `#${section.id}`;
    if (anchor.hash === location.hash) anchor.setAttribute('aria-current', 'location');
    else anchor.removeAttribute('aria-current');
    node.querySelector('.step-number').textContent = `${id}.0`;
    node.querySelector('.step-subtitle').textContent = point.title;
    node.querySelector('.loop-tooltip').textContent = point.tip;
    node.querySelector('.tip-toggle').setAttribute('aria-label', `À propos de ${coordinate} : ${point.title}`);
  });
  $('branch-assessment').textContent = model.assessment;
}
function installBranchNavigation(select, variant, available, render, inspectorId) {
  function restore(scroll) {
    const match = /^#branche-([A-Z]-[A-Z])-(1[ab])(?:-([123])\.0)?$/.exec(location.hash);
    if (!match || !available.includes(match[1]) || (!variant && match[2] !== '1a')) return;
    select.value = match[1];
    if (variant) variant.value = match[2];
    render();
    if (scroll) requestAnimationFrame(() => {
      const target = match[3] ? $(location.hash.slice(1)) : $(inspectorId);
      target.scrollIntoView({block: 'start'});
      if (match[3]) target.focus({preventScroll: true});
      else {
        const title = $('inspector-title'); title.tabIndex = -1; title.focus({preventScroll: true});
      }
    });
  }
  function navigate() {
    const hash = branchHash(select.value, variant ? variant.value : '1a');
    if (location.hash === hash) restore(true); else location.hash = hash;
  }
  select.addEventListener('change', navigate);
  variant?.addEventListener('change', navigate);
  window.addEventListener('hashchange', () => restore(true));
  render(); restore(Boolean(location.hash));
}
function addEdge(svg, edge, from, to, label, {directed = false, external = false, labelOffset = [0, -10]} = {}) {
  const link = svgElement('a', {href: branchHash(edge, '1a'), class: 'graph-edge', 'data-edge': edge, 'aria-label': `Examiner la branche ${edge.replace('-', ' vers ')} : ${label}`});
  if (external) link.dataset.external = '';
  link.append(svgElement('title', {}, `${edge.replace('-', ' → ')} · ${label} · Cliquer pour l’analyse Exp.–TH–Exp.`));
  const position = {x1: from.x, y1: from.y, x2: to.x, y2: to.y};
  link.append(svgElement('line', {...position, class: 'edge-hit'}));
  link.append(svgElement('line', {...position, class: 'edge-line'}));
  link.append(svgElement('line', {...position, class: 'edge-selected'}));
  if (directed) {
    const t = .77, x = from.x + t * (to.x - from.x), y = from.y + t * (to.y - from.y);
    const angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    link.append(svgElement('path', {d: 'M -8 -5 L 0 0 L -8 5', transform: `translate(${x} ${y}) rotate(${angle})`, fill: 'none', stroke: 'currentColor', 'stroke-width': 2}));
  }
  link.append(svgElement('text', {x: (from.x + to.x) / 2 + labelOffset[0], y: (from.y + to.y) / 2 + labelOffset[1], class: 'edge-label', 'text-anchor': 'middle'}, label));
  svg.append(link);
}
function addCity(svg, node, x, y, subtitle = '') {
  const group = svgElement('g', {class: 'graph-city'});
  group.append(svgElement('circle', {cx: x, cy: y, r: 17}));
  group.append(svgElement('text', {x, y: y + 5}, node.id));
  if (subtitle) group.append(svgElement('text', {x, y: y + 34, class: 'city-name'}, subtitle));
  svg.append(group);
}
function markMap(svg, selectedEdge, path, undirected = false) {
  const edges = new Set(path.slice(1).map((node, i) => `${path[i]}-${node}`));
  svg.querySelectorAll('[data-edge]').forEach(link => {
    const id = link.dataset.edge, reverse = id.split('-').reverse().join('-');
    link.toggleAttribute('data-on-path', edges.has(id) || (undirected && edges.has(reverse)));
    const selected = id === selectedEdge || (undirected && reverse === selectedEdge);
    link.toggleAttribute('data-selected', selected);
    if (selected) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current');
  });
}

function startCities() {
  const graph = weightedCityGraph(), cities = new Map(CITY_GRAPH.nodes.map(node => [node.id, node]));
  const branchSelect = $('graph-branch'), variantSelect = $('branch-variant'), map = $('city-map');
  const edges = CITY_GRAPH.edges.flatMap(edge => [`${edge.from}-${edge.to}`, `${edge.to}-${edge.from}`]);
  let selectedPath = [], routes = [], page = 0;
  const pageSize = 20;
  const position = node => ({x: 90 + node.x * 40, y: 375 - node.y * 40});
  CITY_GRAPH.edges.forEach(edge => {
    const from = cities.get(edge.from), to = cities.get(edge.to);
    const offset = edge.id === 'BD' ? [22, 0] : edge.id === 'AC' ? [-22, 0] : [0, -10];
    addEdge(map, `${edge.from}-${edge.to}`, position(from), position(to), `${number(distance(from, to))}`, {labelOffset: offset});
  });
  CITY_GRAPH.nodes.forEach(node => {
    const {x, y} = position(node);
    addCity(map, node, x, y, `${node.name} (${node.x}, ${node.y})`);
    for (const id of ['graph-start', 'graph-end']) $(id).querySelector(`[value="${node.id}"]`).textContent = `${node.id} · ${node.name}`;
  });
  map.append(svgElement('text', {x: 20, y: 25, class: 'graph-axis'}, 'Plan (x, y) · coordonnées et longueurs en km'));
  branchSelect.replaceChildren(...edges.map(id => { const option = element('option', id.replace('-', ' → ')); option.value = id; return option; }));

  function inspect() {
    const [a, b] = branchSelect.value.split('-'), from = cities.get(a), to = cities.get(b), variant = variantSelect.value;
    const length = distance(from, to), pair = `(${from.x}, ${from.y}) → (${to.x}, ${to.y}) km`;
    const formula = `d = √[(${to.x} − ${from.x})² + (${to.y} − ${from.y})²] km = ${number(length)} km (affichage arrondi).`;
    const points = variant === '1a' ? [
      {title: `Position de ${from.name}`, tip: 'La position initiale est supposée. La destination est une donnée du contexte, déjà fixée.', paragraphs: [`Attribut principal suivi : position de ${a}, r${a} = (${from.x}, ${from.y}) km, dans le repère plan commun. Statut : coordonnée fictive supposée.`, `Contexte : l’extrémité ${b}, de position (${to.x}, ${to.y}) km, et la liaison ${a}–${b} sont fixées. Le choix des liaisons est une contrainte du réseau ; toutes les paires ne sont pas reliées directement.`]},
      {title: 'Calculer la longueur de la liaison', tip: 'La norme euclidienne utilise les deux positions connues ; elle ne prédit pas la destination.', paragraphs: [formula, `TH utilise la position d’entrée et celle de l’extrémité fixée pour attribuer un coût à la liaison. L’unité du repère est le kilomètre ; le trajet direct autorisé est modélisé par un segment.`, `Relation logique et géométrique : la sortie désigne l’extrémité de la liaison examinée. On ne déduit pas la position de ${b} de celle de ${a} seule ; aucune dynamique de déplacement n’est calculée ici.`]},
      {title: `Position de ${to.name}`, tip: 'Même type d’attribut principal : position dans le même repère. La distance est le coût dérivé de la liaison.', paragraphs: [`Attribut principal de sortie : r${b} = (${to.x}, ${to.y}) km. Cette position était fixée par la définition de la branche. La longueur ${number(length)} km, calculée en 2.0, est un attribut dérivé de la liaison, distinct de la position.`, `Raccord : pour continuer de ${b} vers une autre ville, cette position devient l’entrée de la branche suivante. Les longueurs s’additionnent au niveau du parcours. Le schéma ne ferme pas automatiquement une boucle 3 → 1.`]}
    ] : [
      {title: 'La géométrie des deux extrémités', tip: 'L’entrée est la paire des positions, supposée et exprimée dans un même repère.', paragraphs: [`Attributs principaux : la paire ordonnée des positions ${pair}. Statut : géométrie fictive supposée.`, `Contexte : plan euclidien, repère commun, liaison directe autorisée. La question porte sur la longueur de cette liaison.`]},
      {title: 'Appliquer la distance euclidienne', tip: 'Soustraire les coordonnées, puis calculer la norme du déplacement.', paragraphs: [formula, 'TH transforme une paire de positions en un scalaire de longueur. Le coût obtenu est positif, fixe et indépendant des autres liaisons.']},
      {title: 'La distance comme résultat', tip: 'La sortie est une longueur scalaire ; elle diffère de la paire de positions donnée en entrée.', paragraphs: [`Résultat calculé : d = ${number(length)} km. Cas 1b : entrée géométrique et sortie scalaire de nature différente.`, `Le résultat alimente l’addition des coûts d’un parcours. Il ne fournit pas, à lui seul, les positions nécessaires à la branche suivante : le réseau conserve séparément les identifiants et les coordonnées des villes.`]}
    ];
    renderInspector({edge: branchSelect.value, variant, title: `${a} → ${b} · ${from.name} vers ${to.name}`, summary: variant === '1a' ? 'Cas 1a : mêmes attributs principaux de position, valeurs éventuellement différentes ; longueur calculée comme propriété de la liaison.' : 'Cas 1b : la question devient « quelle distance pour cette paire de positions ? ». Le réseau et ses coûts restent identiques.', points, assessment: `Contrôle de cohérence : d ≥ 0, d(${a}, ${b}) = d(${b}, ${a}) et coordonnées dans le même repère. Ce contrôle géométrique ne constitue pas une mesure ni une validation d’un itinéraire réel.`});
    markMap(map, branchSelect.value, selectedPath, true);
    map.querySelectorAll('[data-edge]').forEach(link => { link.setAttribute('href', branchHash(link.dataset.edge, variant)); });
  }
  function highlight(path, label) {
    selectedPath = path;
    markMap(map, branchSelect.value, selectedPath, true);
    $('highlight-label').textContent = path.length ? `${label} : ${sequence(path)}.` : 'Aucun parcours affiché.';
    document.querySelectorAll('[data-route]').forEach(row => row.toggleAttribute('data-current', row.dataset.route === path.join('-')));
  }
  function pathButton(path, label) {
    const button = element('button', 'Voir'); button.type = 'button';
    button.setAttribute('aria-label', `Afficher ${label} : ${sequence(path)}`);
    button.addEventListener('click', () => highlight(path, label));
    return button;
  }
  function renderRoutes() {
    const totalPages = Math.max(1, Math.ceil(routes.length / pageSize));
    if (!routes.length) $('route-results').replaceChildren(element('p', 'Aucun chemin simple ne satisfait cette borne dans le périmètre choisi.'));
    else {
      const view = table(['Villes parcourues', 'Distance (km)', 'Carte']);
      routes.slice(page * pageSize, (page + 1) * pageSize).forEach(route => {
        const row = element('tr'); row.dataset.route = route.path.join('-');
        const action = element('td'); action.append(pathButton(route.path, 'Parcours choisi'));
        row.append(element('td', sequence(route.path)), element('td', number(route.distance)), action); view.body.append(row);
      });
      $('route-results').replaceChildren(view.wrap);
    }
    $('routes-page').textContent = routes.length ? `Page ${page + 1} sur ${totalPages} · ${routes.length} parcours au total` : '0 parcours';
    $('routes-previous').disabled = page === 0; $('routes-next').disabled = page + 1 >= totalPages;
    document.querySelectorAll('[data-route]').forEach(row => row.toggleAttribute('data-current', row.dataset.route === selectedPath.join('-')));
  }
  function calculate() {
    try {
      const start = $('graph-start').value, end = $('graph-end').value, limit = $('graph-limit').valueAsNumber;
      const all = $('graph-scope').value === 'all';
      if (!all && start === end) throw new Error('Choisissez deux villes différentes pour comparer les plus courts chemins.');
      if (!Number.isFinite(limit) || limit < 0 || limit > 1000) throw new Error('Indiquez une borne comprise entre 0 et 1 000 km.');
      const computed = [['Dijkstra', dijkstra(graph, start, end)], ['Bellman–Ford', bellmanFord(graph, start, end)], ['Floyd–Warshall', floydWarshall(graph, start, end)]];
      routes = enumerateSimplePaths(graph, {start: all ? null : start, end: all ? null : end, maxDistance: limit}); page = 0;
      const view = table(['Méthode', 'Un chemin minimal', 'km', 'Carte'], `De ${start} à ${end}, sans contrainte de borne`);
      computed.forEach(([name, result]) => {
        const row = element('tr'); row.dataset.route = result.path.join('-');
        const action = element('td'); if (result.path.length) action.append(pathButton(result.path, name));
        row.append(element('td', name), element('td', result.path.length ? sequence(result.path) : 'Aucun chemin'), element('td', number(result.distance)), action); view.body.append(row);
      });
      const minimum = computed[0][1].distance;
      const agreement = computed.every(([,result]) => Math.abs(result.distance - minimum) < 1e-9);
      const status = element('p', `${agreement ? 'Les trois méthodes donnent la même distance minimale' : 'Écart entre les méthodes à examiner'} : ${number(minimum)} km. ${minimum < limit ? 'Ce minimum est strictement sous la borne choisie.' : 'Ce minimum ne satisfait pas la borne stricte choisie.'}`, 'graph-assessment');
      if (start === end) status.textContent = 'Départ et arrivée confondus : les algorithmes donnent le chemin trivial de distance nulle. Il ne fait pas partie de l’énumération, qui exige au moins une liaison et aucune ville répétée.';
      $('algorithm-results').replaceChildren(view.wrap, status);
      $('route-summary').textContent = `${routes.length} chemins simples de distance < ${number(limit)} km · ${all ? 'toutes les paires ordonnées (les inverses sont distincts)' : `de ${start} à ${end}`}. Tri par distance, puis nombre de liaisons et suite de villes.`;
      renderRoutes(); highlight(computed[0][1].path, 'Chemin minimal'); $('graph-error').textContent = '';
    } catch (error) {
      $('graph-error').textContent = error.message;
      routes = []; page = 0; renderRoutes(); highlight([], '');
      $('algorithm-results').replaceChildren(element('p', 'Corrigez les paramètres pour calculer.'));
      $('route-summary').textContent = 'Recherche non effectuée : paramètres invalides.';
    }
  }
  $('city-controls').addEventListener('submit', event => { event.preventDefault(); calculate(); });
  $('routes-previous').addEventListener('click', () => { page--; renderRoutes(); });
  $('routes-next').addEventListener('click', () => { page++; renderRoutes(); });
  installBranchNavigation(branchSelect, variantSelect, edges, inspect, 'branch-inspector');
  calculate(); $('city-controls').querySelector('[type=submit]').disabled = false;
}

function startDependencies() {
  const map = $('dependency-map'), branchSelect = $('dependency-branch');
  const points = {A:{x:65,y:175}, B:{x:280,y:90}, C:{x:280,y:265}, D:{x:535,y:175}, P:{x:65,y:30}};
  const edges = ['P-B', 'A-B', 'B-D', 'A-C', 'C-D'];
  let state = dependentRoutes(20);
  edges.forEach(edge => { const [from, to] = edge.split('-'); addEdge(map, edge, points[from], points[to], '', {directed:true, external:edge === 'P-B'}); });
  Object.entries(points).forEach(([id, {x,y}]) => addCity(map, {id}, x, y));
  function currentPath() { return state.routes.find(route => route.id === $('dependency-route').value); }
  function inspect() {
    const edge = branchSelect.value, [from, to] = edge.split('-'), q = state.load;
    let model;
    if (edge === 'P-B') model = {
      edge, variant:'1a', title:'P → B · Débit externe transmis', summary:'Cas 1a : le même attribut de débit est suivi à l’entrée et à la sortie de la branche d’alimentation.',
      points:[
        {title:'Débit à l’entrée de l’alimentation', tip:'Un débit externe fixé, supposé stationnaire, distinct du voyageur optimisé.', paragraphs:[`Attribut principal supposé : qentrée = ${number(q)} véhicules/min à P. P est une source extérieure au trajet A → D.`, 'Hypothèses : régime stationnaire, absence d’accumulation, de pertes et de sources intermédiaires dans cette branche.']},
        {title:'Conserver le nombre de véhicules', tip:'Sans accumulation ni source, le bilan stationnaire transmet le débit entrant.', paragraphs:['Bilan du nombre N de véhicules dans la branche : dN/dt = qentrée − qsortie. Le régime stationnaire impose dN/dt = 0 ; on obtient qsortie = qentrée.', 'Relation de bilan sous hypothèses. Cette branche ne décrit pas la durée de parcours depuis P et ne simule pas des véhicules individuels.']},
        {title:'Débit fourni à l’environnement de B → D', tip:'La sortie alimente un paramètre de la branche B → D ; elle ne remplace pas l’état du voyageur.', paragraphs:[`Résultat calculé sous ces hypothèses : qsortie = ${number(q)} véhicules/min. Même attribut de débit : cas 1a.`, 'Dépendance explicite : P-B / 3.0 → environnement de B-D / 1.0. Ce paramètre entre dans la loi de durée de B → D ; le voyageur étudié ne modifie pas q.']}
      ], assessment:'Contrôle de bilan interne : débit entrant = débit sortant, sous stationnarité et absence d’accumulation. Il faudrait un modèle transitoire pour relâcher ces hypothèses.'
    };
    else {
      const durations = {'A-B':2,'B-D':2+q/10,'A-C':4,'C-D':4};
      const entry = {A:0,B:2,C:4}[from], duration = durations[edge], arrival = entry + duration;
      model = {edge, variant:'1a', title:`${from} → ${to} · Position et heure`, summary:'Cas 1a à plusieurs attributs : (position, heure) en entrée et en sortie. La durée calculée transforme l’heure, tandis que la destination de la liaison est fixée.',
        points:[
          {title:`État à ${from}`, tip:'L’entrée conserve la position et l’heure ; le débit est un paramètre externe distinct.', paragraphs:[`Attributs principaux : (position = ${from}, heure = ${number(entry)} min). Le départ est fixé à A, t = 0 ; les heures intermédiaires sont calculées sur le trajet depuis A.`, edge === 'B-D' ? `Environnement : q = ${number(q)} véhicules/min, issu de P-B / 3.0. Destination D fixée ; débit maintenu constant pendant le trajet.` : `Contexte : destination ${to} et durée ${number(duration)} min supposées fixes, indépendantes de q.`]},
          {title:'Calculer la durée et avancer l’horloge', tip:'La loi de branche fournit la durée ; la sortie utilise tarrivée = tdépart + durée.', paragraphs:[edge === 'B-D' ? `cBD = 2 min + (0,1 min²/véhicule) × ${number(q)} véhicules/min = ${number(duration)} min.` : `Durée de cette branche : ${number(duration)} min, paramètre fixé du modèle.`, `Traitement : t${to} = t${from} + c${from}${to} = ${number(entry)} + ${number(duration)} = ${number(arrival)} min. La relation combine un calcul chronologique et la transition vers une destination fixée.`, 'Le coût est additif et figé pour la valeur actuelle de q. Le coût est recalculé quand le curseur change ; il ne s’adapte pas à une évolution de q pendant le trajet.']},
          {title:`État à ${to}`, tip:'La sortie contient le même couple position–heure, utilisable par une branche suivante.', paragraphs:[`Résultat calculé : (position = ${to}, heure = ${number(arrival)} min). La nature des deux attributs est conservée : cas 1a.`, to === 'D' ? 'D est l’arrivée : cette heure donne la durée totale depuis A à t = 0. Elle est comparée à celle de l’autre trajet avec la même valeur de q.' : `Raccord : cet état devient l’entrée de ${to} → D. L’environnement externe reste un paramètre séparé.`]}
        ], assessment:'Contrôle interne : la somme des durées des branches rejoint l’heure finale du voyageur. Ce résultat repose sur le même état figé du réseau ; il ne démontre ni un équilibre de trafic ni un optimum en régime évolutif.'};
    }
    renderInspector(model); markMap(map, edge, currentPath().path);
  }
  function update() {
    state = dependentRoutes(Number($('external-load').value));
    $('load-value').textContent = `${number(state.load)} véhicules/min`;
    const durations = {'A-B':2,'B-D':2+state.load/10,'A-C':4,'C-D':4};
    map.querySelectorAll('[data-edge]').forEach(link => {
      const id = link.dataset.edge, label = id === 'P-B' ? `q = ${number(state.load)} véh/min` : `${number(durations[id])} min`;
      link.querySelector('.edge-label').textContent = label;
      link.querySelector('title').textContent = `${id.replace('-', ' → ')} · ${label} · Cliquer pour l’analyse.`;
      link.setAttribute('aria-label', `Examiner ${id.replace('-', ' vers ')} : ${label}`);
    });
    const results = state.routes.map(route => element('p', `${sequence(route.path)} : ${number(route.duration)} min.`));
    results.push(element('p', `Minimum : ${number(state.bestDuration)} min · ${state.best.map(route => sequence(route.path)).join(' et ')}${state.best.length > 1 ? ' (égalité).' : '.'}`, 'graph-assessment'));
    $('dependency-results').replaceChildren(...results);
    const costs = element('ul'); Object.entries(durations).forEach(([id,value]) => costs.append(element('li', `${id.replace('-', ' → ')} : ${number(value)} min`)));
    $('global-costs').replaceChildren(costs);
    const route = currentPath(), list = element('ol');
    let time = 0;
    list.append(element('li', 'A · t = 0 min (départ fixé)'));
    route.times.forEach((duration, index) => {
      const entry = element('li'), link = element('a', `${route.path[index]} → ${route.path[index+1]} : +${number(duration)} min`);
      link.href = branchHash(`${route.path[index]}-${route.path[index+1]}`, '1a', 2);
      time += duration; entry.append(link, document.createTextNode(` ; arrivée à t = ${number(time)} min.`)); list.append(entry);
    });
    $('trajectory-results').replaceChildren(list);
    const globalSum = route.path.slice(1).reduce((sum, id, index) => sum + durations[`${route.path[index]}-${id}`], 0);
    $('dependency-check').textContent = `${sequence(route.path)} · somme des coûts du réseau : ${number(globalSum)} min ; heure finale obtenue pas à pas : ${number(time)} min. ${Math.abs(globalSum-time) < 1e-9 ? 'Accord interne pour le même q figé.' : 'Écart à examiner.'} La carte souligne ce trajet, même s’il n’est pas optimal.`;
    inspect();
  }
  $('external-load').addEventListener('input', update);
  $('dependency-route').addEventListener('change', update);
  installBranchNavigation(branchSelect, null, edges, inspect, 'dependency-inspector');
  update();
}

try {
  if (document.querySelector('[data-graph-study="cities"]')) startCities();
  if (document.querySelector('[data-graph-study="dependencies"]')) startDependencies();
} catch (error) {
  const message = element('p', `L’atelier n’a pas pu démarrer : ${error.message}`, 'content-note');
  message.setAttribute('role', 'alert'); document.querySelector('[data-graph-study]')?.prepend(message);
}
