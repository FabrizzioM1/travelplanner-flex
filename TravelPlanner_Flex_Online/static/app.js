/* TravelPlanner Flex — interfaz sin dependencias externas. JS para la vista; Python para datos. */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={tab:'inicio',trips:[],tripId:null,detail:null,catalog:[],destinations:[],filter:'Todos',city:'Veracruz',exploreDestination:null,exploreMode:'lugares',catalogSearch:'',transportOrigin:'',photoRequests:{},draft:null,pendingPlaceId:null,pendingRecommendation:null,authed:false,modal:null,voter:null,weather:null,csrf:null,gallery:null,experiences:[],experienceMode:'Pescar',experienceRegion:'Veracruz',experienceZone:'Todas',experienceType:'Todas',experienceLevel:'Todos',experiencePhotoIndex:0,experienceDetail:null,municipioEstado:'Veracruz',municipioNombre:'Catemaco',municipioActividad:'Naturaleza',municipioInteres:'Todos',municipioOrden:'puntaje',municipioResultados:[],municipioCargando:false,municipioCargado:false,municipioInfo:null,municipioExplicacion:null,municipioNombres:[],municipioFiltroCerca:false,municipioCatalogoCargado:false};
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateES=s=>{if(!s)return 'Sin fecha';const [y,m,d]=String(s).slice(0,10).split('-');return `${d}/${m}/${y}`};
const classifyPlace=p=>p?.categoria==='Gastronomía'?'Gastronomía':(['Naturaleza','Paseo','Aire libre'].includes(p?.categoria)?'Aire libre':'Cultura');
const mapsForPlace=p=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((p?.nombre||'')+', '+(p?.ciudad||'')+', México');
const restaurantsNear=p=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('restaurantes cerca de '+(p?.nombre||'')+', '+(p?.ciudad||'')+', México');
function commonsImageURL(raw, source){
 const image=String(raw||'');
 if(!image.startsWith('https://upload.wikimedia.org/'))return image;
 const page=String(source||'');
 const prefix='https://commons.wikimedia.org/wiki/File:';
 try{
   let name='';
   if(page.startsWith(prefix))name=decodeURIComponent(page.slice(prefix.length).split('?')[0]);
   else{
     // Algunos registros antiguos no tienen página de fuente, pero conservan
     // una URL directa de Wikimedia con el nombre original del fichero.
     const filename=image.split('?')[0].split('/').pop();
     name=decodeURIComponent(filename||'').replace(/^\d+px-/, '');
   }
   name=name.replace(/ /g,'_');
   if(!name||name.includes('/')||name.includes('\\'))return image;
   return 'https://commons.wikimedia.org/wiki/Special:Redirect/file/'+encodeURIComponent(name)+'?width=960';
 }catch(_){return image}
}
function brokenPhoto(el){
 const backup=el.dataset.originalPhoto;
 if(backup&&el.dataset.photoFallback!=='1'&&el.src!==backup){
   el.dataset.photoFallback='1';el.src=backup;return;
 }
 el.onerror=null;el.src='/static/img/photo-placeholder.svg';
}
const img=l=>commonsImageURL(l?.imagen||'/static/img/photo-placeholder.svg',l?.fuente);
const photo=(src,cl='card-img',alt='Fotografía del lugar')=>`<img loading="lazy" class="${cl}" src="${esc(src)}" alt="${esc(alt)}" onerror="brokenPhoto(this)">`;
function showResolvedPlacePhoto(node){
 const box=node?.closest('.place-photo-fallback');
 if(box&&!node.src.includes('photo-placeholder.svg'))box.classList.add('loaded');
}
function placePhotoWrap(p){
 const missing=!(p?.imagen)||String(p.imagen).endsWith('photo-placeholder.svg');
 if(!missing) return placePhoto(p);
 const icon=classifyPlace(p)==='Gastronomía'?'🍽':classifyPlace(p)==='Aire libre'?'🌿':'🏛';
 return `<div class="place-photo-fallback">${placePhoto(p)}<div class="place-photo-fallback-inner"><span class="place-photo-symbol" aria-hidden="true">${icon}</span><strong>${esc(p.nombre)}</strong><span>Fotografía pendiente de verificar</span><a href="${mapsForPlace(p)}" target="_blank" rel="noopener noreferrer">📷 Ver fotos reales en Maps ↗</a></div></div>`;
}

function placePhoto(place,cl='card-img'){const src=img(place);const pending=(!src||src==='/static/img/photo-placeholder.svg'||src.endsWith('photo-placeholder.svg'))&&!place?.foto_intentada;return `<img loading="lazy" class="${cl}" src="${esc(src)}" alt="Fotografía de ${esc(place?.nombre||'destino')}" ${pending?`data-place-photo="${esc(place?.id_lugar||'')}"`:''} data-original-photo="${esc(place?.imagen||'')}" onerror="brokenPhoto(this)">`}
async function hydratePlacePhotos(){
 const groups=new Map();
 for(const node of document.querySelectorAll('[data-place-photo]:not([data-photo-requested])')){
   const id=node.dataset.placePhoto;
   if(!id)continue;
   node.dataset.photoRequested='1';
   node.addEventListener('load',()=>showResolvedPlacePhoto(node));
   if(!groups.has(id))groups.set(id,[]);
   groups.get(id).push(node);
 }
 const entries=[...groups];
 for(let i=0;i<entries.length;i+=3){
   await Promise.all(entries.slice(i,i+3).map(async ([id,nodes])=>{
     const place=placeById(id);
     if(state.photoRequests[id]){
       if(place?.imagen&&place.imagen!=='/static/img/photo-placeholder.svg'){
         nodes.forEach(n=>{n.dataset.originalPhoto=place.imagen;n.src=commonsImageURL(place.imagen,place.fuente)});
       }
       return;
     }
     state.photoRequests[id]=true;
     try{
       const result=await api('/api/catalogo/foto/'+encodeURIComponent(id));
       if(place)Object.assign(place,result,{foto_intentada:!result.encontrada});
       nodes.forEach(n=>{
         if(result.imagen&&result.imagen!=='/static/img/photo-placeholder.svg'){
           n.dataset.originalPhoto=result.imagen;
           n.src=commonsImageURL(result.imagen,result.fuente);
         }else n.removeAttribute('data-place-photo');
       });
     }catch(_){
       if(place)place.foto_intentada=true;
       nodes.forEach(n=>n.removeAttribute('data-place-photo'));
     }
   }));
 }
}
const tag=(s,cl='')=>`<span class="pill ${cl}">${esc(s)}</span>`;
function toast(msg,error=false){let el=document.createElement('div');el.className='toast'+(error?' err':'');el.textContent=msg;$('#toast-root').append(el);setTimeout(()=>el.remove(),4500)}
async function api(url,options={}){const method=(options.method||'GET').toUpperCase();const secure=method!=='GET'&&state.csrf?{'X-CSRF-Token':state.csrf}:{};const opts={...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...secure,...(options.headers||{})}};if(options.body && typeof options.body!=='string')opts.body=JSON.stringify(options.body);
 const r=await fetch(url,opts);let d;try{d=await r.json()}catch{throw Error('El servidor no respondió correctamente.')}if(!r.ok)throw Error(d.error||'Error de conexión');return d}
function fail(err){toast(err.message||'Ocurrió un error',true)}
async function init(){try{let res=await api('/api/estado');state.csrf=res.csrf;if(res.autenticado)await authDone();else{$('#login').classList.remove('hidden');$('#shell').classList.add('hidden')}}catch(e){fail(e)}}
async function authDone(){state.authed=true;$('#login').classList.add('hidden');$('#shell').classList.remove('hidden');let cat=await api('/api/catalogo');state.catalog=cat.lugares;state.destinations=cat.destinos||[];const xp=await api('/api/experiencias?estado=Veracruz&actividad=Pescar');state.experiences=xp.experiencias||[];await loadTrips();if(!state.exploreDestination)state.exploreDestination=trip()?.destino||'Veracruz';render()}
async function loadTrips(id){const x=await api('/api/viajes');state.trips=x.viajes;const ids=state.trips.map(t=>t.id_viaje);if(id && ids.includes(Number(id)))state.tripId=Number(id);else if(!ids.includes(state.tripId))state.tripId=ids[0]||null;await loadDetail()}
async function loadDetail(){if(!state.tripId){state.detail=null;return}state.detail=await api('/api/viajes/'+state.tripId);if(!state.voter || !state.detail.viajeros.some(v=>v.id_viajero===state.voter))state.voter=state.detail.viajeros[0]?.id_viajero||null}
function trip(){return state.detail?.viaje||null}
function placeById(id){return state.catalog.find(l=>l.id_lugar===id)}
function renderNav(){let sel=$('#trip-select');sel.innerHTML=state.trips.length?state.trips.map(t=>`<option value="${t.id_viaje}" ${t.id_viaje===state.tripId?'selected':''}>${esc(t.nombre)}</option>`).join(''):'<option value="">Sin viajes</option>';
 $$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===state.tab))}
function render(){renderNav();let content={inicio:home,explorar:explore,municipios:municipiosPage,experiencias:experiences,agenda:agenda,reservas:reservations,finanzas:finance,grupo:group,ajustes:settings}[state.tab]||home;$('#content').innerHTML=content();renderDock();hydratePlacePhotos()}
function go(tab){if(tab==='explorar'&&!state.exploreDestination)state.exploreDestination=trip()?.destino||'Veracruz';state.tab=tab;state.filter='Todos';render();if(tab==='municipios'&&!state.municipioCatalogoCargado)loadMunicipalList();window.scrollTo({top:0,behavior:'smooth'})}
function header(eyebrow,title,sub,button=''){return `<div class="titlebar"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2><p>${sub}</p></div>${button}</div>`}
function empty(label='Primero crea un viaje',sub='Tu siguiente aventura empieza con un destino y unas fechas.'){
 return `<div class="empty"><div class="big">✈</div><h3>${label}</h3><p>${sub}</p><button class="btn primary" data-action="newtrip">+ Crear viaje</button></div>`}
