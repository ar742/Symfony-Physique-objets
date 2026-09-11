import {element,svgElement,table} from './graph-studies.mjs';
import {BRANCH_GRAPH} from './branches-engine.mjs';
import {explainBranchesLagrangian} from './branches-lagrangian.mjs';
import {SPLIT_VARIABLES,sampleYieldSurface,sampleLagrangianSurface,sampleFlowSurface,verticalRange,modelForState} from './branch-surfaces-engine.mjs';
import {isInteriorPeakModel} from './branch-interior-example.mjs';
import {analyseInteriorPeakSurface} from './branch-peak-analysis.mjs';
import {explainExactLagrangian,sampleExactLagrangianSurface} from './branches-exact-lagrangian.mjs';

const $=id=>document.getElementById(id);
const num=value=>Number.isFinite(value)?new Intl.NumberFormat('fr-FR',{maximumSignificantDigits:9}).format(value):'—';
const axisNum=value=>new Intl.NumberFormat('fr-FR',{maximumSignificantDigits:5}).format(value);
const scientific=value=>Number.isFinite(value)?value.toExponential(3):'—';
const names={initial:'Partages initiaux',grid:'Meilleur résultat de la grille',global:'Global · fonctions fixées',bounded:'Global · paramètres bornés'};
const unavailable={
    'no-linear-program-needed':'Aucun PL nécessaire : les bornes directes suffisent à ce calcul.',
    'no-recorded-linear-program':'Cette configuration ne dispose pas de multiplicateurs de PL enregistrés.',
    'no-containing-linear-program':'Aucun PL enregistré ne contient la meilleure configuration avec les contrôles requis.',
};

