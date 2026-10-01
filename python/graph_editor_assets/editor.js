export default function({parentElement, data, setStateValue}) {
  const root = parentElement.querySelector('.editor');
  const svg = root.querySelector('svg');
  const status = root.querySelector('.status');
  const model = data.model;
  let edges = model.edges.map(e => [...e]);
  let positions = structuredClone(data.positions);
  let selected = null, gesture = null, busy = false;
  let mode = root.dataset.mode || 'link';
  const ns = 'http://www.w3.org/2000/svg';
  const create = (tag,attrs) => {
    const element = document.createElementNS(ns,tag);
    for (const [key,value] of Object.entries(attrs)) element.setAttribute(key,String(value));
    return element;
  };
  const message = text => {status.textContent=text;};
  const publish = () => {
    busy=true;
    setStateValue('drawing',{revision:data.revision,edges,positions});
    message('Dessin enregistré.');
  };
  const pair = (i,j) => [Math.min(i,j),Math.max(i,j)];
  const changeLink = (i,j,removeOnly=false) => {
    if(busy || i===j) return;
    const [a,b]=pair(i,j), index=edges.findIndex(e=>e[0]===a && e[1]===b);
    if(index>=0) edges.splice(index,1);
    else if(!removeOnly) edges.push([a,b]);
    selected=null; render(); publish();
  };
  const choose = id => {
    if(busy || mode!=='link') return;
    if(selected===null) {selected=id; message(`Nœud ${id} choisi : cliquez sur son voisin. Échap annule.`);render();}
    else if(selected===id) {selected=null;render();message('Sélection annulée.');}
    else changeLink(selected,id);
  };
  const point = event => {
    const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY;
    const q=p.matrixTransform(svg.getScreenCTM().inverse());
    return [Math.max(30,Math.min(870,q.x)),Math.max(30,Math.min(450,q.y))];
  };
  const near = ([x,y]) => {
    let found=null, distance=30;
    for(const [id,[px,py]] of Object.entries(positions)) {
      const d=Math.hypot(x-px,y-py);if(d<distance){found=Number(id);distance=d;}
    }
    return found;
  };
  function render() {
    svg.replaceChildren();
    root.querySelector('.count').textContent=`${model.n} nœud${model.n>1?'s':''} · ${edges.length} liaison${edges.length>1?'s':''}`;
    root.querySelector('.hint').textContent=mode==='move'?'Tirez les nœuds pour organiser le dessin. Leurs liaisons sont conservées.':'Cliquez sur un nœud puis sur un autre, ou tirez de l’un vers l’autre. Cliquez sur une liaison pour la supprimer.';
    for(const [i,j] of edges) {
      const [x1,y1]=positions[i],[x2,y2]=positions[j];
      const group=create('g',{class:'edge',role:'button',tabindex:0,'aria-label':`Supprimer la liaison ${i} — ${j}`});
      group.append(create('line',{x1,y1,x2,y2,class:'hit'}),create('line',{x1,y1,x2,y2,class:'visible'}));
      group.onclick=()=>changeLink(i,j,true);
      group.onkeydown=e=>{if(['Enter',' ','Delete'].includes(e.key)){e.preventDefault();changeLink(i,j,true);}};
      svg.append(group);
    }
    if(gesture && gesture.moved && mode==='link') {
      const [x1,y1]=positions[gesture.id],[x2,y2]=gesture.end;
      svg.append(create('line',{x1,y1,x2,y2,class:'preview'}));
    }
    for(let i=1;i<=model.n;i++) {
      const [cx,cy]=positions[i];
      const group=create('g',{class:`node ${i===1?'source':i===model.n?'terminal':''} ${i===selected?'selected':''}`,
        'data-node':i,role:'button',tabindex:0,'aria-label':`Nœud ${i}`,'aria-pressed':i===selected});
      group.append(create('circle',{cx,cy,r:25}));
      const text=create('text',{x:cx,y:cy});text.textContent=String(i);group.append(text);
      group.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose(i);svg.querySelector(`[data-node="${i}"]`)?.focus();}};
      group.onpointerdown=e=>{
        if(busy || e.button!==0)return;
        e.preventDefault();const p=point(e);gesture={id:i,start:p,end:p,moved:false,original:[...positions[i]]};
        svg.setPointerCapture(e.pointerId);
      };
      svg.append(group);
    }
  }
  svg.onpointermove=e=>{
    if(!gesture)return;
    const p=point(e);gesture.end=p;
    if(Math.hypot(p[0]-gesture.start[0],p[1]-gesture.start[1])>6)gesture.moved=true;
    if(gesture.moved){if(mode==='move')positions[gesture.id]=p;render();}
  };
  svg.onpointerup=e=>{
    if(!gesture)return;
    const g=gesture,p=point(e);gesture=null;
    if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);
    if(mode==='move') {
      if(g.moved){render();publish();}else message('Tirez un nœud pour le déplacer.');
    } else if(g.moved) {
      const target=near(p);
      if(target && target!==g.id)changeLink(g.id,target);
      else {render();message('Liaison annulée : relâchez sur un autre nœud.');}
    } else choose(g.id);
  };
  svg.onpointercancel=()=>{if(gesture && mode==='move')positions[gesture.id]=gesture.original;gesture=null;render();};
  root.onkeydown=e=>{if(e.key==='Escape'){if(gesture && mode==='move')positions[gesture.id]=gesture.original;selected=null;gesture=null;render();message('Sélection annulée.');}};
  for(const button of root.querySelectorAll('[data-mode]')) {
    button.setAttribute('aria-pressed',button.dataset.mode===mode);
    button.onclick=()=>{
      mode=button.dataset.mode;root.dataset.mode=mode;selected=null;
      for(const b of root.querySelectorAll('[data-mode]'))b.setAttribute('aria-pressed',b===button);
      message(mode==='move'?'Tirez les nœuds pour organiser le dessin.':'Choisissez deux nœuds à relier.');render();
    };
  }
  render();
  return ()=>{svg.onpointermove=null;svg.onpointerup=null;svg.onpointercancel=null;root.onkeydown=null;};
}
