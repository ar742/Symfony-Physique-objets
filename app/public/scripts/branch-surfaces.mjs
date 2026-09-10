import {element,svgElement,table} from './graph-studies.mjs';
import {BRANCH_GRAPH} from './branches-engine.mjs';
import {explainBranchesLagrangian} from './branches-lagrangian.mjs';
import {SPLIT_VARIABLES,sampleYieldSurface,sampleLagrangianSurface,sampleCoupledInputs} from './branch-surfaces-engine.mjs';

const $=id=>document.getElementById(id);
const num=value=>Number.isFinite(value)?new Intl.NumberFormat('fr-FR',{maximumSignificantDigits:9}).format(value):'—';
const scientific=value=>Number.isFinite(value)?value.toExponential(3):'—';
const names={initial:'Partages initiaux',grid:'Meilleur résultat de la grille',global:'Global · fonctions fixées',bounded:'Global · paramètres bornés',free:'Construction libre'};
const unavailable={
    'no-linear-program-needed':'Aucun PL nécessaire : les bornes directes suffisent à ce calcul.',
    'no-recorded-linear-program':'Cette configuration ne dispose pas de multiplicateurs de PL enregistrés.',
    'no-containing-linear-program':'Aucun PL enregistré ne contient la meilleure configuration avec les contrôles requis.',
};