export function createBranchSurfaces({onDemo}={}) {
    let context=null,reference='initial',data=null,diagnostic=null,exact=null,calculus=null,autoReference=true,lastState=null,lastResult=null,lastGrid=null;
    let mode='flows',sampleX='x12',sampleY='x23',pendingDemo=null;
    const select=$('branches-surface-reference'),modeSelect=$('branches-surface-mode');
    const xSelect=$('branches-surface-x'),ySelect=$('branches-surface-y');
    const state=()=>reference==='initial'?context.initial:context.results[reference]?.best;
    const result=()=>context.results[reference];
    const centerKey=()=>reference==='bounded'?reference:'global';
    const centerReady=()=>context?.results[centerKey()]?.best&&context.phases[centerKey()]!=='running';
    const finite=point=>point&&Number.isFinite(point.z);
    const pathThrough=(points,project)=>{
        let pen=false,path='';for(const point of points){if(!finite(point)){pen=false;continue;}const p=project(point);path+=(pen?' L ':' M ')+p.x+' '+p.y;pen=true;}return path;
    };
    function center() {
        if(!centerReady())return;
        reference=centerKey();select.value=reference;autoReference=false;
        mode='flows';modeSelect.value=mode;sampleX='x12';sampleY='x23';
        const interior=isInteriorPeakModel(modelForState(state()));
        $('branches-surface-radius').value=interior?'.1':'.03';$('branches-surface-scale').value='local';
        $('branches-surface-resolution').value=interior?'60':'40';
        $('branches-surface-yaw').value='35';$('branches-surface-pitch').value='35';refresh(true);
        requestAnimationFrame(()=>$('branches-surface-focus').scrollIntoView({block:'start'}));
    }
    function widen() {
        if(!state())return;
        mode='flows';modeSelect.value=mode;sampleX='x12';sampleY='x23';
        $('branches-surface-radius').value='.15';$('branches-surface-resolution').value='60';
        $('branches-surface-scale').value='local';refresh(true);
    }
    function choices() {
        if(mode==='flows') {
            for(const [control,value,label] of [[xSelect,'x12','u = x₁₂ · Entrée allouée à 1→2'],[ySelect,'x23','v = x₂₃ · Entrée dérivée vers 2→3']]) {
                const option=element('option',label);option.value=value;control.replaceChildren(option);control.disabled=true;
            }
            return;
        }
        if(mode==='nlp') {
            const ids=['1-2','2-3','2-8'];
            if(!ids.includes(sampleX))sampleX=ids[0];
            if(!ids.includes(sampleY)||sampleX===sampleY)sampleY=ids.find(id=>id!==sampleX);
            for(const [control,value] of [[xSelect,sampleX],[ySelect,sampleY]]) {
                control.replaceChildren(...ids.map(id=>{const option=element('option','x'+id.replace('-','')+' · Entrée '+id.replace('-','→'));option.value=id;return option;}));
                control.value=value;control.disabled=!exact?.available;
            }
            return;
        }
        if(mode==='lagrangian'&&!diagnostic?.available) {
            for(const control of [xSelect,ySelect]) {const option=element('option','Variable de PL indisponible');option.value='unavailable';control.replaceChildren(option);control.disabled=true;}
            return;
        }
        const variables=mode==='lagrangian'&&diagnostic?.available
            ?diagnostic.variableNames.map((label,index)=>({id:String(index),label}))
            :SPLIT_VARIABLES;
        const valid=variables.map(variable=>variable.id);
        if(!valid.includes(sampleX))sampleX=valid[0];
        if(!valid.includes(sampleY)||sampleX===sampleY)sampleY=valid.find(id=>id!==sampleX);
        for(const [control,value] of [[xSelect,sampleX],[ySelect,sampleY]]) {
            control.replaceChildren(...variables.map(variable=>{const option=element('option',variable.label);option.value=variable.id;return option;}));
            control.value=value;control.disabled=mode==='lagrangian'&&!diagnostic?.available;
        }
    }
    function renderDiagnostic() {
        const zone=$('branches-lagrangian-diagnostic');zone.replaceChildren();
        if(!diagnostic?.available) {
            zone.append(element('p',unavailable[diagnostic?.reason]||'Le diagnostic du lagrangien n’est pas disponible pour cet état.'));
            if(diagnostic?.reason==='no-linear-program-needed') {
                const r=result(),certificates=r.certificates;
                zone.append(element('p','Borne directe = min(1 ; borne des trois arrivées '+num(certificates.terminalBound)+' ; borne de source '+num(certificates.sourceBound)+') = '+num(Math.min(1,certificates.terminalBound,certificates.sourceBound))+'. Rendement réalisable '+num(r.best.production)+' ; écart global '+scientific(r.gap)+'. La borne des arrivées additionne les maxima permis des trois branches terminales.'));
            }
            if(diagnostic?.sourceCertificate)zone.append(element('p','Certificat de source : max₀≤t≤₁ [G₁₂(t)+G₁₅(1−t)] = '+num(diagnostic.sourceCertificate.rawMaximum)+', borne avec marge '+num(diagnostic.sourceCertificate.upperBound)+'. '+(reference==='bounded'?'G désigne l’enveloppe supérieure des productions permises par les plages de paramètres.':'G désigne la production de la branche à lois fixées.')+' Cette preuve ne produit pas de multiplicateurs de PL.'));
            return;
        }
        const d=diagnostic;
        zone.append(element('h3','Le lagrangien enregistré · PL '+d.recordId));
        zone.append(element('p','Parmi '+d.selection.candidates+' PL réellement résolus contenant cette configuration, celui-ci donne la borne de relaxation la plus serrée. Ses '+d.c.length+' variables z et '+d.A.length+' contraintes sont exprimées ci-dessous dans leurs unités originales. Les bilans de nœuds ont été éliminés algébriquement. Ce PL couvre une région du réseau ; la preuve globale réunit les bornes de toutes les régions.'));
        const terms=d.lagrangian.coefficients.map((coefficient,j)=>({coefficient,name:d.variableNames[j]}));
        const visible=terms.filter(term=>Math.abs(term.coefficient)>1e-10);
        const equation='L(z, λ̄) ≈ '+num(d.lagrangian.constant)+visible.map(term=>(term.coefficient<0?' − ':' + ')+num(Math.abs(term.coefficient))+' × '+term.name).join('');
        zone.append(element('p',equation,'branch-formula'));
        zone.append(element('p','Expression affichée arrondie ; coefficients de module ≤10⁻¹⁰ omis ici seulement. Le calcul, les tableaux et l’export conservent tous les coefficients. λ̄ reste fixé aux multiplicateurs de ce PL.'));
        const values=table(['Grandeur','Valeur'],'Valeurs au meilleur état réalisable et bornes associées');
        [ ['Rendement r de la configuration',d.atBest.objective],['L(z*, λ̄)',d.atBest.lagrangian],['Supremum de L sur 0≤z≤U, avant marge',d.lagrangian.boxSupremum],['Borne de cette relaxation, avec marge',d.upperBounds.relaxation],['Borne globale, toutes régions',d.upperBounds.global],['Écart global au rendement',Math.max(0,d.upperBounds.global-d.atBest.objective)],['Résidu maximal des contraintes du PL',d.atBest.residuals.primal] ].forEach(([label,value])=>{const row=element('tr');row.append(element('th',label),element('td',num(value)));values.body.append(row);});zone.append(values.wrap);
        const details=element('details'),summary=element('summary','Vérifier les multiplicateurs, les contraintes et tous les coefficients');details.append(summary);
        const regions=table(['Branche','Portion retenue','Intervalle d’entrée'],'Région couverte par ce PL ; la numérotation suit les portions des lois ou de leurs enveloppes');
        BRANCH_GRAPH.edges.forEach((branch,i)=>{const row=element('tr'),interval=d.intervals[i];row.append(element('th',branch.id.replace('-',' → ')),element('td',d.selections[i]<0?'Toutes les portions':String(d.selections[i]+1)),element('td',interval?'['+num(interval.lower)+' ; '+num(interval.upper)+']':'[0 ; 1]'));regions.body.append(row);});details.append(regions.wrap);
        const vars=table(['Variable zⱼ','Valeur z*ⱼ','Borne Uⱼ','Coefficient de L'],'Les autres variables sont figées à z* dans la coupe du PL');
        terms.forEach((term,j)=>{const row=element('tr');row.append(element('th',term.name),element('td',num(d.bestPoint[j])),element('td',num(d.bounds[j])),element('td',scientific(term.coefficient)));vars.body.append(row);});details.append(vars.wrap);
        const rows=table(['Contrainte Az ≤ h','λᵢ ≥ 0','Marge hᵢ−Aᵢz*','λᵢ × marge'],'Multiplicateurs non nuls ; le tableau complet et les matrices sont dans l’export JSON');
        d.multipliers.forEach((value,i)=>{if(value===0)return;const row=element('tr');row.append(element('th',d.constraintNames[i]),element('td',num(value)),element('td',scientific(d.atBest.slacks[i])),element('td',scientific(d.atBest.contributions[i])));rows.body.append(row);});details.append(rows.wrap);
        details.append(element('p','λᵢ = multiplicateur de la ligne normalisée / facteur de normalisation. Résidu de l’identité entre les deux écritures de L : '+scientific(d.atBest.residuals.expansionIdentity)+'. Aucune identification de ces λ avec les multiplicateurs μ, ν du réseau non linéaire.'));
        zone.append(details);
    }
    function renderData() {
        if(!context||!state())return;
        calculus=null;
        const radius=Number($('branches-surface-radius').value),steps=Number($('branches-surface-resolution').value);
        choices();
        if(!Number.isFinite(radius)||radius<.001||radius>1||![20,40,60].includes(steps)) {
            data=null;draw();renderFocus();renderProfiles();$('branches-surface-title').textContent='Fenêtre de représentation invalide';$('branches-surface-desc').textContent='Choisir un rayon entre 0,001 et 1 pour calculer une nouvelle coupe.';
            $('branches-surface-samples').replaceChildren();$('branches-surface-caption').textContent='La coupe n’est pas affichée avec ce rayon invalide.';
            $('branches-surface-point').textContent='Aucun point disponible avec ce rayon invalide.';
            $('branches-surface-status').textContent='Choisir un voisinage entre 0,001 et 1.';renderDerivatives();return;
        }
        if(mode==='nlp'&&!exact?.available) {
            data=null;draw();renderFocus();renderProfiles();renderDerivatives();
            $('branches-surface-title').textContent='Certificat analytique indisponible pour ces lois';
            $('branches-surface-desc').textContent=exact?.reason||'Les lois du cas de référence sont requises.';
            $('branches-surface-caption').textContent='Le lagrangien et la borne exacts 7/32 sont propres aux lois du cas de référence. Ils ne sont pas appliqués à des lois modifiées.';
            $('branches-surface-status').textContent='Choisissez une nappe de rendement ou rétablissez le cas de référence.';
            $('branches-surface-point').textContent='Aucun point disponible pour ce certificat.';$('branches-surface-samples').replaceChildren();return;
        }
        if(mode==='lagrangian'&&!diagnostic?.available) {
            data=null;draw();renderFocus();renderProfiles();$('branches-surface-title').textContent='Lagrangien non disponible pour cette référence';$('branches-surface-desc').textContent='Aucun plan dessiné : cette configuration ne dispose pas de multiplicateurs enregistrés utilisables.';
            $('branches-surface-caption').textContent='La nappe du lagrangien nécessite un PL enregistré pour la référence choisie. Consultez le certificat ci-dessus ou choisissez le résultat global à fonctions fixées.';
            $('branches-surface-samples').replaceChildren();$('branches-surface-point').textContent='Aucun point du lagrangien disponible pour cette référence.';$('branches-surface-status').textContent='Pas de multiplicateurs inventés : aucune surface de L n’est calculée pour cet état.';renderDerivatives();return;
        }
        data=mode==='lagrangian'?sampleLagrangianSurface(diagnostic,{x:Number(sampleX),y:Number(sampleY),radius,steps})
            :mode==='nlp'?sampleExactLagrangianSurface(state(),{x:sampleX,y:sampleY,radius,steps})
            :mode==='flows'?sampleFlowSurface(state(),{radius,steps,comparison:['initial','grid','global'].includes(reference)?context.results.grid?.best:null})
            :sampleYieldSurface(state(),{x:sampleX,y:sampleY,radius,steps,comparison:['initial','grid','global'].includes(reference)?context.results.grid?.best:null});
        if(['flows','yield'].includes(mode))calculus=analyseInteriorPeakSurface(state(),{mode,x:sampleX,y:sampleY});
        const frozen=data.frozen.map(item=>item.key+'='+num(item.value)).join(' ; ');
        const prefix=names[reference]+' · '+(result()?.status==='certified'?'Optimum numérique établi à la tolérance annoncée.':'État de référence ; consulter la preuve analytique et les bornes calculées.');
        const explanation=mode==='flows'
            ?'u est le flux alloué à 1→2 ; v est le flux dérivé vers 2→3. Le nœud 2 reçoit g₁₂(u), puis alloue g₁₂(u)−v à 2→8. Les points respectent 0≤v≤g₁₂(u) ; les paires impossibles sont laissées vides. Les douze lois et trois fractions restent fixes : '+frozen+'. Chaque point recalcule tout le réseau. Les lignes orange passent par la référence et donnent les deux coupes ci-dessous.'
            :mode==='yield'
            ?'Chaque point recalcule tout le réseau avec ses douze lois de référence. Trois fractions restent fixes : '+frozen+'. Sur cet ensemble compatible, les termes de contraintes du lagrangien non linéaire s’annulent : L_NLP=r. Cette nappe de rendement n’est pas le L affine du solveur.'
            :mode==='nlp'
            ?'Vrai L_NLP avec μ1=0, μ2=3/4, μ3…μ7=1, ν12=3/4 et les onze autres ν=1. Les 22 autres entrées/sorties sont figées à la référence. La nappe verte évalue L dans la boîte [0,1]²⁴ ; les égalités du réseau ne sont pas réappliquées. Un point hors contraintes est une valeur de L, pas un rendement réalisable. Le certificat exact donne L≤7/32. Le tableau indique les résidus et les dérivées.'
                :'Vrai L affine du PL '+diagnostic.recordId+', λ̄ et les '+data.frozen.length+' autres variables figés à z*. Les mailles grises touchent des points hors contraintes du PL : elles représentent L, sans constituer des flux réalisables. Les mailles bleues satisfont les contraintes du PL à la tolérance, ce qui ne suffit pas à satisfaire les lois non linéaires. Un plan ou un plateau est attendu ; aucune pénalité artificielle n’est ajoutée.';
        let comparison='';
        if(data.comparisonStatus?.startsWith('projected'))comparison=' Le repère grille est une projection : les trois fractions figées sont celles de la référence, et sa hauteur a été recalculée. Il ne représente donc pas nécessairement le rendement original de la grille.';
        if(data.comparisonStatus?.endsWith('outside'))comparison+=' La grille est hors du voisinage affiché ; agrandissez le rayon pour l’inclure.';
        if(data.comparisonStatus==='same-slice')comparison=' La grille et la référence appartiennent à cette même coupe : leurs hauteurs sont directement comparables.';
        if(['flows','yield'].includes(mode)&&['initial','grid','global'].includes(reference)&&context.results.grid&&!context.results.grid.complete)comparison+=' La grille est partielle : son repère ne concerne que les configurations déjà visitées.';
        const z=verticalRange(data,{mode:$('branches-surface-scale').value});
        $('branches-surface-caption').textContent=prefix+' '+explanation+comparison+' Fenêtre : x dans ['+data.ranges.x.map(num).join(' ; ')+'], y dans ['+data.ranges.y.map(num).join(' ; ')+']. '+($('branches-surface-scale').value==='local'?'Zoom vertical local':'Échelle verticale globale')+' : '+data.zLabel+' dans ['+z.map(num).join(' ; ')+']. Les graduations sont absolues ; le rendement physique reste entre 0 et 1. Le maillage ne lisse pas les cassures et ne certifie pas un maximum.';
        $('branches-surface-status').textContent=data.points.flat().filter(finite).length+' points calculés ; '+(mode==='nlp'?data.points.flat().filter(point=>!point.feasible).length+' points hors égalités du réseau, affichés comme valeurs de L. Orange : référence.':data.points.flat().filter(point=>!finite(point)).length+' paires hors domaine non tracées. Orange : référence ; anneau vert : grille dans la fenêtre.')+' Survolez ou cliquez une maille pour lire ses valeurs.';
        renderFocus();renderSamples();renderProfiles();renderDerivatives();draw();
    }
    function renderFocus() {
        const zone=$('branches-surface-focus');zone.replaceChildren();
        const r=result(),s=state();
        if(isInteriorPeakModel(modelForState(s)))zone.append(element('p','Lois du cas de référence · borne analytique globale 7/32=0,21875. Écart entre cette borne et l’état affiché : '+scientific(Math.max(0,.21875-s.production))+'. La certification numérique reste indiquée séparément.','branch-example-notice'));
        zone.append(element('p',names[reference]+' · '+(r?.status==='certified'?'Optimum numérique, écart à la borne '+scientific(r.gap):reference==='initial'?'État de départ ; calcul numérique à lancer':'Meilleur état disponible ; consulter le budget et la borne'),'eyebrow'));
        zone.append(element('p','r = '+num(s.production)+' · '+num(100*s.production)+' %','branch-focus-value'));
        if(data) {
            const point=data.markers.find(marker=>marker.kind==='reference');
            zone.append(element('p',data.xLabel+' = '+num(point.x)+' ; '+data.yLabel+' = '+num(point.y)+'. Rayon '+num(Number($('branches-surface-radius').value))+'.'));
            if(mode==='flows') {
                const interior=point.x>0&&point.x<1&&point.y>0&&point.y<point.available2;
                zone.append(element('p','Somme réellement reçue par le nœud 2 : '+num(s.available['2'])+' ; par le nœud 7 : '+num(s.available['7'])+'. '+(interior?'Ce point est à l’intérieur du domaine admissible des deux flux.':'Ce point se trouve sur une frontière du domaine admissible des deux flux.')));
            }
        }
    }
    function renderProfiles() {
        const zone=$('branches-surface-profiles'),neighbors=$('branches-surface-neighbors');zone.replaceChildren();neighbors.replaceChildren();
        if(!data?.profiles)return;
        const centerPoint=data.markers.find(marker=>marker.kind==='reference'),z=verticalRange(data,{mode:$('branches-surface-scale').value});
        for(const axis of ['x','y']) {
            const points=data.profiles[axis],domain=data.ranges[axis],span=domain[1]-domain[0]||1;
            const project=point=>({x:108+380*(point[axis]-domain[0])/span,y:182-140*(point.z-z[0])/(z[1]-z[0])});
            const figure=element('figure',undefined,'branch-profile'),svg=svgElement('svg',{viewBox:'0 0 550 245',role:'img','aria-labelledby':'branches-profile-'+axis+'-title branches-profile-'+axis+'-desc'});
            const label=axis==='x'?data.xLabel:data.yLabel,fixed=axis==='x'?data.yLabel:data.xLabel;
            svg.append(svgElement('title',{id:'branches-profile-'+axis+'-title'},'Coupe selon '+label),svgElement('desc',{id:'branches-profile-'+axis+'-desc'},'Variation du rendement lorsque '+fixed+' reste à '+num(centerPoint[axis==='x'?'y':'x'])+'. Les lois et trois autres fractions restent fixées. Même échelle verticale que la nappe.'));
            for(const t of [0,.5,1]) {
                const y=182-140*t,level=z[0]+t*(z[1]-z[0]);
                svg.append(svgElement('line',{x1:108,y1:y,x2:488,y2:y,class:'production-chart-grid'}),svgElement('text',{x:100,y:y+5,'text-anchor':'end',class:'production-chart-text'},axisNum(level)),svgElement('text',{x:108+380*t,y:207,'text-anchor':'middle',class:'production-chart-text'},axisNum(domain[0]+t*span)));
            }
            svg.append(svgElement('path',{d:pathThrough(points,project),class:'branch-profile-line'}));
            const p=project(centerPoint);svg.append(svgElement('circle',{cx:p.x,cy:p.y,r:5,class:'production-operating'}),svgElement('text',{x:108,y:24,class:'production-chart-text'},'r · coupe passant par la référence'),svgElement('text',{x:275,y:237,'text-anchor':'middle',class:'production-chart-text'},label));
            const caption=element('figcaption',fixed+' fixé à '+num(centerPoint[axis==='x'?'y':'x'])+'. Le point orange donne r='+num(centerPoint.z)+'.');figure.append(svg,caption);zone.append(figure);
        }
        const values=table(['Position','Entrée 1→2 u','Dérivation 2→3 v','Rendement r','Écart à la référence'],'Vérification du voisinage : pas égal au tiers du rayon, sans prolonger les flux hors du domaine');
        data.neighbors.forEach(point=>{const row=element('tr');row.append(element('th',point.label),element('td',num(point.x)),element('td',num(point.y)),element('td',finite(point)?num(point.z):'Non admissible'),element('td',finite(point)?num(point.z-centerPoint.z):point.reason));values.body.append(row);});neighbors.append(values.wrap);
    }
    function renderDerivatives() {
        const zone=$('branches-surface-derivatives');zone.replaceChildren();
        zone.append(element('h3','Expression et dérivées de la nappe choisie'));
        if(!data){zone.append(element('p','Aucune dérivée affichée sans nappe disponible pour les lois et réglages courants.'));return;}
        let current,peak;
        if(mode==='nlp') {
            zone.append(element('p',data.formula,'branch-formula'),element('p',data.derivativeFormula.dx,'branch-formula'),element('p',data.derivativeFormula.dy,'branch-formula'));
            zone.append(element('p','Ces dérivées sont prises dans les deux entrées libres, avec les 22 autres coordonnées et les multiplicateurs fixés. Les coudes sont signalés sans inventer de dérivée.'));
            current=data.markers.find(point=>point.kind==='reference');peak=data.peak;
            zone.append(element('p','Sommet de cette coupe : '+(peak.attainsGlobalBound?'sa hauteur atteint la borne globale exacte 7/32.':'les autres coordonnées figées abaissent sa hauteur sous 7/32.')+' '+(peak.feasible?'Ce point satisfait les égalités du réseau.':'Ce point ne satisfait pas les égalités du réseau : sa hauteur représente L, pas r.')+' '+(peak.inWindow?'Il appartient à la fenêtre affichée.':'Il est hors de la fenêtre affichée.')));
        } else if(mode==='lagrangian') {
            const dx=diagnostic.lagrangian.coefficients[Number(sampleX)],dy=diagnostic.lagrangian.coefficients[Number(sampleY)];
            zone.append(element('p','Pour ce PL réellement enregistré : ∂L_PL/∂x='+num(dx)+' ; ∂L_PL/∂y='+num(dy)+'. Ces dérivées sont constantes. Un plan ne possède pas de sommet intérieur strict ; les bornes et les contraintes du PL restent déterminantes.','branch-formula'));return;
        } else {
            zone.append(element('p',calculus?.summary||'Analyse locale indisponible.'));
            if(!calculus?.formula)return;
            zone.append(element('p',calculus.formula,'branch-formula'),element('p',calculus.derivativeFormula,'branch-formula'));
            zone.append(element('p','Correspondance des axes affichés : x='+sampleX+' ; y='+sampleY+'. Les deux composantes numériques ci-dessous suivent cet ordre.'));
            current=calculus.current;peak=calculus.peak;
            const conditions=table(['Condition au point de référence','Vérification'],'Domaine de validité de la formule locale et de ses dérivées');
            calculus.conditions.forEach(condition=>{const row=element('tr');row.append(element('th',condition.label),element('td',condition.satisfied?(condition.smooth?'Satisfaite, portion régulière':'Valeur valide, seuil ou frontière'):'Non satisfaite'));conditions.body.append(row);});
            const details=element('details');details.append(element('summary','Vérifier les portions des lois et les transmissions aval'),conditions.wrap);zone.append(details);
            if(!peak.attained)zone.append(element('p','Avec les fractions aval de cette référence, le sommet 7/32 n’est pas atteint dans cette coupe.'));
        }
        const values=table(['Point','x','y',data.zLabel,'∂/∂x','∂/∂y'],'Valeurs recalculées des dérivées ; — indique une formule non applicable ou une dérivée non définie');
        for(const [label,point] of [['Référence',current],['Sommet de la coupe',peak]]) {
            const row=element('tr');row.append(element('th',label),element('td',num(point.x)),element('td',num(point.y)),element('td',num(point.z)),element('td',num(point.gradient?.[0])),element('td',num(point.gradient?.[1])));values.body.append(row);
        }
        zone.append(values.wrap);
        if(peak.hessian?.flat().every(Number.isFinite))zone.append(element('p','Hessienne au sommet, dans l’ordre des axes : ['+peak.hessian.map(row=>row.map(num).join(' ; ')).join(' / ')+'].','branch-formula'));
        zone.append(element('p','L’annulation des dérivées et la courbure concernent cette coupe. Le caractère global du rendement à lois fixes est démontré séparément par L≤7/32 atteint sur un réseau compatible.'));
    }
    function renderSamples() {
        const zone=$('branches-surface-samples');zone.replaceChildren();
        const markers=table(['Repère',data.xLabel,data.yLabel,data.zLabel],'Coordonnées exactes des repères, affichées à neuf chiffres significatifs');
        data.markers.forEach(point=>{const row=element('tr');row.append(element('th',point.label),element('td',num(point.x)),element('td',num(point.y)),element('td',num(point.z)));markers.body.append(row);});zone.append(markers.wrap);
        $('branches-surface-point').textContent='Survolez ou cliquez une maille pour lire les coordonnées de son premier sommet.';
        const details=element('details');details.append(element('summary','Lire les points du maillage sous forme de tableau'));
        const samples=table([data.xLabel,data.yLabel,data.zLabel,mode==='lagrangian'?'Contraintes du PL':mode==='nlp'?'Égalités du réseau':'Statut'],'Tous les points calculés ; valeurs arrondies, sans interpolation entre les lignes');
        data.points.flat().forEach(point=>{const row=element('tr');row.append(element('td',num(point.x)),element('td',num(point.y)),element('td',num(point.z)),element('td',['lagrangian','nlp'].includes(mode)?(point.feasible?'Satisfaites à la tolérance':'Hors contraintes · résidu '+scientific(point.residual)):finite(point)?'Bilans et lois recalculés':point.reason));samples.body.append(row);});details.append(samples.wrap);zone.append(details);
    }
    function draw() {
        const svg=$('branches-surface');[...svg.children].filter(node=>!['title','desc'].includes(node.localName)).forEach(node=>node.remove());
        $('branches-surface-yaw-value').textContent=$('branches-surface-yaw').value+'°';$('branches-surface-pitch-value').textContent=$('branches-surface-pitch').value+'°';
        if(!data){svg.append(svgElement('text',{x:450,y:300,class:'branch-surface-label','text-anchor':'middle'},'Aucune surface disponible avec ces réglages'));return;}
        const yaw=Number($('branches-surface-yaw').value)*Math.PI/180,pitch=Number($('branches-surface-pitch').value)*Math.PI/180;
        const rawBounds={...data.ranges,z:verticalRange(data,{mode:$('branches-surface-scale').value})};
        const bounds=Object.fromEntries(Object.entries(rawBounds).map(([key,pair])=>[key,pair[1]-pair[0]<1e-12?[0,1]:pair]));
        const project=point=>{
            const nx=2*(point.x-bounds.x[0])/(bounds.x[1]-bounds.x[0])-1,ny=2*(point.y-bounds.y[0])/(bounds.y[1]-bounds.y[0])-1,nz=(point.z-bounds.z[0])/(bounds.z[1]-bounds.z[0]);
            const lateral=nx*Math.cos(yaw)-ny*Math.sin(yaw),depth=nx*Math.sin(yaw)+ny*Math.cos(yaw);
            return {x:450+195*lateral,y:460+130*depth*Math.sin(pitch)-290*nz*Math.cos(pitch),depth:depth*Math.cos(pitch)+nz*Math.sin(pitch)};
        };
        const labels=[];
        const text=(point,label,cls='branch-surface-label')=>labels.push(svgElement('text',{x:Math.max(75,Math.min(825,point.x)),y:Math.max(24,Math.min(620,point.y)),class:cls,'text-anchor':'middle'},label));
        const line=(a,b,cls='branch-surface-axis')=>{const pa=project(a),pb=project(b);svg.append(svgElement('line',{x1:pa.x,y1:pa.y,x2:pb.x,y2:pb.y,class:cls}));};
        const origin={x:bounds.x[0],y:bounds.y[0],z:bounds.z[0]};
        for(const key of ['x','y','z']) {
            const end={...origin,[key]:bounds[key][1]};line(origin,end);
            for(const t of key==='z'?[0,.5,1]:[.5,1]) {const value=bounds[key][0]+t*(bounds[key][1]-bounds[key][0]),p=project({...origin,[key]:value});text({x:p.x+(key==='z'?-38:0),y:p.y+18},axisNum(value),'branch-surface-tick');}
            const endPoint=project(end);text({x:endPoint.x+(key==='z'?-20:0),y:endPoint.y+(key==='z'?-30:44)},data[key+'Label']);
        }
        const pointText=point=>data.xLabel+'='+num(point.x)+' ; '+data.yLabel+'='+num(point.y)+' ; '+data.zLabel+'='+num(point.z)+(['lagrangian','nlp'].includes(mode)?' ; '+(point.feasible?'contraintes satisfaites à la tolérance':'hors contraintes, résidu '+scientific(point.residual)):' ; bilans recalculés')+(mode==='nlp'?' ; ∂L/∂x='+num(point.gradient?.[0])+' ; ∂L/∂y='+num(point.gradient?.[1]):'');
        const bind=(node,point)=>{node.append(svgElement('title',{},pointText(point)));const show=()=>{$('branches-surface-point').textContent=pointText(point);};node.addEventListener('pointerenter',show);node.addEventListener('click',show);};
        {
            const tiles=[];
            for(let row=0;row<data.points.length-1;row++)for(let col=0;col<data.points[row].length-1;col++) {
                const corners=[data.points[row][col],data.points[row][col+1],data.points[row+1][col+1],data.points[row+1][col]];
                if(!corners.every(finite))continue;
                const projected=corners.map(project);
                tiles.push({corners,projected,depth:projected.reduce((sum,p)=>sum+p.depth,0)/4});
            }
            tiles.sort((a,b)=>a.depth-b.depth).forEach(tile=>{
                const admissible=tile.corners.every(point=>point.feasible);
                const height=tile.corners.reduce((sum,p)=>sum+(p.z-bounds.z[0])/(bounds.z[1]-bounds.z[0]),0)/4;
                const polygon=svgElement('polygon',{points:tile.projected.map(point=>point.x+','+point.y).join(' '),class:'branch-surface-tile'+(mode==='nlp'?' branch-surface-nlp':!admissible?' branch-surface-outside':''),...(admissible||mode==='nlp'?{'fill-opacity':.14+.4*height}:{})});
                bind(polygon,tile.corners[0]);svg.append(polygon);
            });
        }
        if(data.profiles)for(const axis of ['x','y'])svg.append(svgElement('path',{d:pathThrough(data.profiles[axis],project),class:'branch-surface-section'}));
        svg.append(...labels);
        data.markers.filter(finite).forEach(point=>{const p=project(point),dot=svgElement('circle',{cx:p.x,cy:p.y,r:point.kind==='grid'?12:7,class:'branch-surface-marker '+point.kind});bind(dot,point);svg.append(dot);if(point.kind==='reference')svg.append(svgElement('text',{x:Math.min(770,Math.max(100,p.x)),y:Math.max(25,p.y-24),'text-anchor':'middle',class:'branch-surface-label'},(['lagrangian','nlp'].includes(mode)?'L':'r')+' = '+num(point.z)));});
        $('branches-surface-title').textContent=mode==='nlp'?'Lagrangien non linéaire du réseau, multiplicateurs analytiques':mode==='lagrangian'?'Coupe du lagrangien réel du PL '+diagnostic.recordId:mode==='flows'?'Rendement selon les flux 1→2 et 2→3 près de la référence':'Rendement global selon deux fractions de partage';
        $('branches-surface-desc').textContent=$('branches-surface-caption').textContent+' Les commandes de rotation modifient uniquement la projection. Les mêmes valeurs sont disponibles dans le tableau qui suit.';
    }
    function refresh(force=false) {
        if(!context||!state())return;
        if(force||state()!==lastState||result()!==lastResult) {
            lastState=state();lastResult=result();lastGrid=context.results.grid?.best;
            diagnostic=explainBranchesLagrangian(context.model,result(),reference==='bounded'?{parameterBoxes:context.parameterBoxes}:{});
            exact=explainExactLagrangian(state());
            renderDiagnostic();renderData();
        } else if(lastGrid!==context.results.grid?.best&&context.phases.grid!=='running') {lastGrid=context.results.grid?.best;renderData();}
    }
    select.addEventListener('change',()=>{reference=select.value;autoReference=false;$('branches-surface-center').disabled=!centerReady();refresh(true);});
    modeSelect.addEventListener('change',()=>{mode=modeSelect.value;sampleX=mode==='lagrangian'?'0':mode==='nlp'?'1-2':mode==='flows'?'x12':'s1';sampleY=mode==='lagrangian'?'1':mode==='nlp'?'2-3':mode==='flows'?'x23':'s2';$('branches-surface-scale').value=mode==='lagrangian'?'global':'local';renderData();});
    xSelect.addEventListener('change',()=>{sampleX=xSelect.value;if(sampleX===sampleY)sampleY=[...ySelect.options].find(option=>option.value!==sampleX).value;renderData();});
    ySelect.addEventListener('change',()=>{sampleY=ySelect.value;if(sampleY===sampleX)sampleX=[...xSelect.options].find(option=>option.value!==sampleY).value;renderData();});
    $('branches-surface-radius').addEventListener('input',renderData);
    $('branches-surface-scale').addEventListener('change',renderData);
    $('branches-surface-center').addEventListener('click',center);
    $('branches-surface-wide').addEventListener('click',widen);
    $('branches-surface-resolution').addEventListener('change',renderData);
    $('branches-surface-demo').addEventListener('click',()=>{onDemo?.();pendingDemo=context?.model?{model:context.model}:null;});
    ['yaw','pitch'].forEach(key=>$('branches-surface-'+key).addEventListener('input',draw));
    return {
        update(next) {
            if(pendingDemo&&pendingDemo.model!==next.model)pendingDemo=null;
            if(context?.model!==next.model){reference='initial';autoReference=true;lastState=null;}
            context=next;
            for(const option of select.options)option.disabled=option.value!=='initial'&&(!context.results[option.value]?.best||context.phases[option.value]==='running');
            if(select.querySelector('[value="'+reference+'"]').disabled)reference='initial';
            if(autoReference&&context.results.global?.best&&context.phases.global!=='running'){reference='global';autoReference=false;}
            $('branches-surface-demo').disabled=typeof onDemo!=='function'||Object.values(context.phases).includes('running');
            $('branches-surface-wide').disabled=!state();
            $('branches-surface-center').disabled=!centerReady();
            select.value=reference;refresh();
            if(pendingDemo?.model===context.model&&context.results.global?.best&&context.phases.global==='done'){pendingDemo=null;reference='global';center();}
        },
        cancelPendingDemo:()=>{pendingDemo=null;},
        snapshot:()=>({reference,mode,example:state()&&isInteriorPeakModel(modelForState(state()))?'interior-peak':'current-laws',axes:mode==='flows'?{x:'x12',y:'x23'}:{x:sampleX,y:sampleY},radius:Number($('branches-surface-radius').value),resolution:Number($('branches-surface-resolution').value),verticalScale:{mode:$('branches-surface-scale').value,bounds:data?verticalRange(data,{mode:$('branches-surface-scale').value}):null},rotation:{yaw:Number($('branches-surface-yaw').value),pitch:Number($('branches-surface-pitch').value)},diagnostic,exactLagrangian:exact,calculus,samples:data}),
    };
}