function tripTiles(){if(!state.trips.length)return empty();return `<div class="grid grid-2">${state.trips.map(t=>{let l=state.catalog.find(x=>x.ciudad===t.destino);return `<article class="card trip-card">${placePhoto(l,'')}<div class="stack"><h4>${esc(t.nombre)}</h4><div class="small muted">${esc(t.destino)} · ${dateES(t.fecha_inicio)} al ${dateES(t.fecha_fin)}</div><div class="tiny">${tag('Saldo '+money(t.resumen.saldo),t.resumen.saldo<0?'alert':'')}</div><div class="btn-group"><button class="btn sm primary" data-action="choose-trip" data-id="${t.id_viaje}">Abrir →</button><button class="btn sm outline" data-action="edit-trip" data-id="${t.id_viaje}">Editar</button><button class="btn sm warn" data-action="delete-trip" data-id="${t.id_viaje}">Eliminar</button></div></div></article>`}).join('')}</div>`}
function home(){let t=trip(),b=state.detail?.presupuesto;if(!t)return header('ORGANIZA MEJOR','Viajar debería ser sencillo','Explora destinos, compara hospedaje y revisa transportes antes de crear tu itinerario.','<button class="btn primary" data-nav="explorar">Explorar México ↗</button>')+`<section class="section callout"><strong>Empieza por descubrir.</strong> Puedes explorar atractivos, buscar hoteles y consultar alternativas de transporte en las 32 entidades de México sin tener un viaje creado.</section><section class="section">${tripTiles()}</section>`;
 let mainPic=state.catalog.find(p=>p.ciudad===t.destino);return `<section class="hero"><div class="hero-info"><span class="eyebrow" style="color:#74d9d2">TU PRÓXIMA EXPERIENCIA</span><h1>Los mejores viajes<br>comienzan con un plan.</h1><p>Descubre experiencias, arma tu ruta y reacciona a los imprevistos sin perder el control de tu dinero.</p><div class="btn-group"><button class="btn light" data-action="newtrip">+ Nuevo viaje</button><button class="btn primary" data-nav="explorar">Explorar lugares ↗</button></div></div><div class="hero-photo">${placePhoto(mainPic,'')}</div></section>
 <section class="section">${header('MI VIAJE ACTUAL',esc(t.nombre),esc(t.destino)+' · '+dateES(t.fecha_inicio)+' al '+dateES(t.fecha_fin))}
 <div class="grid grid-4"><div class="stat"><div class="tiny muted">Presupuesto</div><div class="number">${money(b.presupuesto.monto_total)}</div></div><div class="stat"><div class="tiny muted">Gastos reales</div><div class="number">${money(b.gasto_real)}</div></div><div class="stat emph"><div class="tiny muted">Disponible</div><div class="number" style="color:${b.saldo<0?'#bb433b':'#12847b'}">${money(b.saldo)}</div></div><div class="stat"><div class="tiny muted">Actividades previstas</div><div class="number">${state.detail.dias.reduce((s,d)=>s+d.actividades.length,0)}</div></div></div></section>
 <section class="section"><div class="section-heading"><div><h3>¿Qué quieres hacer?</h3><p>Cada módulo se conecta con el mismo viaje.</p></div></div><div class="module-links"><button data-nav="explorar">◈ Ver lugares con fotos</button><button data-nav="experiencias">🎣 Buscar por actividad</button><button data-nav="municipios">🌿 Recomendar por municipio</button><button data-nav="agenda">▦ Organizar días</button><button data-nav="reservas">▤ Hospedaje y transporte</button><button data-nav="finanzas">◉ Controlar presupuesto</button><button data-nav="grupo">♧ Votar en grupo</button></div></section>
 <section class="section">${state.detail.alertas.map(a=>`<div class="alertbox ${a.level==='danger'?'danger':''}">⚠ ${esc(a.text)}</div>`).join('')}
 <div class="section-heading"><h3>Mis viajes</h3><button class="btn outline sm" data-action="newtrip">+ Crear otro</button></div>${tripTiles()}</section>
 <section class="section callout">✦ <strong>TravelPlanner Flex</strong> propone alternativas y detecta horarios encimados. Las fotografías del catálogo son imágenes reales seleccionadas de Wikimedia Commons; consulta el crédito y la licencia en los detalles de cada lugar. Los costos son estimaciones de demostración, no tarifas oficiales.</section>`}