export function createBranchSurfaces() {
    let context=null,reference='initial',data=null,diagnostic=null,autoReference=true,lastState=null,lastResult=null,lastGrid=null;
    let mode='yield',sampleX='s1',sampleY='s2';
    const select=$('branches-surface-reference'),modeSelect=$('branches-surface-mode');
    const xSelect=$('branches-surface-x'),ySelect=$('branches-surface-y');
    const state=()=>reference==='initial'?context.initial:context.results[reference]?.best;
    const result=()=>context.results[reference];
    function choices() {
        if(mode==='coupled') {
            for(const [control,value,label] of [[xSelect,'A2','Exp. IN 2 · Somme A2'],[ySelect,'A5','Exp. IN 5 · Somme A5']]) {
                const option=element('option',label);option.value=value;control.replaceChildren(option);control.disabled=true;
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
            control.value=value;control.disabled=mode==='coupled'||(mode==='lagrangian'&&!diagnostic?.available);
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
        const radius=Number($('branches-surface-radius').value);
        choices();
        if(!Number.isFinite(radius)||radius<.02||radius>1) {
            data=null;draw();$('branches-surface-title').textContent='Fenêtre de représentation invalide';$('branches-surface-desc').textContent='Choisir un rayon entre 0,02 et 1 pour calculer une nouvelle coupe.';
            $('branches-surface-samples').replaceChildren();$('branches-surface-caption').textContent='La coupe n’est pas affichée avec ce rayon invalide.';
            $('branches-surface-status').textContent='Choisir un voisinage entre 0,02 et 1.';return;
        }
        if(mode==='lagrangian'&&!diagnostic?.available) {
            data=null;draw();$('branches-surface-title').textContent='Lagrangien non disponible pour cette référence';$('branches-surface-desc').textContent='Aucun plan dessiné : cette configuration ne dispose pas de multiplicateurs enregistrés utilisables.';
            $('branches-surface-caption').textContent='La nappe du lagrangien nécessite un PL enregistré pour la référence choisie. Consultez le certificat ci-dessus ou choisissez le résultat global à fonctions fixées.';
            $('branches-surface-samples').replaceChildren();$('branches-surface-status').textContent='Pas de multiplicateurs inventés : aucune surface de L n’est calculée pour cet état.';return;
        }
        data=mode==='lagrangian'?sampleLagrangianSurface(diagnostic,{x:Number(sampleX),y:Number(sampleY),radius})
            :mode==='coupled'?sampleCoupledInputs(state(),{radius})
            :sampleYieldSurface(state(),{x:sampleX,y:sampleY,radius,comparison:['initial','grid','global'].includes(reference)?context.results.grid?.best:null});
        const frozen=data.frozen.map(item=>item.key+'='+num(item.value)).join(' ; ');
        const prefix=names[reference]+' · '+(result()?.status==='certified'?'Optimum numérique établi à la tolérance annoncée.':reference==='free'?'Rendement idéal atteint par construction.':'Configuration de référence ; cette vue ne prouve pas son optimalité.');
        const explanation=mode==='yield'
            ?'Chaque point recalcule tout le réseau avec ses douze lois de référence. Trois fractions restent fixes : '+frozen+'. Sur cet ensemble compatible, les termes de contraintes du lagrangien non linéaire s’annulent : L_NLP=r. Cette nappe de rendement n’est pas le L affine du solveur.'
            :mode==='lagrangian'
                ?'Vrai L affine du PL '+diagnostic.recordId+', λ̄ et les '+data.frozen.length+' autres variables figés à z*. Les mailles grises touchent des points hors contraintes du PL : elles représentent L, sans constituer des flux réalisables. Les mailles bleues satisfont les contraintes du PL à la tolérance, ce qui ne suffit pas à satisfaire les lois non linéaires. Un plan ou un plateau est attendu ; aucune pénalité artificielle n’est ajoutée.'
                :'Une seule commande varie : s1. A2=g₁₂(s1), A5=g₁₅(1−s1). Ces deux entrées sont dépendantes ; leur ensemble est une courbe paramétrée, pas une nappe à deux variables libres. Autres fractions figées : '+frozen+'.';
        let comparison='';
        if(data.comparisonStatus?.startsWith('projected'))comparison=' Le repère grille est une projection : les trois fractions figées sont celles de la référence, et sa hauteur a été recalculée. Il ne représente donc pas nécessairement le rendement original de la grille.';
        if(data.comparisonStatus?.endsWith('outside'))comparison+=' La grille est hors du voisinage affiché ; agrandissez le rayon pour l’inclure.';
        if(data.comparisonStatus==='same-slice')comparison=' La grille et la référence appartiennent à cette même coupe : leurs hauteurs sont directement comparables.';
        if(mode==='yield'&&['initial','grid','global'].includes(reference)&&context.results.grid&&!context.results.grid.complete)comparison+=' La grille est partielle : son repère ne concerne que les configurations déjà visitées.';
        $('branches-surface-caption').textContent=prefix+' '+explanation+comparison+' Fenêtre : x dans ['+data.ranges.x.map(num).join(' ; ')+'], y dans ['+data.ranges.y.map(num).join(' ; ')+']. L’échelle verticale inclut toujours 0 et 1, et s’étend si L les dépasse. Le maillage sert à visualiser, pas à certifier un maximum.';
        $('branches-surface-status').textContent=data.points.flat().length+' points calculés. '+(mode==='coupled'?'Courbe à un paramètre.':'Orange : référence ; anneau vert : grille si elle appartient à la fenêtre. Survolez ou cliquez une maille pour lire ses valeurs.');
        renderSamples();draw();
    }
    function renderSamples() {
        const zone=$('branches-surface-samples');zone.replaceChildren();
        const markers=table(['Repère',data.xLabel,data.yLabel,data.zLabel],'Coordonnées exactes des repères, affichées à neuf chiffres significatifs');
        data.markers.forEach(point=>{const row=element('tr');row.append(element('th',point.label),element('td',num(point.x)),element('td',num(point.y)),element('td',num(point.z)));markers.body.append(row);});zone.append(markers.wrap);
        const selected=element('p','Survol ou clic : les coordonnées du point de maillage le plus proche du coin choisi apparaissent ici.');selected.id='branches-surface-point';selected.setAttribute('role','status');zone.append(selected);
        const details=element('details');details.append(element('summary','Lire les points du maillage sous forme de tableau'));
        const samples=table([data.xLabel,data.yLabel,data.zLabel,mode==='lagrangian'?'Contraintes du PL':'Statut'],'Tous les points calculés ; valeurs arrondies, sans interpolation entre les lignes');
        data.points.flat().forEach(point=>{const row=element('tr');row.append(element('td',num(point.x)),element('td',num(point.y)),element('td',num(point.z)),element('td',mode==='lagrangian'?(point.feasible?'Satisfaites à la tolérance':'Hors contraintes · résidu '+scientific(point.residual)):mode==='coupled'?'s1='+num(point.share):'Bilans et lois recalculés'));samples.body.append(row);});details.append(samples.wrap);zone.append(details);
    }
    function draw() {
        const svg=$('branches-surface');[...svg.children].filter(node=>!['title','desc'].includes(node.localName)).forEach(node=>node.remove());
        $('branches-surface-yaw-value').textContent=$('branches-surface-yaw').value+'°';$('branches-surface-pitch-value').textContent=$('branches-surface-pitch').value+'°';
        if(!data){svg.append(svgElement('text',{x:450,y:300,class:'branch-surface-label','text-anchor':'middle'},'Aucune surface disponible avec ces réglages'));return;}
        const yaw=Number($('branches-surface-yaw').value)*Math.PI/180,pitch=Number($('branches-surface-pitch').value)*Math.PI/180;
        const bounds=Object.fromEntries(Object.entries(data.ranges).map(([key,pair])=>[key,pair[1]-pair[0]<1e-12?[0,1]:pair]));
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
            for(const t of key==='z'?[0,.5,1]:[.5,1]) {const value=bounds[key][0]+t*(bounds[key][1]-bounds[key][0]),p=project({...origin,[key]:value});text({x:p.x+(key==='z'?-24:0),y:p.y+18},num(value),'branch-surface-tick');}
            const endPoint=project(end);text({x:endPoint.x+(key==='z'?-20:0),y:endPoint.y+(key==='z'?-30:44)},data[key+'Label']);
        }
        const pointText=point=>data.xLabel+'='+num(point.x)+' ; '+data.yLabel+'='+num(point.y)+' ; '+data.zLabel+'='+num(point.z)+(mode==='lagrangian'?' ; '+(point.feasible?'contraintes du PL satisfaites à la tolérance':'hors contraintes du PL, résidu '+scientific(point.residual)):mode==='coupled'?' ; s1='+num(point.share):' ; bilans recalculés');
        const bind=(node,point)=>{node.append(svgElement('title',{},pointText(point)));const show=()=>{$('branches-surface-point').textContent=pointText(point);};node.addEventListener('pointerenter',show);node.addEventListener('click',show);};
        if(mode==='coupled') {
            svg.append(svgElement('polyline',{points:data.points[0].map(point=>{const p=project(point);return p.x+','+p.y;}).join(' '),class:'branch-surface-curve'}));
            data.points[0].forEach(point=>{const p=project(point),dot=svgElement('circle',{cx:p.x,cy:p.y,r:4,class:'branch-surface-dot'});bind(dot,point);svg.append(dot);});
        } else {
            const tiles=[];
            for(let row=0;row<data.points.length-1;row++)for(let col=0;col<data.points[row].length-1;col++) {
                const corners=[data.points[row][col],data.points[row][col+1],data.points[row+1][col+1],data.points[row+1][col]],projected=corners.map(project);
                tiles.push({corners,projected,depth:projected.reduce((sum,p)=>sum+p.depth,0)/4});
            }
            tiles.sort((a,b)=>a.depth-b.depth).forEach(tile=>{
                const admissible=tile.corners.every(point=>point.feasible);
                const polygon=svgElement('polygon',{points:tile.projected.map(point=>point.x+','+point.y).join(' '),class:'branch-surface-tile'+(!admissible?' branch-surface-outside':'')});
                bind(polygon,tile.corners[0]);svg.append(polygon);
            });
        }
        svg.append(...labels);
        data.markers.forEach(point=>{const p=project(point),dot=svgElement('circle',{cx:p.x,cy:p.y,r:point.kind==='grid'?12:7,class:'branch-surface-marker '+point.kind});bind(dot,point);svg.append(dot);});
        $('branches-surface-title').textContent=mode==='lagrangian'?'Coupe du lagrangien réel du PL '+diagnostic.recordId:mode==='coupled'?'Entrées dépendantes des nœuds 2 et 5':'Rendement global selon deux fractions de partage';
        $('branches-surface-desc').textContent=$('branches-surface-caption').textContent+' Les commandes de rotation modifient uniquement la projection. Les mêmes valeurs sont disponibles dans le tableau qui suit.';
    }
    function refresh(force=false) {
        if(!context||!state())return;
        if(force||state()!==lastState||result()!==lastResult) {
            lastState=state();lastResult=result();lastGrid=context.results.grid?.best;
            diagnostic=explainBranchesLagrangian(context.model,result(),reference==='bounded'?{parameterBoxes:context.parameterBoxes}:{});
            renderDiagnostic();renderData();
        } else if(lastGrid!==context.results.grid?.best&&context.phases.grid!=='running') {lastGrid=context.results.grid?.best;renderData();}
    }
    select.addEventListener('change',()=>{reference=select.value;autoReference=false;refresh(true);});
    modeSelect.addEventListener('change',()=>{mode=modeSelect.value;sampleX=mode==='lagrangian'?'0':'s1';sampleY=mode==='lagrangian'?'1':'s2';renderData();});
    xSelect.addEventListener('change',()=>{sampleX=xSelect.value;if(sampleX===sampleY)sampleY=[...ySelect.options].find(option=>option.value!==sampleX).value;renderData();});
    ySelect.addEventListener('change',()=>{sampleY=ySelect.value;if(sampleY===sampleX)sampleX=[...xSelect.options].find(option=>option.value!==sampleY).value;renderData();});
    $('branches-surface-radius').addEventListener('input',renderData);
    ['yaw','pitch'].forEach(key=>$('branches-surface-'+key).addEventListener('input',draw));
    return {
        update(next) {
            if(context?.model!==next.model){reference='initial';autoReference=true;lastState=null;}
            context=next;
            for(const option of select.options)option.disabled=option.value!=='initial'&&(!context.results[option.value]?.best||context.phases[option.value]==='running');
            if(select.querySelector('[value="'+reference+'"]').disabled)reference='initial';
            if(autoReference&&context.results.global?.best&&context.phases.global!=='running'){reference='global';autoReference=false;}
            select.value=reference;refresh();
        },
        snapshot:()=>({reference,mode,axes:mode==='coupled'?{x:'A2',y:'A5',parameter:'s1'}:{x:sampleX,y:sampleY},radius:Number($('branches-surface-radius').value),rotation:{yaw:Number($('branches-surface-yaw').value),pitch:Number($('branches-surface-pitch').value)},diagnostic,samples:data}),
    };
}
