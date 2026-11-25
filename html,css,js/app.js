const D=[{"name": "Calabawan", "consumers": 87, "lat": 9.5703, "lon": 123.3335, "sources": ["Inambakan Source", "Kasaksakan Source 1", "Kasaksakan Source 2", "Kasaksakan Source 3", "Kampoo Source", "Bulo-Bulo Spring 1", "Bulo-Bulo Spring 2", "Bulo-Bulo Spring 3"]}, {"name": "Cambagte", "consumers": 1, "lat": 9.585, "lon": 123.367, "sources": ["Huyong-Huyong Spring 1", "Huyong-Huyong Spring 2", "Tambakan Spring 1", "Tambakan Spring 2", "Tambakan Spring 3"]}, {"name": "Cañorong", "consumers": 39, "lat": 9.5479, "lon": 123.3463, "sources": ["Upper Cantias Spring", "Cantias Spring 2", "Bulo-Bulo Spring"]}, {"name": "Guiwanon", "consumers": 207, "lat": 9.5891, "lon": 123.3193, "sources": ["Tinumdan Spring"]}, {"name": "Looc", "consumers": 193, "lat": 9.6062, "lon": 123.3198, "sources": ["Hilog Spring"]}, {"name": "Malatbo", "consumers": 95, "lat": 9.5776, "lon": 123.3245, "sources": ["Kangalis Spring", "Ka-Botoy Spring", "Kasaksakan Spring", "Sima Spring"]}, {"name": "Mangaco", "consumers": 85, "lat": 9.5569, "lon": 123.3467, "sources": ["Navy Spring", "Kamongco Spring", "Kabalingkong Spring", "Talawgan Spring"]}, {"name": "Palanas", "consumers": 378, "lat": 9.5543, "lon": 123.323, "sources": ["Banahaw Spring", "Ka-Ading Spring", "Ka-Meyon Spring", "Tamba Spring", "Makupa Spring", "Ka-Ipilan Spring", "Linao Spring"]}, {"name": "Poblacion", "consumers": 702, "lat": 9.5707, "lon": 123.3123, "sources": ["Banahaw-San Roque Spring"]}, {"name": "Salamanca", "consumers": 26, "lat": 9.5962, "lon": 123.3694, "sources": ["Bayabas Spring", "Bandera Spring", "Semie 1 Spring", "Bamboo Spring"]}], PER_CONSUMER=0.6, OVR={};
const HOME={center:[123.3330,9.5740],zoom:12.6,pitch:58,bearing:-18};
const STYLE={version:8,sources:{
 osm:{type:'raster',tiles:['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],tileSize:256,maxzoom:19,attribution:'&copy; OpenStreetMap'},
 sat:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Esri'},
 dem:{type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],encoding:'terrarium',tileSize:256,maxzoom:15}},
 layers:[{id:'osm',type:'raster',source:'osm'},{id:'sat',type:'raster',source:'sat',layout:{visibility:'none'}},
 {id:'hill',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':.45}}]};
const map=new maplibregl.Map({container:'map',style:STYLE,...HOME,maxPitch:85,attributionControl:{compact:true}});
const $=id=>document.getElementById(id);
map.on('error',e=>{const s=$('st');s.style.display='block';s.textContent='Some map data did not load: '+((e.error&&e.error.message)||'network error')});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
map.addControl(new maplibregl.ScaleControl(),'bottom-right');

/* ---------- helpers ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
const M=111320;
function offset(lon,lat,dm,deg){const a=deg*Math.PI/180;
  return [lon+dm*Math.cos(a)/(M*Math.cos(lat*Math.PI/180)), lat+dm*Math.sin(a)/M]}
function circle(lon,lat,r,n){n=n||36;const ring=[];for(let i=0;i<=n;i++)ring.push(offset(lon,lat,r,i/n*360));return ring}
function curve(a,b,bow){const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[0]-a[0],dy=b[1]-a[1];
  const cx=mx-dy*bow,cy=my+dx*bow,pts=[];
  for(let i=0;i<=16;i++){const t=i/16,u=1-t;pts.push([u*u*a[0]+2*u*t*cx+t*t*b[0],u*u*a[1]+2*u*t*cy+t*t*b[1]])}return pts}
function along(pts,t){const n=pts.length-1,x=t*n,i=Math.min(n-1,Math.floor(x)),f=x-i;
  return [pts[i][0]+(pts[i+1][0]-pts[i][0])*f, pts[i][1]+(pts[i+1][1]-pts[i][1])*f]}
const p2=n=>String(n).padStart(2,'0');
const fmtT=m=>p2(Math.floor(m/60)%24)+':'+p2(Math.floor(m%60));
const fc=f=>({type:'FeatureCollection',features:f});

/* ---------- model ---------- */
function dmRaw(h){const g=(x,m,s)=>Math.exp(-((x-m)*(x-m))/(2*s*s));
  return 0.45+0.9*g(h,7,1.3)+0.8*g(h,18,1.5)+0.3*g(h,12.5,1.5)}
let dmMean=0;for(let i=0;i<240;i++)dmMean+=dmRaw(i/10);dmMean/=240;
const demandMult=h=>dmRaw(h)/dmMean;

const B=D.map(b=>{
  const r=rng(hash(b.name));
  const avg=b.consumers*PER_CONSUMER;                  // average demand, L/min
  const f=0.85+r()*0.45;                               // illustrative: total spring yield vs average demand
  const w=b.sources.map(()=>0.6+r()*0.8), ws=w.reduce((a,c)=>a+c,0)||1;
  const springs=b.sources.map((nm,i)=>{
    const ang=-70+r()*140, dist=650+r()*700, bow=(r()-0.5)*0.4;   // placed inland (east) of the barangay
    const o=OVR[nm]||{};
    const lon=o.lon!=null?o.lon:offset(b.lon,b.lat,dist,ang)[0];
    const lat=o.lat!=null?o.lat:offset(b.lon,b.lat,dist,ang)[1];
    const base=o.yield_lpm!=null?o.yield_lpm:avg*f*w[i]/ws;
    return {name:nm,bar:b.name,lon,lat,base,on:true,path:curve([lon,lat],[b.lon,b.lat],bow)};
  });
  const cap=Math.max(avg*480,50);                      // tank = 8 h of average demand
  return {...b,avg,springs,cap,level:cap*0.6,dry:false,inflow:0,demand:0,pinTxt:null,pinDot:null};
});
const SP=[];B.forEach(b=>b.springs.forEach(s=>{s.id=SP.length;SP.push(s)}));

let simT=5*60, speed=60, playing=true, drought=1, flowClock=0, log=[];
const day=()=>Math.floor(simT/1440)+1;
function addLog(msg){log.push(fmtT(simT)+' (day '+day()+') '+msg);if(log.length>40)log.shift();
  $('log').innerHTML=log.slice(-5).reverse().map(x=>'<div>'+x+'</div>').join('')}
function color(b){const fr=b.level/b.cap;return b.dry?'#d7263d':fr<0.2?'#f18f01':fr<0.5?'#e6c229':'#2e9e5b'}

function step(dtMin){
  const h=(simT/60)%24, mult=demandMult(h);
  B.forEach(b=>{
    b.inflow=b.springs.reduce((a,s)=>a+(s.on?s.base*drought:0),0);
    b.demand=b.avg*mult;
    b.level=Math.max(0,Math.min(b.cap,b.level+(b.inflow-b.demand)*dtMin));
    const dryNow=b.level<=0 && b.inflow<b.demand*0.999;
    if(dryNow&&!b.dry)addLog('<b>'+b.name+'</b> ran dry');
    if(!dryNow&&b.dry)addLog(b.name+' supply restored');
    b.dry=dryNow;
  });
  simT+=dtMin;
}

/* ---------- map layers ---------- */
let upd=0;
function refresh(){
  const out=[],inn=[];let ts=0,td=0,dry=0;
  const H=v=>25+55*Math.sqrt(Math.max(v,0));
  B.forEach(b=>{
    const c=color(b);ts+=b.inflow;td+=b.demand;if(b.dry)dry++;
    out.push({type:'Feature',properties:{h:H(b.demand),c},geometry:{type:'Polygon',coordinates:[circle(b.lon,b.lat,300)]}});
    inn.push({type:'Feature',properties:{h:b.inflow>0?H(b.inflow):1,c},geometry:{type:'Polygon',coordinates:[circle(b.lon,b.lat,190)]}});
    if(b.pinTxt){b.pinTxt.textContent=Math.round(b.level/b.cap*100)+'%';b.pinDot.style.background=c}
  });
  map.getSource('dem-col').setData(fc(out));map.getSource('sup-col').setData(fc(inn));
  $('clk').textContent=fmtT(simT);$('day').textContent='Day '+day();
  $('tsup').textContent=Math.round(ts)+' L/min';$('tdem').textContent=Math.round(td)+' L/min';$('tdry').textContent=dry;
}
function pipesData(){return fc(SP.map(s=>({type:'Feature',properties:{on:s.on?1:0},geometry:{type:'LineString',coordinates:s.path}})))}
function springsData(){return fc(SP.map(s=>({type:'Feature',properties:{i:s.id,on:s.on?1:0},geometry:{type:'Point',coordinates:[s.lon,s.lat]}})))}
function dropsData(){
  const f=[];
  SP.forEach(s=>{
    if(!s.on||drought<=0)return;
    const n=Math.max(1,Math.min(8,Math.round(s.base*drought/25)));
    for(let i=0;i<n;i++){const t=((i/n)+flowClock*0.12)%1;
      f.push({type:'Feature',properties:{},geometry:{type:'Point',coordinates:along(s.path,t)}})}
  });
  return fc(f);
}

map.on('load',()=>{
  map.setTerrain({source:'dem',exaggeration:1.6});
  fetch('https://nominatim.openstreetmap.org/search?q=Ginatilan,+Cebu&format=geojson&polygon_geojson=1&limit=1')
    .then(r=>r.json()).then(g=>{
      map.addSource('bd',{type:'geojson',data:g});
      map.addLayer({id:'bd-line',type:'line',source:'bd',paint:{'line-color':'#e8590c','line-width':3,'line-dasharray':[3,2]}},'dem-col');
    }).catch(()=>{});
  map.addSource('pipes',{type:'geojson',data:pipesData()});
  map.addSource('springs',{type:'geojson',data:springsData()});
  map.addSource('drops',{type:'geojson',data:dropsData()});
  map.addSource('dem-col',{type:'geojson',data:fc([])});
  map.addSource('sup-col',{type:'geojson',data:fc([])});
  map.addLayer({id:'pipe-casing',type:'line',source:'pipes',paint:{'line-color':'#fff','line-width':5,'line-opacity':.8}});
  map.addLayer({id:'pipe',type:'line',source:'pipes',paint:{'line-width':2.5,
    'line-color':['case',['==',['get','on'],1],'#1e90ff','#888']}});
  map.addLayer({id:'dem-col',type:'fill-extrusion',source:'dem-col',paint:{'fill-extrusion-color':['get','c'],
    'fill-extrusion-height':['get','h'],'fill-extrusion-opacity':.28}});
  map.addLayer({id:'sup-col',type:'fill-extrusion',source:'sup-col',paint:{'fill-extrusion-color':['get','c'],
    'fill-extrusion-height':['get','h'],'fill-extrusion-opacity':.95,'fill-extrusion-vertical-gradient':true}});
  map.addLayer({id:'springs',type:'circle',source:'springs',paint:{'circle-radius':7,
    'circle-color':['case',['==',['get','on'],1],'#1e90ff','#555'],'circle-stroke-color':'#fff','circle-stroke-width':2}});
  map.addLayer({id:'drops',type:'circle',source:'drops',paint:{'circle-radius':3.2,'circle-color':'#bfe9ff',
    'circle-stroke-color':'#1565a8','circle-stroke-width':1}});
  map.on('mouseenter','springs',()=>map.getCanvas().style.cursor='pointer');
  map.on('mouseleave','springs',()=>map.getCanvas().style.cursor='');
  map.on('click','springs',e=>{
    const s=SP[e.features[0].properties.i];s.on=!s.on;
    map.getSource('pipes').setData(pipesData());map.getSource('springs').setData(springsData());
    addLog((s.on?'Restored ':'Cut off ')+s.name+' ('+s.bar+')');
    new maplibregl.Popup({offset:10}).setLngLat([s.lon,s.lat]).setHTML('<b>'+s.name+'</b><br>Serves '+s.bar+
      '<br>Yield: '+Math.round(s.base*drought)+' L/min<br>Status: '+(s.on?'flowing':'CUT OFF')+
      '<br><i style="font-size:11px">Spring position and yield are illustrative</i>').addTo(map);
    refresh();
  });
  refresh();
  requestAnimationFrame(frame);
});

/* ---------- barangay pins ---------- */
B.forEach(b=>{
  const el=document.createElement('div');el.className='pin';
  el.innerHTML='<i></i><span><b>'+b.name+'</b> · <span class="t"></span></span>';
  b.pinDot=el.querySelector('i');b.pinTxt=el.querySelector('.t');
  const pop=new maplibregl.Popup({offset:18});
  pop.on('open',()=>{
    const li=b.springs.map(s=>'<li>'+s.name+(s.on?'':' (cut off)')+'</li>').join('')||'<li>None listed</li>';
    pop.setHTML('<b>'+b.name+'</b><br>Consumers: '+b.consumers+'<br>Demand now: '+Math.round(b.demand)+' L/min'+
      '<br>Supply: '+Math.round(b.inflow)+' L/min<br>Tank: '+Math.round(b.level/b.cap*100)+'%'+
      '<br>Water sources ('+b.springs.length+'):<ul>'+li+'</ul>');
  });
  new maplibregl.Marker({element:el,anchor:'bottom'}).setLngLat([b.lon,b.lat]).setPopup(pop).addTo(map);
});

/* ---------- loop ---------- */
let last=0;
function frame(ts){
  const dt=Math.min(0.1,(ts-(last||ts))/1000);last=ts;
  if(playing){step(dt*speed);flowClock+=dt}
  map.getSource('drops').setData(dropsData());
  if(ts-upd>200){upd=ts;refresh()}
  requestAnimationFrame(frame);
}

/* ---------- controls ---------- */
$('play').onclick=e=>{playing=!playing;e.target.textContent=playing?'Pause':'Play';e.target.classList.toggle('on',playing)};
document.querySelectorAll('.spd').forEach(b=>b.onclick=()=>{speed=+b.dataset.s;
  document.querySelectorAll('.spd').forEach(x=>x.classList.toggle('on',x===b))});
$('dr').oninput=e=>{drought=e.target.value/100;$('dv').textContent=e.target.value+'%'};
$('tp').onclick=()=>map.easeTo({pitch:Math.min(85,map.getPitch()+10)});
$('tm').onclick=()=>map.easeTo({pitch:Math.max(0,map.getPitch()-10)});
$('town').onclick=()=>map.flyTo({center:[123.3123,9.5707],zoom:15.5,pitch:65,bearing:-25,duration:2200});
$('rst').onclick=()=>map.flyTo({...HOME,duration:1600});
$('sat').onclick=e=>{const on=map.getLayoutProperty('sat','visibility')!=='visible';
  map.setLayoutProperty('sat','visibility',on?'visible':'none');e.target.classList.toggle('on',on)};
let orbiting=false;
function spin(){if(!orbiting)return;map.setBearing(map.getBearing()+0.12);requestAnimationFrame(spin)}
$('orb').onclick=e=>{orbiting=!orbiting;e.target.classList.toggle('on',orbiting);if(orbiting)spin()};
['mousedown','touchstart','wheel'].forEach(ev=>map.getCanvas().addEventListener(ev,()=>{
  if(orbiting){orbiting=false;$('orb').classList.remove('on')}},{passive:true}));