function explore(){
 const destination=state.exploreDestination||'Veracruz';
 const allPlaces=[...new Map(state.catalog.filter(p=>p.ciudad===destination).map(p=>[p.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es-MX').trim(),p]).reverse()).values()].reverse();
 const query=state.catalogSearch.trim().toLocaleLowerCase('es-MX');
 const filtered=allPlaces.filter(p=>(state.filter==='Todos'||classifyPlace(p)===state.filter)&&(!query||`${p.nombre} ${p.descripcion} ${p.categoria}`.toLocaleLowerCase('es-MX').includes(query)));
 const cats=['Todos','Cultura','Aire libre','Gastronomía'];
 const tabs=[['lugares','Lugares'],['hospedaje','Hoteles'],['transporte','Transporte']];
 const municipalShortcut=`<div class="experience-shortcut"><div><strong>🌿 ¿Qué visitar en un municipio?</strong><span>Selecciona estado, municipio e interés. Consulta por qué recomendamos cada lugar.</span></div><button class="btn primary" data-nav="municipios">Recomendaciones por municipio →</button></div>`;
 const expShortcut=`<div class="experience-shortcut"><div><strong>🎣 ¿Buscas algo que hacer?</strong><span>Pesca deportiva y otras experiencias, sin elegir destino primero.</span></div><button class="btn primary" data-nav="experiencias">Explorar por actividad →</button></div>`;
 const tabHtml=`<div class="explore-tabs">${tabs.map(([key,label])=>`<button class="${state.exploreMode===key?'active':''}" data-action="explore-mode" data-mode="${key}">${label}</button>`).join('')}</div>`;
 const selector=`<div class="destination-search"><div class="field"><label for="city-filter">Destino o entidad</label><select id="city-filter">${state.destinations.map(c=>`<option value="${esc(c)}" ${destination===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="destination-note"><strong>${allPlaces.length} lugares destacados</strong><span>Catálogo nacional · México</span></div></div>`;
 let panel='';
 if(state.exploreMode==='lugares'){
   panel=`<div class="filters"><input id="catalog-search" class="catalog-search" type="search" placeholder="Buscar lugar, actividad o categoría…" value="${esc(state.catalogSearch)}"><span class="tiny muted">${filtered.length} resultados</span></div><div class="filter-bar filters" role="group" aria-label="Filtrar lugares">${cats.map(c=>`<button data-action="filter" data-filter="${esc(c)}" class="${state.filter===c?'on':''}" aria-pressed="${state.filter===c}">${esc(c)} <span class="filter-count">${c==='Todos'?allPlaces.length:allPlaces.filter(p=>classifyPlace(p)===c).length}</span></button>`).join('')}</div><p class="filter-help">Elige un filtro. Gastronomía reúne mercados y zonas para comer, no restaurantes con horarios o precios verificados. Pulsa “Ver fotos y detalles” para deslizar la galería.</p><div class="grid grid-3">${filtered.map(l=>`<article class="card place-card">${placePhotoWrap(l)}<div class="card-footer"><div class="row between">${tag(classifyPlace(l))}${tag(l.interior?'Bajo techo':'Exterior',l.interior?'':'ochre')}</div><div class="meta"><h4>${esc(l.nombre)}</h4><p>${esc(l.descripcion)}</p><span class="tiny muted">${esc(l.ciudad)} · Foto: ${esc(l.credito||'Crédito y licencia al consultar la imagen')}</span></div><div class="row between"><span class="cost">${Number(l.precio_estimado)>0?money(l.precio_estimado):'Consultar tarifa'}</span><span class="tiny muted">~ ${l.duracion_min} min</span></div><div class="btn-group"><button class="btn sm primary" data-action="add-place" data-id="${l.id_lugar}">+ Mi itinerario</button><button class="btn sm outline" data-action="info-place" data-id="${l.id_lugar}">📷 Ver fotos y detalles</button>${classifyPlace(l)==='Gastronomía'?`<a class="btn sm soft" href="${restaurantsNear(l)}" target="_blank" rel="noopener noreferrer">🍽 Dónde comer ↗</a>`:''}</div></div></article>`).join('')||'<div class="empty">No encontramos lugares con ese filtro. Prueba otra búsqueda.</div>'}</div><p class="illustration-label">Los lugares son una selección inicial representativa, no un inventario exhaustivo de todos los atractivos de México. Los costos se muestran solo cuando existe un dato cargado; confirma tarifas y horarios con cada recinto.</p>`;
 }else if(state.exploreMode==='hospedaje'){
   const t=trip();const dates=t&&t.destino===destination?`&checkin=${encodeURIComponent(t.fecha_inicio)}&checkout=${encodeURIComponent(t.fecha_fin)}&group_adults=${Math.max(1,Number(t.num_viajeros)||1)}`:'';
   const q=`${destination}, México`;const bookingFor=term=>`https://www.booking.com/searchresults.es.html?ss=${encodeURIComponent(term+' en '+q)}${dates}`;const mapsFor=term=>`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(term+' en '+q)}`;const google=`https://www.google.com/travel/search?q=${encodeURIComponent('hoteles en '+q)}`;const airbnb=`https://www.airbnb.mx/s/${encodeURIComponent(q)}/homes`;
   const choices=[['Ahorro','Hostales y hoteles económicos','Para priorizar el costo y destinar más presupuesto a experiencias.','Busca opciones económicas, hostales y habitaciones privadas.'],['Céntrico','Hoteles cerca de los atractivos','Para reducir traslados y aprovechar mejor cada día.','Compara la ubicación con los lugares que agregaste al itinerario.'],['Familiar','Alojamientos para grupos y familias','Para revisar habitaciones múltiples, estacionamiento y servicios.','Verifica capacidad, políticas para menores y cancelación.'],['Experiencia','Hoteles boutique y alojamientos especiales','Para priorizar diseño, ubicación o una experiencia distinta.','Compara reseñas recientes y servicios incluidos.']];
   panel=`<div class="recommendation-intro"><span class="eyebrow">HOSPEDAJE SEGÚN TU ESTILO</span><h3>Encuentra dónde quedarte en ${esc(destination)}</h3><p>Te llevamos a buscadores con resultados actualizados. Las tarifas, impuestos y disponibilidad se consultan directamente con cada proveedor.</p></div><div class="grid grid-2 recommendation-grid">${choices.map(([tier,title,desc,tip])=>{const term=tier==='Ahorro'?'hostales y hoteles económicos':tier==='Céntrico'?'hoteles céntricos':tier==='Familiar'?'hoteles familiares':'hoteles boutique';return `<article class="card recommendation-card"><div class="recommendation-icon">⌂</div><div class="recommendation-body"><span class="pill">${tier}</span><h4>${title}</h4><p>${desc}</p><small>${tip}</small><div class="provider-links"><a class="btn sm primary" href="${bookingFor(term)}" target="_blank" rel="noopener noreferrer">Booking.com ↗</a><a class="btn sm outline" href="${mapsFor(term)}" target="_blank" rel="noopener noreferrer">Google Maps ↗</a></div><button class="btn sm soft" data-action="register-hotel" data-tier="${tier}">Registrar opción en mi viaje</button></div></article>`}).join('')}</div><div class="callout orange">TravelPlanner no confirma reservas ni recibe pagos. Revisa reseñas, ubicación, políticas de cancelación y precio final antes de reservar. También puedes <a href="${google}" target="_blank" rel="noopener noreferrer">comparar hoteles en Google Travel ↗</a> o <a href="${airbnb}" target="_blank" rel="noopener noreferrer">ver alojamientos en Airbnb ↗</a>.</div>`;
 }else{
   const origin=state.transportOrigin||'';const route=`${origin||'tu origen'} a ${destination}, México`;const busSearch=`https://www.google.com/search?q=${encodeURIComponent('autobuses de '+route)}`;const flightSearch=`https://www.google.com/travel/flights?q=${encodeURIComponent('Vuelos de '+route)}`;const mapRoute=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin||'México')}&destination=${encodeURIComponent(destination+', México')}&travelmode=driving`;
   const bus=[['ADO','https://www.ado.com.mx/'],['ETN Turistar','https://etn.com.mx/'],['Primera Plus','https://www.primeraplus.com.mx/'],['Autobuses Futura','https://www.futura.com.mx/'],['Ómnibus de México','https://www.odm.com.mx/']];const air=[['Volaris','https://www.volaris.com/'],['Viva','https://www.vivaaerobus.com/'],['Aeroméxico','https://www.aeromexico.com/']];
   panel=`<div class="recommendation-intro"><span class="eyebrow">COMPARA CÓMO LLEGAR</span><h3>Opciones de transporte hacia ${esc(destination)}</h3><p>Indica desde dónde sales. Las rutas, horarios y tarifas dependen de la fecha y de la cobertura de cada proveedor.</p></div><div class="transport-origin"><div class="field"><label for="transport-origin">¿Desde dónde viajas?</label><input id="transport-origin" type="text" placeholder="Ej. Veracruz, Veracruz" value="${esc(origin)}"></div><button class="btn primary" data-action="refresh-transport">Actualizar ruta</button></div><div class="grid grid-2 recommendation-grid"><article class="card recommendation-card"><div class="recommendation-icon">▤</div><div class="recommendation-body"><span class="pill">Autobús</span><h4>Compara líneas de autobús</h4><p>Consulta cobertura de ruta, terminales, horarios y equipaje directamente con la empresa.</p><div class="provider-links">${bus.map(([name,url])=>`<a class="provider-link" href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join('')}<a class="provider-link" href="${busSearch}" target="_blank" rel="noopener noreferrer">Buscar esta ruta ↗</a></div><button class="btn sm soft" data-action="register-transport" data-type="autobus">Registrar autobús en mi viaje</button></div></article><article class="card recommendation-card"><div class="recommendation-icon">✈</div><div class="recommendation-body"><span class="pill">Avión</span><h4>Compara vuelos</h4><p>Revisa aeropuertos cercanos, escalas, equipaje y cargos adicionales.</p><div class="provider-links">${air.map(([name,url])=>`<a class="provider-link" href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join('')}<a class="provider-link" href="${flightSearch}" target="_blank" rel="noopener noreferrer">Google Flights ↗</a></div><button class="btn sm soft" data-action="register-transport" data-type="avion">Registrar vuelo en mi viaje</button></div></article><article class="card recommendation-card"><div class="recommendation-icon">⌖</div><div class="recommendation-body"><span class="pill">Automóvil</span><h4>Consulta una ruta por carretera</h4><p>Revisa recorrido, casetas y condiciones viales antes de salir.</p><div class="provider-links"><a class="btn sm outline" href="${mapRoute}" target="_blank" rel="noopener noreferrer">Abrir ruta en Google Maps ↗</a></div><button class="btn sm soft" data-action="register-transport" data-type="auto">Registrar automóvil en mi viaje</button></div></article><article class="card recommendation-card"><div class="recommendation-icon">⇄</div><div class="recommendation-body"><span class="pill">Transporte local</span><h4>Muévete en el destino</h4><p>Consulta transporte público, taxis autorizados y movilidad local.</p><div class="provider-links"><a class="btn sm outline" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('transporte público en '+destination+', México')}" target="_blank" rel="noopener noreferrer">Buscar opciones locales ↗</a></div></div></article></div><div class="callout orange">No mostramos horarios, precios ni asientos como si fueran datos en vivo. La disponibilidad se consulta en el sitio del proveedor.</div>`;
 }
 return header('DESCUBRE · COMPARA · ELIGE','Explora México','Lugares, hospedaje y transporte antes o después de crear un viaje.',`<button class="btn primary" data-action="newtrip">+ Crear viaje</button>`)+`<section class="section">${municipalShortcut}${expShortcut}${selector}${tabHtml}<div class="explore-panel">${panel}</div></section>`;
}
/* TravelPlanner Flex 2.2 — Explorar por actividad (Pescar en Veracruz). */
const experienceById=id=>state.experiences.find(x=>x.id===id);
const experienceMaps=e=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('pesca recreativa '+e.zona+', Veracruz, México');
const experienceGuides=e=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('guías pesca deportiva '+e.zona+', Veracruz, México');
const experiencePlacePhoto=(e,cls='experience-image')=>{
 const p=e.fotos?.[0];
 return `<div class="experience-cover"><img loading="lazy" class="${cls}" src="${esc(p?.imagen||'/static/img/photo-placeholder.svg')}" alt="Vista del entorno de ${esc(e.zona)}" onerror="this.onerror=null;this.closest('.experience-cover')?.classList.add('no-photo');this.hidden=true"><div class="experience-photo-backup"><span>🎣</span><strong>${esc(e.zona)}</strong><a href="${esc(p?.fuente||experienceMaps(e))}" target="_blank" rel="noopener noreferrer">Ver foto original ↗</a></div><div class="experience-cover-caption">Fotografía del entorno · no de una salida contratada</div></div>`;
};
function experiences(){
 const all=state.experiences.filter(x=>x.estado===state.experienceRegion && x.actividad===state.experienceMode);
 const zones=['Todas',...new Set(all.map(e=>e.zona))];
 const types=['Todas',...new Set(all.map(e=>e.modalidad))];
 const filtered=all.filter(e=>(state.experienceZone==='Todas'||e.zona===state.experienceZone)&&
    (state.experienceType==='Todas'||e.modalidad===state.experienceType)&&
    (state.experienceLevel==='Todos'||e.nivel===state.experienceLevel));
 const typesUi=['🎣 Pescar','🥾 Senderismo','🤿 Bucear','🚣 Kayak','🏕️ Acampar'];
 return header('ELIGE LO QUE QUIERES HACER','Explora por actividad',
    'No necesitas conocer el destino. Elige una actividad y te mostramos zonas para planearla.')+
 `<section class="section"><div class="experience-intro"><div><span class="eyebrow">EXPERIENCIAS QUE SE ADAPTAN A TI</span>
 <h3>¿Qué quieres hacer?</h3><p>Empieza con la pesca recreativa en Veracruz. Más experiencias se incorporarán de manera progresiva.</p></div>
 <div class="experience-activity-list">${typesUi.map((a,i)=>`<button type="button" class="experience-activity-option ${i===0?'chosen':''}" ${i===0?'aria-pressed="true"':''} data-action="experience-activity" data-type="${i===0?'Pescar':esc(a)}">${a}${i===0?'<small>Disponible</small>':'<small>Próximamente</small>'}</button>`).join('')}</div></div>
 <div class="experience-controls card"><div class="field"><label for="experience-region">Región</label><select id="experience-region"><option value="Veracruz" selected>Veracruz</option></select></div>
 <div class="field"><label for="experience-zone">Zona</label><select id="experience-zone">${zones.map(z=>`<option value="${esc(z)}" ${state.experienceZone===z?'selected':''}>${esc(z)}</option>`).join('')}</select></div>
 <div class="field"><label for="experience-type">Modalidad</label><select id="experience-type">${types.map(t=>`<option value="${esc(t)}" ${state.experienceType===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
 <div class="field"><label for="experience-level">Nivel orientativo</label><select id="experience-level">${['Todos','Principiante','Intermedio'].map(t=>`<option value="${t}" ${state.experienceLevel===t?'selected':''}>${t}</option>`).join('')}</select></div>
 <button type="button" class="btn outline" data-action="experience-reset">Limpiar filtros</button></div>
 <div class="experience-subheading"><div><h3>🎣 Pescar en Veracruz</h3><p>${filtered.length} zonas de referencia para consultar excursiones y guías</p></div><a href="https://www.gob.mx/conapesca/es/documentos/conapesca-01-016-pesca-deportivo-recreativa" target="_blank" rel="noopener noreferrer">Permisos y reglas oficiales ↗</a></div>
 <div class="experience-grid">${filtered.map(e=>`<article class="experience-card">${experiencePlacePhoto(e)}<div class="experience-card-body"><div class="experience-tags"><span>${esc(e.modalidad)}</span><span>${esc(e.nivel)}</span></div><h4>${esc(e.nombre)}</h4><p>${esc(e.descripcion)}</p><div class="experience-metadata">📍 ${esc(e.zona)} · ⏱ ${e.duracion_min} min sugeridos para agenda</div><div class="experience-price">Precio: consultar al operador</div><div class="experience-buttons"><button class="btn sm primary" data-action="experience-detail" data-id="${esc(e.id)}">Detalles y guías</button><button class="btn sm outline" data-action="experience-add" data-id="${esc(e.id)}">+ Mi viaje</button></div></div></article>`).join('')||'<div class="empty">No hay zonas con esta combinación. Prueba limpiar filtros.</div>'}</div>
 <div class="callout orange experience-advice"><strong>Antes de salir:</strong> las fotografías son del entorno, no de operadores. Estos resultados no confirman permisos, capturas, precios ni disponibilidad; revisa la normativa, el clima y las condiciones de seguridad con un guía autorizado.</div></section>`;
}
function experienceDetailHTML(e){
 const photos=e.fotos||[],idx=((state.experiencePhotoIndex%photos.length)+photos.length)%photos.length,p=photos[idx];
 const gallery=`<div class="experience-detail-gallery"><div class="experience-photo-frame"><img src="${esc(p?.imagen||'/static/img/photo-placeholder.svg')}" alt="Vista ${idx+1} del entorno de ${esc(e.zona)}" onerror="this.onerror=null;this.closest('.experience-photo-frame')?.classList.add('no-photo');this.hidden=true"><div class="experience-photo-backup"><span>🎣</span><strong>${esc(e.zona)}</strong><a href="${esc(p?.fuente||experienceMaps(e))}" target="_blank" rel="noopener noreferrer">Abrir fotografía original ↗</a></div>
 ${photos.length>1?`<button class="experience-arrow prev" aria-label="Foto anterior" data-action="experience-prev">‹</button><button class="experience-arrow next" aria-label="Siguiente fotografía" data-action="experience-next">›</button>`:''}
 <span class="experience-photo-count">${idx+1} / ${photos.length}</span></div>
 <div class="experience-photo-footer"><span>Foto del entorno · ${esc(p?.credito||'Wikimedia Commons')} · ${esc(p?.licencia||'')}</span><a href="${esc(p?.fuente||'https://commons.wikimedia.org')}" target="_blank" rel="noopener noreferrer">Fuente y licencia ↗</a></div>
 ${photos.length>1?`<div class="experience-photo-dots">${photos.map((_,i)=>`<button aria-label="Ver foto ${i+1}" class="${i===idx?'active':''}" data-action="experience-dot" data-index="${i}"></button>`).join('')}</div>`:''}</div>`;
 const ops=e.operadores||[];
 const cards=ops.length?ops.map(op=>`<div class="experience-operator"><div><h4>${esc(op.nombre)}</h4><p>${esc(op.tipo)}</p><p>${esc(op.descripcion)}</p><small>${esc(op.vigencia)}</small></div><div class="experience-operator-actions">${op.telefono?`<a class="btn sm outline" href="tel:+52${esc(op.telefono)}">Llamar ↗</a>`:''}<a class="btn sm soft" href="${esc(op.fuente)}" target="_blank" rel="noopener noreferrer">Ver fuente ↗</a></div></div>`).join(''):'<p class="small muted">No tenemos todavía un operador específico verificado para esta zona. Puedes consultar el directorio o buscar guías locales; confirma que estén activos y autorizados.</p>';
 return `${gallery}<div class="experience-detail-content"><div class="experience-tags"><span>${esc(e.modalidad)}</span><span>${esc(e.nivel)}</span></div><p>${esc(e.descripcion)}</p><p><strong>Duración sugerida para agendar:</strong> ${e.duracion_min} minutos. No es la duración de un paquete ofertado.</p>
 <p><strong>Qué debes confirmar:</strong> ${esc(e.equipo)}</p><p><strong>Antes de ir:</strong> ${esc(e.nota)}</p>
 <h3>Operadores y consultas</h3>${cards}<div class="experience-links"><a class="btn primary" href="${experienceGuides(e)}" target="_blank" rel="noopener noreferrer">Buscar guías en Maps ↗</a><a class="btn outline" href="${experienceMaps(e)}" target="_blank" rel="noopener noreferrer">Ver zona ↗</a><a class="btn soft" href="https://www.gob.mx/conapesca/documentos/prestadores-de-servicios?state=published" target="_blank" rel="noopener noreferrer">Directorio CONAPESCA ↗</a><a class="btn soft" href="https://www.gob.mx/conapesca/es/documentos/conapesca-01-016-pesca-deportivo-recreativa" target="_blank" rel="noopener noreferrer">Permisos y reglas ↗</a></div>
 <div class="experience-bottom"><strong>Costo: por cotizar · Sin reservación automática</strong><button class="btn primary" data-action="experience-add" data-id="${esc(e.id)}">+ Agregar a mi viaje</button></div></div>`;
}
function openExperienceDetails(id){const e=experienceById(id);if(!e){toast('No se encontró la experiencia.',true);return;}state.experienceDetail=e;state.experiencePhotoIndex=0;showModal(e.nombre,experienceDetailHTML(e),true);}
function updateExperienceGallery(){if(!state.experienceDetail)return;const m=$('#modal-root .modal');if(!m)return;const heading=m.querySelector('.modal-head')?.outerHTML||'';
 // Replace only the gallery, preserving the rest of the modal's interactive content.
 const tmp=document.createElement('div');tmp.innerHTML=experienceDetailHTML(state.experienceDetail);const replacement=tmp.querySelector('.experience-detail-gallery');const old=m.querySelector('.experience-detail-gallery');if(old&&replacement)old.replaceWith(replacement);
}
function openExperienceAdd(id){
 const e=experienceById(id);if(!e){toast('Experiencia no encontrada.',true);return;}
 const options=state.trips.filter(t=>t.destino==='Veracruz');
 if(!options.length){closeModal();state.pendingPlaceId=e.lugar_id;openForm('viaje',null,{destino:'Veracruz',nombre:'Mi viaje de pesca'});toast('Crea un viaje a Veracruz y agregaremos la experiencia al primer día.');return;}
 const chosen=options.find(t=>t.id_viaje===state.tripId)||options[0];
 state.experienceDetail=e;
 showModal('Agrega a tu itinerario',`<p class="modal-sub">${esc(e.nombre)} · El costo todavía no está confirmado. Podrás editarlo cuando cotices con el operador.</p>
 <form id="experience-plan-form" data-id="${esc(id)}"><div class="form-grid"><div class="field full"><label for="experience-trip">Viaje a Veracruz *</label><select id="experience-trip" required>${options.map(t=>`<option value="${t.id_viaje}" ${chosen.id_viaje===t.id_viaje?'selected':''}>${esc(t.nombre)} (${dateES(t.fecha_inicio)} – ${dateES(t.fecha_fin)})</option>`).join('')}</select></div><div class="field"><label for="experience-date">Fecha *</label><input id="experience-date" type="date" required min="${esc(chosen.fecha_inicio)}" max="${esc(chosen.fecha_fin)}" value="${esc(chosen.fecha_inicio)}"></div><div class="field"><label for="experience-time">Hora prevista *</label><input id="experience-time" type="time" required value="08:00"></div></div><div class="form-actions"><button type="button" class="btn outline" data-action="close">Cancelar</button><button type="submit" class="btn primary">Guardar en itinerario →</button></div></form>`,true);
}

function agenda(){if(!trip())return header('ITINERARIO','Organiza tus días','')+empty();let d=state.detail,days=d.dias;return header('PLANEA SIN CHOQUES','Itinerario de '+esc(d.viaje.destino),'Selecciona un día, agrega lugares y usa Plan B cuando cambien las cosas.',`<div class="btn-group"><button class="btn primary" data-action="add-day">+ Agregar día</button><button class="btn outline" data-action="auto-route">◈ Ruta sugerida</button><button class="btn outline" data-action="weather">☂ Pronóstico</button></div>`)+
 `<section class="section"><div class="callout"><strong>¿Cambio de planes?</strong> En cualquier actividad pulsa «Plan B» y elige «Lluvia», «Cancelación» o «Presupuesto». La app mostrará alternativas y su diferencia de costo estimado.</div>
 ${days.length?days.map(d=>`<article class="card day-card"><div class="day-head"><div><div class="day-date">${dateES(d.fecha)}</div><h3>${esc(d.titulo||'Mi día')}</h3><p class="muted tiny" style="margin:6px 0">${esc(d.descripcion||'Organiza tus experiencias')}</p></div><div class="btn-group"><button class="btn sm outline" data-action="edit-day" data-id="${d.id_itinerario}">Editar</button><button class="btn sm primary" data-action="add-activity" data-id="${d.id_itinerario}">+ Actividad</button><button class="btn sm warn" data-action="delete-item" data-table="itinerario" data-id="${d.id_itinerario}">Eliminar</button></div></div>
 ${d.actividades.length?d.actividades.map(a=>`<div class="activity">${photo(a.imagen||img(state.catalog[0]),'','Fotografía del lugar de la actividad')}<div class="desc"><h4>${esc(a.nombre)} ${a.estado==='cancelada'?tag('Cancelada','alert'):''}</h4><p>⏱ ${esc(a.hora_inicio)} · ${a.duracion_min} min · ${esc(a.categoria)} · ${money(a.costo_estimado)} estimado</p><p>${esc(a.lugar||'Lugar por definir')}</p></div><div class="actions"><button class="btn sm soft" data-action="planb" data-id="${a.id_actividad}">Plan B ↗</button><button class="btn sm outline" data-action="edit-activity" data-id="${a.id_actividad}">Editar</button><button class="btn sm warn" data-action="delete-item" data-table="actividad" data-id="${a.id_actividad}">×</button></div></div>`).join(''):`<div class="empty"><div class="big">☼</div><p>Este día todavía no tiene actividades.</p><button class="btn sm primary" data-action="add-activity" data-id="${d.id_itinerario}">+ Agregar actividad</button></div>`}</article>`).join(''):empty('Tu agenda está vacía','Primero agrega un día y después actividades con hora y lugar.')}
 </section>`}
function reservations(){if(!trip())return header('RESERVACIONES','Hospedaje y transporte','')+empty();let d=state.detail;return header('TODOS TUS DATOS EN UN LUGAR','Hospedaje y transporte','Guarda tus reservaciones y costos previstos. No reserva ni compra boletos por sí sola.')+
 `<section class="section"><div class="section-heading"><h3>🏠 Hospedajes</h3><button class="btn primary sm" data-action="add-hostel">+ Hospedaje</button></div>${d.hospedajes.length?d.hospedajes.map(h=>`<div class="card reservation"><div class="detail"><div class="row"><h4>${esc(h.nombre)}</h4>${tag(h.estado,h.estado==='pendiente'?'ochre':'')}</div><p>📍 ${esc(h.direccion||'Sin dirección')} · ${dateES(h.fecha_entrada)} → ${dateES(h.fecha_salida)}</p><p>Previsto: ${money(h.costo)} · Reservación: ${esc(h.num_reservacion||'Pendiente')}</p></div><div class="actions"><button class="btn sm outline" data-action="edit-hostel" data-id="${h.id_hospedaje}">Editar</button><button class="btn sm warn" data-action="delete-item" data-table="hospedaje" data-id="${h.id_hospedaje}">Eliminar</button></div></div>`).join(''):`<div class="empty">Aún no hay hospedajes. Puedes agregarlos cuando tengas información.</div>`}</section>
 <section class="section"><div class="section-heading"><h3>✈ Transportes</h3><button class="btn primary sm" data-action="add-transport">+ Transporte</button></div>${d.transportes.length?d.transportes.map(t=>`<div class="card reservation"><div class="detail"><h4>${esc(t.tipo).toUpperCase()} · ${esc(t.origen)} → ${esc(t.destino)}</h4><p>Salida: ${esc(t.fecha_hora_salida.replace('T',' '))} · Llegada: ${esc((t.fecha_hora_llegada||'Pendiente').replace('T',' '))}</p><p>Previsto: ${money(t.costo)} · Boleto: ${esc(t.num_reservacion||'Pendiente')}</p></div><div class="actions"><button class="btn sm outline" data-action="edit-transport" data-id="${t.id_transporte}">Editar</button><button class="btn sm warn" data-action="delete-item" data-table="transporte" data-id="${t.id_transporte}">Eliminar</button></div></div>`).join(''):`<div class="empty">Todavía no hay transportes registrados.</div>`}</section>`}
function finance(){if(!trip())return header('CONTROL DE COSTOS','Presupuesto y gastos','')+empty();let d=state.detail,b=d.presupuesto,limit=b.presupuesto.monto_total,used=b.gasto_real,perc=limit?Math.min(100,Math.round(used/limit*100)):0;return header('NO MÁS GASTOS SORPRESA','Tus números, a la vista','Diferenciamos costos planeados de dinero realmente gastado.',`<div class="btn-group"><button class="btn outline" data-action="edit-budget">Editar presupuesto</button><button class="btn primary" data-action="add-expense">+ Registrar gasto</button></div>`)+
 `<section class="section"><div class="grid grid-3"><div class="stat"><div class="small muted">Presupuesto total</div><div class="number">${money(limit)}</div></div><div class="stat"><div class="small muted">Gastos reales</div><div class="number">${money(used)}</div></div><div class="stat ${b.saldo<0?'danger':'emph'}"><div class="small muted">Saldo disponible</div><div class="number">${money(b.saldo)}</div></div></div><div class="card card-pad" style="margin-top:15px"><div class="row between"><h4>Presupuesto utilizado</h4><strong>${b.porcentaje}%</strong></div><div class="progress"><span style="width:${perc}%;background:${b.saldo<0?'#d65f55':'#128c86'}"></span></div><p class="tiny muted">Gasto real, no las estimaciones de actividades ni reservaciones.</p></div></section>
 <section class="section"><div class="grid grid-2"><div class="card card-pad"><div class="section-heading"><h3>Costos planeados</h3></div><div class="stack"><div class="row between"><span class="small">Hospedaje</span><b>${money(b.estimado_hospedaje)}</b></div><div class="row between"><span class="small">Transporte</span><b>${money(b.estimado_transporte)}</b></div><div class="row between"><span class="small">Actividades</span><b>${money(b.estimado_actividades)}</b></div><div class="divider"></div><div class="row between"><strong>Total estimado</strong><strong>${money(b.estimado_total)}</strong></div><p class="tiny muted">No se suma automáticamente a los gastos reales para evitar duplicaciones.</p></div></div><div class="card card-pad"><div class="section-heading"><h3>Presupuesto por categoría</h3><button class="btn sm soft" data-action="add-category">+ Categoría</button></div>${b.categorias.length?b.categorias.map(c=>`<div class="row between" style="margin:11px 0"><span class="small">${esc(c.categoria)}</span><div class="row"><b class="small">${money(c.monto)}</b><button class="btn sm warn" data-action="delete-item" data-table="presupuesto_categoria" data-id="${c.id_pc}">×</button></div></div>`).join(''):`<p class="muted small">Sin categorías aún.</p>`}</div></div></section>
 <section class="section"><div class="section-heading"><h3>Gastos registrados</h3><button class="btn sm primary" data-action="add-expense">+ Gasto</button></div>${d.gastos.length?d.gastos.map(g=>`<div class="card reservation"><div class="detail"><h4>${esc(g.concepto)} · ${money(g.monto)}</h4><p>${esc(g.categoria)} · ${dateES(g.fecha)} · ${esc(g.metodo_pago)} ${g.compartido?'· Compartido':''}</p></div><div class="actions"><button class="btn sm outline" data-action="edit-expense" data-id="${g.id_gasto}">Editar</button><button class="btn sm warn" data-action="delete-item" data-table="gasto" data-id="${g.id_gasto}">Eliminar</button></div></div>`).join(''):`<div class="empty">Aún no registras gastos reales.</div>`}</section>`}
function group(){if(!trip())return header('PLAN EN EQUIPO','Viajes en grupo','')+empty();let d=state.detail,places=state.catalog.filter(l=>l.ciudad===d.viaje.destino);return header('DECIDAN ENTRE TODOS','Viaje en grupo','Añade integrantes, voten por lugares y revisen quién pagó los gastos compartidos.',`<button class="btn primary" data-action="add-traveler">+ Integrante</button>`)+
 `<section class="section"><div class="grid grid-2"><div class="card card-pad"><h3>Integrantes</h3><p class="tagline">Participantes de este viaje</p><div class="divider"></div>${d.viajeros.length?d.viajeros.map(x=>`<div class="row between" style="padding:5px 0"><span>${esc(x.nombre)}</span><button class="btn sm warn" data-action="delete-item" data-table="viajero" data-id="${x.id_viajero}">Eliminar</button></div>`).join(''):'<p class="muted small">Agrega a tu grupo.</p>'}</div><div class="card card-pad"><h3>Intereses del viaje</h3><p class="tagline">Ayudan a ordenar las recomendaciones.</p><div class="divider"></div><div class="chips">${['Cultura','Historia','Naturaleza','Gastronomía','Paseo'].map(c=>`<button data-action="preference" data-cat="${c}" class="${d.preferencias.includes(c)?'on':''}">${c}</button>`).join('')}</div></div></div></section>
 <section class="section"><div class="section-heading"><h3>Voten experiencias</h3></div><div class="row small"><label for="voter">Vota como:</label><select id="voter" class="select-plain">${d.viajeros.map(v=>`<option value="${v.id_viajero}" ${v.id_viajero===state.voter?'selected':''}>${esc(v.nombre)}</option>`).join('')}</select><span class="tiny muted">Votaciones registradas por integrante dentro de tu viaje.</span></div><div class="card" style="margin-top:12px">${places.map(l=>{let votes=d.votos.find(v=>v.id_lugar===l.id_lugar);return `<div class="vote-card">${photo(img(l),'')}<div class="text"><h4>${esc(l.nombre)}</h4><p>${esc(l.categoria)} · Sí: ${votes?.si||0} · No: ${votes?.no||0}</p></div><div class="btn-group"><button class="btn sm soft" data-action="vote" data-id="${l.id_lugar}" data-vote="1">👍</button><button class="btn sm outline" data-action="vote" data-id="${l.id_lugar}" data-vote="-1">👎</button></div></div>`}).join('')}</div></section>
 <section class="section"><h3>Reparto de gastos compartidos</h3><p class="tagline">Cálculo igualitario para gastos marcados como compartidos y con pagador registrado.</p><div class="card card-pad" style="margin-top:12px">${Object.entries(d.reparto).map(([n,v])=>`<div class="row between" style="padding:9px 0;border-bottom:1px solid var(--line)"><div><strong>${esc(n)}</strong><p class="muted tiny" style="margin:5px 0">Pagó ${money(v.pagado)} · Parte ${money(v.parte)}</p></div>${tag((v.saldo>=0?'A favor ':'Por pagar ')+money(Math.abs(v.saldo)),v.saldo<0?'ochre':'')}</div>`).join('')||'<p>Agrega viajeros para empezar.</p>'}</div></section>`}
function settings(){return header('INFORMACIÓN Y CONTROL','Configuración','Administra tus datos y consulta las fuentes de las fotografías.')+
 `<section class="section"><div class="grid grid-2"><div class="card card-pad"><h3>Exportar mis datos</h3><p class="tagline">Descarga viajes, reservaciones, itinerarios, presupuestos, gastos y preferencias en formato JSON.</p><br><button class="btn primary" data-action="export">↓ Descargar respaldo</button></div><div class="card card-pad"><h3>Tu cuenta</h3><p class="tagline">Tus viajes se guardan en la base de datos de tu cuenta y se comparten entre tus dispositivos al iniciar sesión.</p><br><button class="btn outline" data-action="logout">Cerrar sesión</button></div></div></section><section class="section callout orange"><strong>Alcance real:</strong> TravelPlanner no vende boletos ni confirma reservaciones. Los precios y tiempos son estimaciones; verifica horarios, tarifas y disponibilidad con los recintos. Plan B sugiere alternativas del catálogo y requiere que confirmes el cambio.</section><section class="section"><h3>Qué incluye la aplicación</h3><div class="special-flow"><span>Cuenta por usuario</span><span>Base de datos compartida</span><span>32 entidades · lugares destacados</span><span>Créditos y licencias</span><span>Detección de horarios</span><span>Plan B</span><span>Vista móvil y PC</span><span>Exportación JSON</span></div></section>`}
function renderDock(){let el=$('#dock'),d=state.draft,t=trip();if(!d&&['explorar','experiencias','municipios','ajustes'].includes(state.tab)){el.classList.add('hidden');el.innerHTML='';return}if(d){el.classList.remove('hidden');el.innerHTML=`<div class="dock-main"><div class="dock-title">✈ Tu viaje se está formando</div><div class="bar-data">${d.destino?`<span>📍 ${esc(d.destino)}</span>`:''}${d.fecha_inicio?`<span>📅 ${dateES(d.fecha_inicio)}</span>`:''}${d.presupuesto?`<span>💰 ${money(d.presupuesto)}</span>`:''}</div></div><div class="dock-right"><strong>Revisa y guarda</strong><button class="btn primary sm" data-action="submit-trip-draft">Guardar viaje →</button></div>`;return}
 if(!t){el.classList.add('hidden');return}let b=state.detail.presupuesto;el.classList.remove('hidden');el.innerHTML=`<div class="dock-main"><div class="dock-title">✈ Mi viaje: ${esc(t.destino)}</div><div class="bar-data"><span>📅 ${dateES(t.fecha_inicio)}</span><span>💰 Presupuesto ${money(b.presupuesto.monto_total)}</span><span>📊 Gastado ${money(b.gasto_real)}</span><span>🗓 ${state.detail.dias.reduce((acc,v)=>acc+v.actividades.length,0)} actividades</span></div></div><div class="dock-right"><strong style="color:${b.saldo<0?'#c65345':'#138278'}">Saldo ${money(b.saldo)}</strong><button class="btn primary sm" data-nav="agenda">Ver plan →</button></div>`}

// TravelPlanner Flex 2.4 — selector de 212 municipios, OSM en demanda y ranking transparente.
async function loadMunicipalList(){
 try{
  const d=await api('/api/municipios-veracruz');
  state.municipioNombres=d.municipios?.Veracruz||[];
  state.municipioCatalogoCargado=true;
  if(!state.municipioNombres.includes(state.municipioNombre))state.municipioNombre='Catemaco';
  if(state.tab==='municipios')render();
 }catch(err){fail(err)}
}
async function loadMunicipalRecommendations(){
 if(state.municipioCargando)return;
 state.municipioCargando=true;
 state.municipioCargado=false;
 render();
 const p=new URLSearchParams({estado:'Veracruz',municipio:state.municipioNombre,actividad:state.municipioActividad,interes:state.municipioInteres,cerca:state.municipioFiltroCerca?'1':'0'});
 try{
   const result=await api('/api/recomendaciones-municipio?'+p.toString());
   state.municipioResultados=result.lugares||[];
   state.municipioInfo=result;
   state.municipioCargado=true;
   // Permite reutilizar galería y botón Agregar sin cambiar la base del itinerario.
   for(const r of state.municipioResultados){
      if(!placeById(r.id_lugar))state.catalog.push({id_lugar:r.id_lugar,ciudad:'Veracruz',nombre:r.nombre,lat:r.lat,lon:r.lon,imagen:r.imagen||'/static/img/photo-placeholder.svg',fuente:r.fuente,credito:'Colaboradores de OpenStreetMap',licencia:'ODbL 1.0',categoria:r.categoria||r.actividad,descripcion:r.descripcion,costo_estimado:0,precio_estimado:0,duracion_min:90});
   }
 }catch(err){state.municipioResultados=[];state.municipioInfo=null;fail(err)}
 finally{state.municipioCargando=false;if(state.tab==='municipios')render()}
}
function municipiosPage(){
 const municipio=state.municipioNombre;
 const inputSelect=(id,label,opts,val)=>`<div class="field"><label for="${id}">${label}</label><select id="${id}">${opts.map(x=>`<option value="${esc(x)}" ${x===val?'selected':''}>${esc(x)}</option>`).join('')}</select></div>`;
 const view=[...state.municipioResultados];
 if(state.municipioOrden==='nombre')view.sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
 const cards=view.map((item,i)=>{
  const expanded=state.municipioExplicacion===item.id_lugar;
  const photo=placeById(item.id_lugar);
  const photoHtml=photo&&photo.imagen&&!(photo.imagen.includes('photo-placeholder.svg'))?placePhotoWrap(photo):`<div class="municipal-photo-placeholder" aria-label="Lugar sin fotografía reutilizable">📍<small>Foto por documentar</small></div>`;
  const source=item.fuente && item.fuente.startsWith('https://') ? item.fuente : 'https://www.openstreetmap.org/copyright';
  const placeLabel=item.cerca?'Alrededores (municipio por comprobar)':municipio+', Veracruz';
  const mapUrl=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.lat!=null&&item.lon!=null)?`${item.lat},${item.lon}`:item.nombre+', '+municipio+', Veracruz')}`;
  return `<article class="card municipal-card"><div class="municipal-cover">${photoHtml}<span class="municipal-rank">${state.municipioOrden==='puntaje'?'#'+(i+1):'Veracruz'}</span></div>
  <div class="municipal-body"><div class="row between"><span class="pill">${esc(item.categoria||'Naturaleza')}</span><span class="municipal-score" title="Coincidencia, NO valoración">${item.puntaje}/100 coincidencia</span></div>
  <h3>${esc(item.nombre)}</h3><div class="municipal-tags"><span>${esc(placeLabel)}</span>${(item.subactividades||[]).slice(0,3).map(t=>`<span>${esc(t)}</span>`).join('')}</div>
  <p>${esc(item.descripcion||'Lugar que puedes investigar antes de viajar.')}</p>
  <div class="municipal-why"><strong>¿Por qué aparece?</strong><span>${esc(item.motivo||'Se relaciona con la categoría y la ubicación seleccionadas.')}</span></div>
  <button class="municipal-explain-toggle" data-action="municipio-explicacion" data-id="${esc(item.id_lugar)}" aria-expanded="${expanded}">${expanded?'Ocultar':'Ver'} criterios del ranking ${expanded?'−':'+'}</button>
  ${expanded?`<div class="municipal-breakdown">${(item.desglose||[]).map(x=>`<div><span>${esc(x.criterio)}</span><strong>${x.puntos}/${x.maximo}</strong></div>`).join('')}<small>0–100 significa afinidad con la búsqueda. No es calificación, visita, precio ni popularidad. Fuente: ${esc(item.tipo_fuente||'Datos públicos')}.</small></div>`:''}
  <p class="municipal-practical">${esc(item.acceso||'Comprueba horarios y reglas de acceso antes de visitar.')}</p>
  <div class="municipal-actions"><button class="btn sm primary" data-action="add-place" data-id="${esc(item.id_lugar)}">+ Agregar al viaje</button><button class="btn sm outline" data-action="info-place" data-id="${esc(item.id_lugar)}">Fotos / ficha</button><a class="btn sm soft" href="${esc(mapUrl)}" target="_blank" rel="noopener noreferrer">Mapa ↗</a></div>
  <div class="municipal-source"><a href="${esc(source)}" target="_blank" rel="noopener noreferrer">Fuente original ↗</a><span>${esc(item.tipo_fuente||'OSM')}</span></div></div></article>`;
 }).join('');
 const info=state.municipioInfo||{};
 const status=info.estado_consulta||'';
 const statusText = {'cache':'Datos del catálogo guardados.','openstreetmap':'Consulta actualizada desde OpenStreetMap.','offline':'Modo sin consulta externa: solo fichas verificadas guardadas.','limitado':'El proveedor limitó temporalmente consultas; intenta después.','ocupado':'Hay otra consulta en curso; inténtalo de nuevo.','pausa':'Espera unos segundos antes de consultar otro municipio.','no-disponible':'OpenStreetMap no respondió; mostrando los datos que tenemos.','':'Pulsa Buscar para consultar lugares documentados.'}[status]||'Consulta disponible';
 const warning = !state.municipioCargado?'Selecciona municipio y actividad, después pulsa Buscar. No se descargan datos de los 212 municipios a la vez.':info.limite_municipal_encontrado?'Los puntos OSM provienen del límite municipal cartografiado. Verifica acceso y situación real.':"No pudimos verificar el límite municipal en OSM; no hemos añadido lugares de otro municipio como si fueran de éste.";
 return header('DESCUBRE MÁS MUNICIPIOS','Encuentra experiencias cerca de ti','Todos los municipios de Veracruz disponibles para seleccionar. Lugares consultados bajo demanda, con fuentes y puntajes explicables.')+
 `<section class="municipal-banner"><div><span class="eyebrow">VERACRUZ · 212 MUNICIPIOS</span><h3>De Catemaco a cualquier municipio de Veracruz.</h3><p>Recomendaciones según actividad, interés y fuente. No por supuestas reseñas o visitantes.</p></div><span class="municipal-banner-symbol">🌿</span></section>
 <section class="municipal-filters card card-pad">${inputSelect('municipio-estado','Estado',['Veracruz'],'Veracruz')}${inputSelect('municipio-nombre','Municipio',state.municipioNombres.length?state.municipioNombres:['Catemaco'],municipio)}${inputSelect('municipio-actividad','Actividad',['Naturaleza','Cultura','Gastronomía','Todas'],state.municipioActividad)}${inputSelect('municipio-interes','Me interesa',['Todos','Agua y lagunas','Selva y senderos','Fauna','Historia','Museos','Comida local','Parques'],state.municipioInteres==='Todas'?'Todos':state.municipioInteres)}${inputSelect('municipio-orden','Ordenar por',['Mejor coincidencia','Nombre (A–Z)'],state.municipioOrden==='puntaje'?'Mejor coincidencia':'Nombre (A–Z)')}
 <label class="municipal-nearby"><input type="checkbox" id="municipio-cerca" ${state.municipioFiltroCerca?'checked':''}> Mostrar también lugares de los alrededores (hasta 15 km aproximadamente)</label>
 <button class="btn primary" data-action="municipio-actualizar" ${state.municipioCargando?'disabled':''}>${state.municipioCargando?'Consultando…':'Buscar lugares →'}</button></section>
 <section class="section"><div class="municipal-results-title"><div><h3>${state.municipioCargando?'Buscando…':state.municipioCargado?view.length+' recomendaciones encontradas':'Busca lugares de tu municipio'}</h3><p>${esc(municipio)}, Veracruz · ${esc(state.municipioActividad)} · ${esc(statusText)}</p></div><span class="pill">Ranking transparente /100</span></div>
 <div class="municipal-explanation"><strong>Cómo ordenamos:</strong> Actividad 40 · Municipio 25 · Interés 15 · Fuente 15 · Ficha 5. ${esc(warning)}<div><small>© colaboradores de OpenStreetMap · ODbL. Datos colaborativos, no se garantiza exhaustividad ni vigencia. <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Atribución</a>.</small></div></div>
 ${state.municipioCargando?'<p>Consultando datos municipales. Si es la primera búsqueda puede tardar algunos segundos…</p>':view.length?`<div class="municipal-grid">${cards}</div>`:`<div class="empty"><h3>${state.municipioCargado?'No hay resultados verificados para esta búsqueda':'¿Qué te gustaría visitar?'}</h3><p>${state.municipioCargado?'Prueba otra categoría o consulta el mapa. Que no haya resultados no significa que no existan lugares en ese municipio.':'Elige un municipio y actividad, y pulsa Buscar. También puedes explorar el catálogo anterior.'}</p><a class="btn soft" href="https://www.openstreetmap.org/search?query=${encodeURIComponent(municipio+', Veracruz, México')}" target="_blank" rel="noopener noreferrer">Buscar en OpenStreetMap ↗</a></div>`}
 </section>`;
}

function galleryBody(){
 const g=state.gallery; if(!g)return '';
 const photos=g.fotos||[],index=Math.min(g.index||0,Math.max(0,photos.length-1)),pic=photos[index];
 const frame=pic?`<img src="${esc(commonsImageURL(pic.imagen,pic.fuente))}" data-original-photo="${esc(pic.imagen)}" alt="Fotografía ${index+1} de ${esc(g.place.nombre)}" onerror="brokenPhoto(this)">`:
   `<div class="gallery-empty-fallback"><span aria-hidden="true">📷</span><h3>Fotos de ${esc(g.place.nombre)}</h3><p>No tenemos una foto con licencia reutilizable de este lugar. Puedes consultar fotografías reales en su ficha de Maps.</p><a class="btn primary" target="_blank" rel="noopener noreferrer" href="${mapsForPlace(g.place)}">Ver fotografías reales en Google Maps ↗</a></div>`;
 const counter=photos.length?`${index+1} / ${photos.length}`:'Sin fotografías verificadas';
 const dots=photos.map((x,i)=>`<button class="gallery-dot ${i===index?'active':''}" aria-label="Ver fotografía ${i+1}" aria-pressed="${i===index}" data-action="gallery-dot" data-index="${i}"></button>`).join('');
 const credit=pic?`<span>Foto: ${esc(pic.credito||'Consultar autor')} · ${esc(pic.licencia||'Consultar licencia')}</span><a href="${esc(pic.fuente||'#')}" target="_blank" rel="noopener noreferrer">Fuente y licencia ↗</a>`:'<span>Sin fotos de Wikimedia verificadas para esta ficha.</span>';
 return `<div class="gallery-carousel" data-gallery="${esc(g.place.id_lugar)}"><div class="gallery-frame">${frame}
  ${photos.length>1?`<button class="gallery-arrow prev" data-action="gallery-prev" aria-label="Fotografía anterior">‹</button><button class="gallery-arrow next" data-action="gallery-next" aria-label="Siguiente fotografía">›</button>`:''}
  <span class="gallery-counter">${counter}</span></div><div class="gallery-dots">${dots}</div><div class="gallery-credit">${credit}</div></div>
  ${g.loading?'<p class="gallery-status" role="status">Buscando más fotografías en Wikimedia Commons…</p>':g.faltantes>0?`<p class="gallery-status">Encontramos ${photos.length} de 3 fotografías verificables. No rellenamos las faltantes con fotos de otros sitios. <a target="_blank" rel="noopener noreferrer" href="${mapsForPlace(g.place)}">Ver fotos del lugar en Maps ↗</a></p>`:'<p class="gallery-status">Desliza a los lados o utiliza las flechas para ver las fotografías.</p>'}`;
}
function renderGallery(){const slot=$('#gallery-slot');if(slot&&state.gallery)slot.innerHTML=galleryBody()}
async function openGallery(place){
 state.gallery={place,fotos:[],index:0,loading:true,faltantes:3};
 const gps=Number.isFinite(Number(place.lat))&&Number.isFinite(Number(place.lon))&&place.lat!==null;
 showModal(esc(place.nombre),`<div id="gallery-slot">${galleryBody()}</div><p class="body-copy">${esc(place.descripcion)}</p>
 <p class="gallery-place-note">${esc(place.ciudad)} · ${esc(classifyPlace(place))}. Precios y disponibilidad sujetos a consulta.</p>
 <div class="btn-group"><button class="btn primary" data-action="add-place" data-id="${esc(place.id_lugar)}">+ Agregar al itinerario</button><a class="btn outline" href="${mapsForPlace(place)}" target="_blank" rel="noopener noreferrer">Ver ubicación en Maps ↗</a>${classifyPlace(place)==='Gastronomía'?`<a class="btn soft" href="${restaurantsNear(place)}" target="_blank" rel="noopener noreferrer">🍽 Buscar dónde comer ↗</a>`:''}</div>`,true);
 try{
   const result=await api('/api/catalogo/galeria/'+encodeURIComponent(place.id_lugar));
   if(state.gallery?.place.id_lugar!==place.id_lugar)return;
   state.gallery.fotos=result.fotos||[];state.gallery.faltantes=result.faltantes??Math.max(0,3-state.gallery.fotos.length);
 }catch(e){if(state.gallery?.place.id_lugar!==place.id_lugar)return;state.gallery.fotos=[];state.gallery.faltantes=3;toast('No se pudo consultar la galería: '+e.message,true)}
 finally{if(state.gallery?.place.id_lugar===place.id_lugar){state.gallery.loading=false;renderGallery()}}
}
function showModal(title,body,wide=false){$('#modal-root').innerHTML=`<div class="modal-layer"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${title}</h2><button class="xbutton" data-action="close" aria-label="Cerrar">×</button></div>${body}</div></div>`;hydratePlacePhotos()}
function closeModal(){state.draft=null;state.pendingPlaceId=null;state.pendingRecommendation=null;$('#modal-root').innerHTML='';renderDock()}
function input(name,label,type='text',val='',required=false,extra=''){
 let star=required?'<span style="color:#dc544d"> *</span>':'';
 let spec=type==='select'?
 `<select name="${name}" ${required?'required':''}>${extra.split('|').map(v=>{const [key,lab]=v.includes(':')?v.split(':'):[v,v];return `<option value="${esc(key)}" ${String(key)===String(val)?'selected':''}>${esc(lab)}</option>`}).join('')}</select>`:
 type==='textarea'?`<textarea name="${name}" ${required?'required':''}>${esc(val)}</textarea>`:
 type==='checkbox'?`<label><input name="${name}" type="checkbox" value="1" ${val?'checked':''} style="width:auto"> Compartido entre todos los integrantes</label>`:
 `<input name="${name}" type="${type}" value="${esc(val)}" ${required?'required':''} ${type==='number'?'min="0" step="0.01"':''} ${extra}>`;
 return `<div class="field ${type==='textarea'||type==='checkbox'?'full':''}"><label>${esc(label)}${star}</label>${spec}</div>`
}
function formModal(title,type,fields,vals={},editId=null,help=''){let html=`<p class="modal-sub">${help||'Los campos marcados con * son obligatorios. Puedes editar esta información después.'}</p><form id="editor-form" data-kind="${type}" data-id="${editId??''}"><div class="form-grid">${fields.map(f=>input(f[0],f[1],f[2]||'text',vals[f[0]]??f[3]??'',!!f[4],f[5]||'')).join('')}</div><div class="form-actions"><button type="button" class="btn outline" data-action="close">Cancelar</button><button type="submit" class="btn primary">${editId?'Guardar cambios':'Guardar'} →</button></div></form>`;showModal(title,html)}
function tripFields(v={}){let today=new Date();let s=v.fecha_inicio||new Date(today.getTime()+8*86400000).toISOString().slice(0,10);let e=v.fecha_fin||new Date(today.getTime()+11*86400000).toISOString().slice(0,10);return [
 ['nombre','Nombre del viaje','text',v.nombre||'Mi próxima aventura',true],['destino','Destino','select',v.destino||state.exploreDestination||state.city||'Veracruz',true,(state.destinations.length?state.destinations: ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas']).map(x=>x+':'+x).join('|')],
 ['fecha_inicio','Fecha de inicio','date',s,true],['fecha_fin','Fecha de fin','date',e,true],
 ['num_viajeros','Número de viajeros','number',v.num_viajeros||1,true,'min="1" step="1"'],
 ...(v.id_viaje?[]:[['presupuesto','Presupuesto inicial (MXN)','number',12000,true]]),['notas','Notas de viaje','textarea',v.notas||'']];}
const fields={
 hospedaje:[['nombre','Hotel o alojamiento','text','',true],['direccion','Dirección'],['fecha_entrada','Entrada','date','',true],['fecha_salida','Salida','date','',true],['costo','Costo previsto (MXN)','number',0,true],['num_reservacion','Número de reservación'],['estado','Estado','select','pendiente',true,'pendiente:Pendiente|reservado:Reservado|pagado:Pagado']],
 transporte:[['tipo','Tipo de transporte','select','autobus',true,'avion:Avión|autobus:Autobús|auto:Auto|tren:Tren|otro:Otro'],['origen','Origen','text','',true],['destino','Destino','text','',true],['fecha_hora_salida','Fecha y hora salida','datetime-local','',true],['fecha_hora_llegada','Fecha y hora llegada','datetime-local'],['costo','Costo previsto (MXN)','number',0,true],['num_reservacion','Folio o boleto']],
 itinerario:[['fecha','Fecha del día','date','',true],['titulo','Título del día','text','Recorrido cultural'],['descripcion','Descripción','textarea']],
 actividad:[['nombre','Actividad','text','',true],['hora_inicio','Hora de inicio','time','10:00',true],['duracion_min','Duración en minutos','number',90,true],['lugar','Lugar'],['costo_estimado','Costo estimado (MXN)','number',0,true],['categoria','Categoría','select','Cultura',true,'Cultura|Historia|Naturaleza|Gastronomía|Paseo|Transporte|Otros'],['estado','Estado','select','planeada',true,'planeada:Planeada|realizada:Realizada|cancelada:Cancelada']],
 gasto:[['concepto','Concepto','text','',true],['monto','Monto real (MXN)','number',0,true],['fecha','Fecha del gasto','date','',true],['categoria','Categoría','select','Comida',true,'Hospedaje|Transporte|Comida|Actividades|Otros'],['metodo_pago','Método de pago','select','Efectivo',true,'Efectivo|Tarjeta|Transferencia|Otro'],['id_pagador','Quién pagó','select','','',''],['compartido','Gasto compartido','checkbox',0]],
 viajero:[['nombre','Nombre del viajero','text','',true]],
 presupuesto_categoria:[['categoria','Categoría','select','Actividades',true,'Hospedaje|Transporte|Comida|Actividades|Otros'],['monto','Monto planeado MXN','number',500,true]],
 presupuesto:[['monto_total','Presupuesto total en MXN','number',0,true]],
};
function openForm(type,editId=null,extras={}){
 let d=state.detail,t=trip();if(!t && type!=='viaje'){toast('Primero crea un viaje.',true);return}
 if(type==='viaje'){
   let v=editId?state.trips.find(x=>x.id_viaje===editId):{destino:extras.destino||state.exploreDestination||state.city||'Veracruz'};state.draft=editId?null:{destino:v?.destino||state.exploreDestination||state.city,presupuesto:12000};
   formModal(editId?'Editar viaje':'Crear un viaje nuevo','viaje',tripFields(v),v||{},editId,'Escoge un destino y comienza a armar tu viaje. La barra inferior resumirá tus elecciones.');renderDock();return
 }
 let original=null,day=null;
 if(type==='hospedaje')original=d.hospedajes.find(x=>x.id_hospedaje===editId);
 if(type==='transporte')original=d.transportes.find(x=>x.id_transporte===editId);
 if(type==='itinerario')original=d.dias.find(x=>x.id_itinerario===editId);
 if(type==='actividad'){
   for(let entry of d.dias){let a=entry.actividades.find(x=>x.id_actividad===editId);if(a){original=a;day=entry;break}}
 }
 if(type==='gasto')original=d.gastos.find(x=>x.id_gasto===editId);
 if(type==='viajero')original=d.viajeros.find(x=>x.id_viajero===editId);
 if(type==='presupuesto_categoria')original=d.presupuesto.categorias.find(x=>x.id_pc===editId);
 if(type==='presupuesto')original=d.presupuesto.presupuesto;
 let value={...original,...extras};
 if(type==='hospedaje'&&!editId){value.fecha_entrada=value.fecha_entrada||t.fecha_inicio;value.fecha_salida=value.fecha_salida||t.fecha_fin}
 if(type==='itinerario'&&!editId)value.fecha=t.fecha_inicio;
 if(type==='gasto'&&!editId)value.fecha=new Date().toISOString().slice(0,10);
 if(type==='transporte'&&!editId){value.origen=value.origen||'Mi ciudad';value.destino=value.destino||t.destino;value.fecha_hora_salida=value.fecha_hora_salida||t.fecha_inicio+'T08:00'}
 if(type==='actividad'&&!editId){let dayId=extras.id_itinerario||day?.id_itinerario||d.dias[0]?.id_itinerario;
   if(!dayId){toast('Primero agrega un día del itinerario.',true);go('agenda');return}
   value.id_itinerario=dayId;
 }
 let fs=[...(fields[type]||[])];if(type==='actividad')fs.unshift(['id_itinerario','Día del itinerario','select',value.id_itinerario,true,d.dias.map(x=>x.id_itinerario+':'+dateES(x.fecha)).join('|')]);
 if(type==='gasto'){
   const ix=fs.findIndex(x=>x[0]==='id_pagador');fs[ix]=['id_pagador','Quién pagó','select',value.id_pagador||'',false,
     '0:Sin especificar'+(d.viajeros.length?'|':'')+d.viajeros.map(v=>v.id_viajero+':'+v.nombre).join('|')];
 }
 let titles={hospedaje:'Hospedaje',transporte:'Transporte',itinerario:'Día del itinerario',actividad:'Actividad',gasto:'Gasto real',viajero:'Integrante',presupuesto_categoria:'Categoría presupuestal',presupuesto:'Presupuesto'};
 formModal((editId?'Editar ':'Agregar ')+titles[type],type,fs,value,editId,
 type==='gasto'?'Registra únicamente dinero realmente gastado. Los importes planeados se muestran por separado.':
 type==='actividad'?'Los costos de las actividades son estimaciones hasta que registres un gasto real.':
 'Puedes modificar el registro después; solo se guardará en tu viaje actual.');
}
async function submitForm(form){let kind=form.dataset.kind,id=form.dataset.id?Number(form.dataset.id):null;
 const data=Object.fromEntries(new FormData(form).entries());
 if(kind==='viaje'){
   if(data.fecha_inicio>data.fecha_fin)throw Error('La fecha final no puede ser anterior a la inicial.');if(state.pendingPlaceId&&placeById(state.pendingPlaceId)?.ciudad!==data.destino)throw Error('El destino del viaje debe coincidir con el lugar que seleccionaste.');if(state.pendingRecommendation&&state.exploreDestination!==data.destino)throw Error('El destino del viaje debe coincidir con la recomendación seleccionada.');
   if(id){await api('/api/viajes/'+id,{method:'PUT',body:data});closeModal();await loadTrips(id);go('inicio');toast('Viaje actualizado.');return}
   else{
     let res=await api('/api/viajes',{method:'POST',body:data});const pendingPlace=state.pendingPlaceId;const pendingRecommendation=state.pendingRecommendation;state.pendingPlaceId=null;state.pendingRecommendation=null;closeModal();await loadTrips(res.id_viaje);state.city=data.destino;
     if(pendingPlace){await api(`/api/viajes/${res.id_viaje}/lugares`,{method:'POST',body:{id_lugar:pendingPlace,fecha:data.fecha_inicio}});await loadTrips(res.id_viaje);go('agenda');toast('Viaje creado y lugar agregado al primer día.');return}
     if(pendingRecommendation){if(pendingRecommendation.kind==='transporte')pendingRecommendation.extras.fecha_hora_salida=data.fecha_inicio+'T08:00';go('reservas');openForm(pendingRecommendation.kind,null,pendingRecommendation.extras);toast('Viaje creado. Completa los datos de la opción elegida.');return}
   }
   go('inicio');toast('¡Tu viaje está listo para comenzar!');return
 }
 if(kind==='presupuesto'){
   await api('/api/presupuesto',{method:'POST',body:{id_viaje:state.tripId,monto_total:data.monto_total,moneda:'MXN'}});
 }else{
   if(!['actividad','presupuesto_categoria'].includes(kind))data.id_viaje=state.tripId;
   if(kind==='presupuesto_categoria')data.id_presupuesto=state.detail.presupuesto.presupuesto.id_presupuesto;
   if(kind==='gasto'){data.moneda='MXN';data.compartido=data.compartido?1:0;data.id_pagador=data.id_pagador && data.id_pagador!=='0'?Number(data.id_pagador):null}
   if(kind==='actividad' && state.modal?.chosenPlace){data.lugar_id=state.modal.chosenPlace;}
   if(id)await api(`/api/${kind}/${id}`,{method:'PUT',body:data});else await api(`/api/${kind}`,{method:'POST',body:data});
 }
 state.modal=null;closeModal();await loadTrips(state.tripId);render();toast('Guardado correctamente.')
}
async function showPlanB(id){state.modal={activity:id};const body=`<p class="modal-sub">Imagina que llueve, se cancela una actividad o debes gastar menos. Revisa alternativas reales del catálogo local, con imágenes y costo <strong>ilustrativo</strong>.</p><div class="field"><label>¿Qué pasó?</label><select id="planb-reason"><option value="lluvia">☂ Lluvia (solo lugares bajo techo)</option><option value="cancelacion">✕ Actividad cancelada</option><option value="presupuesto">◉ Necesito gastar menos</option></select></div><div id="planb-list" style="margin-top:15px">Buscando alternativas…</div>`;
 showModal('Plan B · Ajusta tu viaje',body,true);await updatePlanB();$('#planb-reason').addEventListener('change',updatePlanB)}
async function updatePlanB(){let mot=$('#planb-reason')?.value||'lluvia';try{let d=await api('/api/planb',{method:'POST',body:{id_actividad:state.modal.activity,motivo:mot}});
  const opts=d.opciones.sort((a,b)=>mot==='presupuesto'?(Number(a.diferencia||0)-Number(b.diferencia||0)):0);
  $('#planb-list').innerHTML=opts.length?opts.map(l=>`<div class="planb-option">${photo(img(l),'')}<div class="grow"><h4>${esc(l.nombre)}</h4><p>${esc(l.motivo)} · ${l.duracion_min} min</p><strong class="small">${Number(l.precio_estimado)>0?money(l.precio_estimado):'Consultar tarifa'}</strong> <span class="tiny muted">${Number(l.precio_estimado)>0?'('+((l.diferencia>=0?'+':'')+money(l.diferencia))+' previsto)':'(sin costo confirmado)'}</span></div><button class="btn sm primary" data-action="apply-planb" data-id="${l.id_lugar}">Elegir</button></div>`).join(''):'<div class="empty">No hay alternativas en este catálogo para este motivo.</div>';
 }catch(e){fail(e)}}
async function chooseAction(action,el){let id=el.dataset.id,tab=el.dataset.nav;try{
 if(tab){go(tab);return}
 if(action==='experience-activity'){if(el.dataset.type!=='Pescar'){toast('Esta actividad se agregará en una siguiente actualización.');return}state.experienceMode='Pescar';render();return}
 if(action==='experience-reset'){state.experienceZone='Todas';state.experienceType='Todas';state.experienceLevel='Todos';render();return}
 if(action==='experience-detail'){openExperienceDetails(id);return}
 if(action==='experience-add'){openExperienceAdd(id);return}
 if(action==='experience-prev' || action==='experience-next' || action==='experience-dot'){
   const photos=state.experienceDetail?.fotos||[];if(!photos.length)return;
   if(action==='experience-prev')state.experiencePhotoIndex=(state.experiencePhotoIndex-1+photos.length)%photos.length;
   if(action==='experience-next')state.experiencePhotoIndex=(state.experiencePhotoIndex+1)%photos.length;
   if(action==='experience-dot')state.experiencePhotoIndex=Number(el.dataset.index)||0;
   updateExperienceGallery();return;
 }
 if(action==='municipio-actualizar'){await loadMunicipalRecommendations();return}
 if(action==='municipio-volver'){state.municipioEstado='Veracruz';state.municipioNombre='Catemaco';state.municipioActividad='Naturaleza';state.municipioInteres='Todos';state.municipioCargado=false;await loadMunicipalRecommendations();return}
 if(action==='municipio-explicacion'){state.municipioExplicacion=state.municipioExplicacion===id?null:id;render();return}
 if(action==='newtrip'){openForm('viaje');return}
 if(action==='choose-trip'){await loadTrips(Number(id));go('inicio');return}
 if(action==='edit-trip'){openForm('viaje',Number(id));return}
 if(action==='delete-trip'){
   if(!confirm('¿Eliminar este viaje y todos sus registros? Esta acción NO se puede deshacer.'))return;
   await api('/api/viajes/'+id,{method:'DELETE'});await loadTrips();go('inicio');toast('Viaje eliminado.');return;
 }
 if(action==='filter'){state.filter=el.dataset.filter;render();return}
 if(action==='explore-mode'){state.exploreMode=el.dataset.mode||'lugares';render();return}
 if(action==='refresh-transport'){state.transportOrigin=$('#transport-origin')?.value.trim()||'';render();toast('Ruta actualizada.');return}
 if(action?.startsWith('gallery-') && state.gallery){
   const photos=state.gallery.fotos||[];
   if(!photos.length)return;
   if(action==='gallery-prev')state.gallery.index=(state.gallery.index-1+photos.length)%photos.length;
   if(action==='gallery-next')state.gallery.index=(state.gallery.index+1)%photos.length;
   if(action==='gallery-dot')state.gallery.index=Math.max(0,Math.min(photos.length-1,Number(el.dataset.index)||0));
   renderGallery();return;
 }
 if(action==='add-place'){
   let l=placeById(id);if(!l){toast('Lugar no encontrado en el catálogo.',true);return}
   if(!trip()||l.ciudad!==trip().destino){state.pendingPlaceId=id;openForm('viaje',null,{destino:l.ciudad});return}
   if($('#modal-root').innerHTML)closeModal();
   await api(`/api/viajes/${state.tripId}/lugares`,{method:'POST',body:{id_lugar:id,fecha:trip().fecha_inicio}});await loadTrips(state.tripId);render();toast('Lugar agregado al primer día de tu itinerario.');return
 }
 if(action==='register-hotel'){
   const tier=el.dataset.tier||'seleccionado';const extras={nombre:'Hospedaje por confirmar · '+tier,direccion:state.exploreDestination,fecha_entrada:trip()?.destino===state.exploreDestination?trip().fecha_inicio:'',fecha_salida:trip()?.destino===state.exploreDestination?trip().fecha_fin:'',costo:0,estado:'pendiente'};
   if(!trip()||trip().destino!==state.exploreDestination){state.pendingRecommendation={kind:'hospedaje',extras};openForm('viaje',null,{destino:state.exploreDestination});return}
   openForm('hospedaje',null,extras);return
 }
 if(action==='register-transport'){
   const kind=el.dataset.type||'autobus';const extras={tipo:kind,origen:state.transportOrigin||'Por definir',destino:state.exploreDestination,fecha_hora_salida:(trip()?.fecha_inicio||new Date().toISOString().slice(0,10))+'T08:00',costo:0};
   if(!trip()||trip().destino!==state.exploreDestination){state.pendingRecommendation={kind:'transporte',extras};openForm('viaje',null,{destino:state.exploreDestination});return}
   openForm('transporte',null,extras);return
 }
 if(action==='info-place'){let l=placeById(id);if(l)await openGallery(l);return}
 if(action==='add-day'){openForm('itinerario');return}
 if(action==='edit-day'){openForm('itinerario',Number(id));return}
 if(action==='add-activity'){openForm('actividad',null,{id_itinerario:Number(id)});return}
 if(action==='edit-activity'){openForm('actividad',Number(id));return}
 if(action==='add-hostel'){openForm('hospedaje');return}
 if(action==='edit-hostel'){openForm('hospedaje',Number(id));return}
 if(action==='add-transport'){openForm('transporte');return}
 if(action==='edit-transport'){openForm('transporte',Number(id));return}
 if(action==='edit-budget'){openForm('presupuesto');return}
 if(action==='add-category'){openForm('presupuesto_categoria');return}
 if(action==='add-expense'){openForm('gasto');return}
 if(action==='edit-expense'){openForm('gasto',Number(id));return}
 if(action==='add-traveler'){openForm('viajero');return}
 if(action==='delete-item'){
   if(!confirm('¿Seguro que quieres eliminar este registro? Esta acción es permanente.'))return;
   await api(`/api/${el.dataset.table}/${id}`,{method:'DELETE'});await loadTrips(state.tripId);render();toast('Registro eliminado.');return;
 }
 if(action==='preference'){
   let c=el.dataset.cat,existing=state.detail.preferencias.includes(c);
   if(existing){let x=await api(`/api/viajes/${state.tripId}`); // verify current travel scope
     // retrieve id via optional direct request? Prefer local endpoint exposes preferences via detail name only.
     const p=(await api('/api/preferencias?viaje='+state.tripId));
     let found=p.items.find(v=>v.categoria===c);if(found)await api('/api/preferencia/'+found.id_preferencia,{method:'DELETE'});
   }else await api('/api/preferencia',{method:'POST',body:{id_viaje:state.tripId,categoria:c}});
   await loadDetail();render();toast('Intereses actualizados.');return;
 }
 if(action==='vote'){
   if(!state.voter){toast('Primero agrega un integrante.',true);return}
   await api('/api/voto',{method:'POST',body:{id_viajero:state.voter,id_lugar:id,decision:Number(el.dataset.vote)}});
   await loadDetail();render();toast('Voto registrado.');return
 }
 if(action==='planb'){await showPlanB(Number(id));return}
 if(action==='apply-planb'){
   let reason=$('#planb-reason').value;
   await api('/api/planb/aplicar',{method:'POST',body:{actividad_id:state.modal.activity,lugar_id:id,motivo:reason}});
   state.modal=null;closeModal();await loadTrips(state.tripId);go('agenda');toast('Plan B aplicado. Revisa el nuevo costo y horario.');return
 }
 if(action==='auto-route'){
   if(!state.detail.dias.length){toast('Primero crea un día.');return}
   const day=state.detail.dias.find(d=>d.actividades.length)||state.detail.dias[0];
   let res=await api('/api/viajes/'+state.tripId+'/ruta?fecha='+day.fecha);
   showModal('Orden sugerido · '+dateES(day.fecha),`<p class="modal-sub">${esc(res.aviso)}</p>${res.orden.length?`<ol>${res.orden.map(x=>`<li style="padding:9px">${esc(x.nombre)}</li>`).join('')}</ol>`:'<div class="empty">Agrega lugares del catálogo a un día para recibir una sugerencia.</div>'}<div class="form-actions"><button class="btn primary" data-action="close">Entendido</button></div>`);return
 }
 if(action==='weather'){
   let res=await api('/api/clima?ciudad='+encodeURIComponent(trip().destino));
   showModal('Pronóstico cercano',`<p class="modal-sub">${esc(res.nota)}</p>${res.clima?`<div class="stack">${res.clima.time.map((day,i)=>`<div class="row between card card-pad"><strong>${dateES(day)}</strong><span>☂ ${res.clima.precipitation_probability_max[i]??'—'}% lluvia</span><span>${res.clima.temperature_2m_max[i]} °C</span></div>`).join('')}</div>`:'<div class="callout orange">No hay datos en línea ahora. El Plan B manual sí funciona sin Internet.</div>'}<br><button class="btn primary" data-action="close">Entendido</button>`,true);return
 }
 if(action==='export'){
   const d=await api('/api/exportar');const blob=new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='travelplanner-flex-respaldo.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Respaldo descargado.');return
 }
 if(action==='logout'){
   await api('/api/logout',{method:'POST',body:{}});state.authed=false;state.csrf=null;const fresh=await api('/api/estado');state.csrf=fresh.csrf;state.draft=null;closeModal();$('#login').classList.remove('hidden');$('#shell').classList.add('hidden');return
 }
 if(action==='close'){closeModal();return}
 if(action==='submit-trip-draft'){$('#editor-form')?.requestSubmit();return}
 }catch(e){fail(e)}}
// Delegación única para botones en contenido, barra inferior y modales.
document.addEventListener('click',e=>{const b=e.target.closest('[data-action],[data-nav]');if(b){e.preventDefault();chooseAction(b.dataset.action||'',b)}});
document.addEventListener('change',async e=>{
 if(e.target.id==='trip-select'){try{await loadTrips(Number(e.target.value));render()}catch(err){fail(err)}}
 if(e.target.id==='city-filter'){state.exploreDestination=e.target.value;state.city=e.target.value;state.filter='Todos';state.catalogSearch='';render();}
 if(e.target.id==='municipio-estado'){state.municipioEstado=e.target.value;state.municipioCargado=false;state.municipioResultados=[];render()}
 if(e.target.id==='municipio-nombre'){state.municipioNombre=e.target.value;state.municipioCargado=false;state.municipioResultados=[];render()}
 if(e.target.id==='municipio-actividad'){state.municipioActividad=e.target.value;state.municipioCargado=false;state.municipioResultados=[];render()}
 if(e.target.id==='municipio-interes'){state.municipioInteres=e.target.value;state.municipioCargado=false;state.municipioResultados=[];render()}
 if(e.target.id==='municipio-orden'){state.municipioOrden=e.target.value==='Nombre (A–Z)'?'nombre':'puntaje';render()}
 if(e.target.id==='municipio-cerca'){state.municipioFiltroCerca=e.target.checked;state.municipioCargado=false;state.municipioResultados=[];render()}

 if(e.target.id==='experience-zone'){state.experienceZone=e.target.value;render()}
 if(e.target.id==='experience-type'){state.experienceType=e.target.value;render()}
 if(e.target.id==='experience-level'){state.experienceLevel=e.target.value;render()}
 if(e.target.id==='experience-region'){state.experienceRegion=e.target.value;state.experienceZone='Todas';render()}
 if(e.target.id==='experience-trip'){
   const t=state.trips.find(x=>x.id_viaje===Number(e.target.value));
   if(t){const inp=$('#experience-date');if(inp){inp.min=t.fecha_inicio;inp.max=t.fecha_fin;inp.value=t.fecha_inicio}}
 }
 if(e.target.id==='voter'){state.voter=Number(e.target.value)}
});
document.addEventListener('input',e=>{
 if(e.target.closest('#editor-form[data-kind="viaje"]') && state.draft){
   const form=e.target.closest('form'),fd=Object.fromEntries(new FormData(form).entries());
   state.draft={destino:fd.destino,fecha_inicio:fd.fecha_inicio,fecha_fin:fd.fecha_fin,presupuesto:fd.presupuesto||0};renderDock();
 }
 if(e.target.id==='catalog-search'){state.catalogSearch=e.target.value;const pos=e.target.selectionStart;render();const next=$('#catalog-search');if(next){next.focus();next.setSelectionRange(pos,pos)}}
 if(e.target.id==='transport-origin'){state.transportOrigin=e.target.value}
});
document.addEventListener('submit',async e=>{
 if(e.target.id==='login-form'){
   e.preventDefault();
   try{const res=await api('/api/login',{method:'POST',body:{email:$('#email').value,password:$('#password').value}});state.csrf=res.csrf;await authDone();toast('Bienvenido a TravelPlanner Flex.');}
   catch(err){fail(err)}return
 }
 if(e.target.id==='register-form'){
   e.preventDefault();
   try{const res=await api('/api/register',{method:'POST',body:{nombre:$('#reg-name').value,email:$('#reg-email').value,password:$('#reg-password').value}});state.csrf=res.csrf;await authDone();toast('Tu cuenta está lista. ¡Comencemos a planear!');}
   catch(err){fail(err)}return
 }
 if(e.target.id==='experience-plan-form'){
   e.preventDefault();
   const form=e.target;const btn=form.querySelector('[type="submit"]');btn.disabled=true;
   try{
     const tid=Number($('#experience-trip').value),date=$('#experience-date').value,time=$('#experience-time').value;
     const experience=experienceById(form.dataset.id);
     const t=state.trips.find(x=>x.id_viaje===tid);
     if(!experience||!t)throw Error('No se encontró el viaje o la experiencia.');
     if(date<t.fecha_inicio || date>t.fecha_fin)throw Error('La fecha debe estar dentro del viaje.');
     await api(`/api/viajes/${tid}/lugares`,{method:'POST',body:{id_lugar:experience.lugar_id,fecha:date,hora_inicio:time}});
     closeModal();await loadTrips(tid);go('agenda');toast('Experiencia añadida. Consulta al operador antes de reservar.');
   }catch(err){fail(err);btn.disabled=false}
   return;
 }
 if(e.target.id==='editor-form'){e.preventDefault();const btn=e.target.querySelector('[type="submit"]');btn.disabled=true;try{await submitForm(e.target)}catch(err){fail(err);btn.disabled=false}}
});
$('#show-register').addEventListener('click',()=>{$('#login-form').classList.add('hidden');$('#register-form').classList.remove('hidden')});
$('#show-login').addEventListener('click',()=>{$('#register-form').classList.add('hidden');$('#login-form').classList.remove('hidden')});
$('#account-btn').addEventListener('click',()=>chooseAction('logout',document.createElement('button')));
let galleryTouchX=null;
document.addEventListener('touchstart',e=>{if(e.target.closest('.gallery-frame'))galleryTouchX=e.changedTouches[0]?.screenX??null},{passive:true});
document.addEventListener('touchend',e=>{if(galleryTouchX===null||!state.gallery)return;const dx=(e.changedTouches[0]?.screenX??galleryTouchX)-galleryTouchX;galleryTouchX=null;if(Math.abs(dx)>45){const c=state.gallery.fotos?.length||0;if(c>1){state.gallery.index=(state.gallery.index+(dx<0?1:-1)+c)%c;renderGallery()}}},{passive:true});
let expTouchX=null;
document.addEventListener('touchstart',e=>{if(e.target.closest('.experience-photo-frame'))expTouchX=e.changedTouches[0]?.screenX??null},{passive:true});
document.addEventListener('touchend',e=>{if(expTouchX===null || !state.experienceDetail)return;
 const dx=(e.changedTouches[0]?.screenX??expTouchX)-expTouchX;expTouchX=null;
 if(Math.abs(dx)>45){const c=state.experienceDetail.fotos?.length||0;if(c>1){state.experiencePhotoIndex=(state.experiencePhotoIndex+(dx<0?1:-1)+c)%c;updateExperienceGallery()}}
},{passive:true});
window.addEventListener('keydown',e=>{if(e.key==='Escape' && $('#modal-root').firstChild)closeModal()});
init();
