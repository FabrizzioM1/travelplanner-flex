/* TravelPlanner Flex — interfaz sin dependencias externas. JS para la vista; Python para datos. */
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={tab:'inicio',trips:[],tripId:null,detail:null,catalog:[],filter:'Todos',city:'Oaxaca',draft:null,authed:false,modal:null,voter:null,weather:null,csrf:null};
const money=n=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateES=s=>{if(!s)return 'Sin fecha';const [y,m,d]=String(s).slice(0,10).split('-');return `${d}/${m}/${y}`};
const img=l=>l?.imagen||'/static/img/photo-placeholder.svg';
const photo=(src,cl='card-img',alt='Fotografía del lugar')=>`<img loading="lazy" class="${cl}" src="${esc(src)}" alt="${esc(alt)}" onerror="this.onerror=null;this.src='/static/img/photo-placeholder.svg'">`;
const tag=(s,cl='')=>`<span class="pill ${cl}">${esc(s)}</span>`;
function toast(msg,error=false){let el=document.createElement('div');el.className='toast'+(error?' err':'');el.textContent=msg;$('#toast-root').append(el);setTimeout(()=>el.remove(),4500)}
async function api(url,options={}){const method=(options.method||'GET').toUpperCase();const secure=method!=='GET'&&state.csrf?{'X-CSRF-Token':state.csrf}:{};const opts={...options,credentials:'same-origin',headers:{'Content-Type':'application/json',...secure,...(options.headers||{})}};if(options.body && typeof options.body!=='string')opts.body=JSON.stringify(options.body);
 const r=await fetch(url,opts);let d;try{d=await r.json()}catch{throw Error('El servidor no respondió correctamente.')}if(!r.ok)throw Error(d.error||'Error de conexión');return d}
function fail(err){toast(err.message||'Ocurrió un error',true)}
async function init(){try{let res=await api('/api/estado');state.csrf=res.csrf;if(res.autenticado)await authDone();else{$('#login').classList.remove('hidden');$('#shell').classList.add('hidden')}}catch(e){fail(e)}}
async function authDone(){state.authed=true;$('#login').classList.add('hidden');$('#shell').classList.remove('hidden');let cat=await api('/api/catalogo');state.catalog=cat.lugares;await loadTrips();render()}
async function loadTrips(id){const x=await api('/api/viajes');state.trips=x.viajes;const ids=state.trips.map(t=>t.id_viaje);if(id && ids.includes(Number(id)))state.tripId=Number(id);else if(!ids.includes(state.tripId))state.tripId=ids[0]||null;await loadDetail()}
async function loadDetail(){if(!state.tripId){state.detail=null;return}state.detail=await api('/api/viajes/'+state.tripId);if(!state.voter || !state.detail.viajeros.some(v=>v.id_viajero===state.voter))state.voter=state.detail.viajeros[0]?.id_viajero||null}
function trip(){return state.detail?.viaje||null}
function placeById(id){return state.catalog.find(l=>l.id_lugar===id)}
function renderNav(){let sel=$('#trip-select');sel.innerHTML=state.trips.length?state.trips.map(t=>`<option value="${t.id_viaje}" ${t.id_viaje===state.tripId?'selected':''}>${esc(t.nombre)}</option>`).join(''):'<option value="">Sin viajes</option>';
 $$('[data-nav]').forEach(x=>x.classList.toggle('active',x.dataset.nav===state.tab))}
function render(){renderNav();let content={inicio:home,explorar:explore,agenda:agenda,reservas:reservations,finanzas:finance,grupo:group,ajustes:settings}[state.tab]||home;$('#content').innerHTML=content();renderDock();}
function go(tab){state.tab=tab;state.filter='Todos';render();window.scrollTo({top:0,behavior:'smooth'})}
function header(eyebrow,title,sub,button=''){return `<div class="titlebar"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2><p>${sub}</p></div>${button}</div>`}
function empty(label='Primero crea un viaje',sub='Tu siguiente aventura empieza con un destino y unas fechas.'){
 return `<div class="empty"><div class="big">✈</div><h3>${label}</h3><p>${sub}</p><button class="btn primary" data-action="newtrip">+ Crear viaje</button></div>`}
function tripTiles(){if(!state.trips.length)return empty();return `<div class="grid grid-2">${state.trips.map(t=>{let l=state.catalog.find(x=>x.ciudad===t.destino);return `<article class="card trip-card">${photo(img(l),'')}<div class="stack"><h4>${esc(t.nombre)}</h4><div class="small muted">${esc(t.destino)} · ${dateES(t.fecha_inicio)} al ${dateES(t.fecha_fin)}</div><div class="tiny">${tag('Saldo '+money(t.resumen.saldo),t.resumen.saldo<0?'alert':'')}</div><div class="btn-group"><button class="btn sm primary" data-action="choose-trip" data-id="${t.id_viaje}">Abrir →</button><button class="btn sm outline" data-action="edit-trip" data-id="${t.id_viaje}">Editar</button><button class="btn sm warn" data-action="delete-trip" data-id="${t.id_viaje}">Eliminar</button></div></div></article>`}).join('')}</div>`}
function home(){let t=trip(),b=state.detail?.presupuesto;if(!t)return header('ORGANIZA MEJOR','Viajar debería ser sencillo','Un solo lugar para planear tus días y gastos','<button class="btn primary" data-action="newtrip">+ Nuevo viaje</button>')+`<section class="section">${tripTiles()}</section>`;
 let mainPic=state.catalog.find(p=>p.ciudad===t.destino);return `<section class="hero"><div class="hero-info"><span class="eyebrow" style="color:#74d9d2">TU PRÓXIMA EXPERIENCIA</span><h1>Los mejores viajes<br>comienzan con un plan.</h1><p>Descubre experiencias, arma tu ruta y reacciona a los imprevistos sin perder el control de tu dinero.</p><div class="btn-group"><button class="btn light" data-action="newtrip">+ Nuevo viaje</button><button class="btn primary" data-nav="explorar">Explorar lugares ↗</button></div></div><div class="hero-photo">${photo(img(mainPic),'')}</div></section>
 <section class="section">${header('MI VIAJE ACTUAL',esc(t.nombre),esc(t.destino)+' · '+dateES(t.fecha_inicio)+' al '+dateES(t.fecha_fin))}
 <div class="grid grid-4"><div class="stat"><div class="tiny muted">Presupuesto</div><div class="number">${money(b.presupuesto.monto_total)}</div></div><div class="stat"><div class="tiny muted">Gastos reales</div><div class="number">${money(b.gasto_real)}</div></div><div class="stat emph"><div class="tiny muted">Disponible</div><div class="number" style="color:${b.saldo<0?'#bb433b':'#12847b'}">${money(b.saldo)}</div></div><div class="stat"><div class="tiny muted">Actividades previstas</div><div class="number">${state.detail.dias.reduce((s,d)=>s+d.actividades.length,0)}</div></div></div></section>
 <section class="section"><div class="section-heading"><div><h3>¿Qué quieres hacer?</h3><p>Cada módulo se conecta con el mismo viaje.</p></div></div><div class="module-links"><button data-nav="explorar">◈ Ver lugares con fotos</button><button data-nav="agenda">▦ Organizar días</button><button data-nav="reservas">▤ Hospedaje y transporte</button><button data-nav="finanzas">◉ Controlar presupuesto</button><button data-nav="grupo">♧ Votar en grupo</button></div></section>
 <section class="section">${state.detail.alertas.map(a=>`<div class="alertbox ${a.level==='danger'?'danger':''}">⚠ ${esc(a.text)}</div>`).join('')}
 <div class="section-heading"><h3>Mis viajes</h3><button class="btn outline sm" data-action="newtrip">+ Crear otro</button></div>${tripTiles()}</section>
 <section class="section callout">✦ <strong>TravelPlanner Flex</strong> propone alternativas y detecta horarios encimados. Las fotografías del catálogo son imágenes reales seleccionadas de Wikimedia Commons; consulta el crédito y la licencia en los detalles de cada lugar. Los costos son estimaciones de demostración, no tarifas oficiales.</section>`}
function explore(){let current=trip();let city=current?.destino||state.city;let filtered=state.catalog.filter(p=>p.ciudad===city&&(state.filter==='Todos'||p.categoria===state.filter));let cats=['Todos',...new Set(state.catalog.filter(x=>x.ciudad===city).map(x=>x.categoria))];let b=current?state.detail.presupuesto:null;
 return header('DESCUBRE · COMPARA · ELIGE','Lugares para descubrir','Fotografías reales seleccionadas, categorías y costos orientativos.',`<button class="btn primary" data-action="newtrip">+ Crear viaje</button>`)+
 `<div class="section"><div class="filters"><label class="small muted" for="city-filter">Destino:</label><select id="city-filter">${['Oaxaca','Veracruz','Puebla'].map(c=>`<option value="${c}" ${city===c?'selected':''}>${c}</option>`).join('')}</select><span class="tiny muted">${filtered.length} opciones del catálogo</span></div><div class="filter-bar filters">${cats.map(c=>`<button data-action="filter" data-filter="${esc(c)}" class="${state.filter===c?'on':''}">${esc(c)}</button>`).join('')}</div>
 <div class="grid grid-3">${filtered.map(l=>`<article class="card place-card">${photo(img(l))}<div class="card-footer"><div class="row between">${tag(l.categoria)}${tag(l.interior?'Bajo techo':'Exterior',l.interior?'':'ochre')}</div><div class="meta"><h4>${esc(l.nombre)}</h4><p>${esc(l.descripcion)}</p><span class="tiny muted">Foto: ${esc(l.credito||'Wikimedia Commons')}</span></div><div class="row between"><span class="cost">${money(l.precio_estimado)}</span><span class="tiny muted">~ ${l.duracion_min} min</span></div><div class="btn-group"><button class="btn sm primary" data-action="add-place" data-id="${l.id_lugar}">+ Mi itinerario</button><button class="btn sm outline" data-action="info-place" data-id="${l.id_lugar}">Detalles</button></div></div></article>`).join('')}</div><p class="illustration-label">Fotografías reales de Wikimedia Commons; los créditos y licencias aparecen en Detalles. Los precios son estimaciones de demostración: confirma tarifas y horarios con cada recinto.</p></div>`}
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
 `<section class="section"><div class="grid grid-2"><div class="card card-pad"><h3>Exportar mis datos</h3><p class="tagline">Descarga viajes, reservaciones, itinerarios, presupuestos, gastos y preferencias en formato JSON.</p><br><button class="btn primary" data-action="export">↓ Descargar respaldo</button></div><div class="card card-pad"><h3>Tu cuenta</h3><p class="tagline">Tus viajes se guardan en la base de datos de tu cuenta y se comparten entre tus dispositivos al iniciar sesión.</p><br><button class="btn outline" data-action="logout">Cerrar sesión</button></div></div></section><section class="section callout orange"><strong>Alcance real:</strong> TravelPlanner no vende boletos ni confirma reservaciones. Los precios y tiempos son estimaciones; verifica horarios, tarifas y disponibilidad con los recintos. Plan B sugiere alternativas del catálogo y requiere que confirmes el cambio.</section><section class="section"><h3>Qué incluye la aplicación</h3><div class="special-flow"><span>Cuenta por usuario</span><span>Base de datos compartida</span><span>12 lugares con fotos reales</span><span>Créditos y licencias</span><span>Detección de horarios</span><span>Plan B</span><span>Vista móvil y PC</span><span>Exportación JSON</span></div></section>`}
function renderDock(){let el=$('#dock'),d=state.draft,t=trip();if(d){el.classList.remove('hidden');el.innerHTML=`<div class="dock-main"><div class="dock-title">✈ Tu viaje se está formando</div><div class="bar-data">${d.destino?`<span>📍 ${esc(d.destino)}</span>`:''}${d.fecha_inicio?`<span>📅 ${dateES(d.fecha_inicio)}</span>`:''}${d.presupuesto?`<span>💰 ${money(d.presupuesto)}</span>`:''}</div></div><div class="dock-right"><strong>Revisa y guarda</strong><button class="btn primary sm" data-action="submit-trip-draft">Guardar viaje →</button></div>`;return}
 if(!t){el.classList.add('hidden');return}let b=state.detail.presupuesto;el.classList.remove('hidden');el.innerHTML=`<div class="dock-main"><div class="dock-title">✈ Mi viaje: ${esc(t.destino)}</div><div class="bar-data"><span>📅 ${dateES(t.fecha_inicio)}</span><span>💰 Presupuesto ${money(b.presupuesto.monto_total)}</span><span>📊 Gastado ${money(b.gasto_real)}</span><span>🗓 ${state.detail.dias.reduce((acc,v)=>acc+v.actividades.length,0)} actividades</span></div></div><div class="dock-right"><strong style="color:${b.saldo<0?'#c65345':'#138278'}">Saldo ${money(b.saldo)}</strong><button class="btn primary sm" data-nav="agenda">Ver plan →</button></div>`}
function showModal(title,body,wide=false){$('#modal-root').innerHTML=`<div class="modal-layer"><div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true"><div class="modal-head"><h2>${title}</h2><button class="xbutton" data-action="close" aria-label="Cerrar">×</button></div>${body}</div></div>`}
function closeModal(){state.draft=null;$('#modal-root').innerHTML='';renderDock()}
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
 ['nombre','Nombre del viaje','text',v.nombre||'Mi próxima aventura',true],['destino','Destino','select',v.destino||state.city,true,'Oaxaca|Veracruz|Puebla'],
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
   let v=editId?state.trips.find(x=>x.id_viaje===editId):{destino:state.city};state.draft=editId?null:{destino:v?.destino||state.city,presupuesto:12000};
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
 if(type==='hospedaje'&&!editId){value.fecha_entrada=t.fecha_inicio;value.fecha_salida=t.fecha_fin}
 if(type==='itinerario'&&!editId)value.fecha=t.fecha_inicio;
 if(type==='gasto'&&!editId)value.fecha=new Date().toISOString().slice(0,10);
 if(type==='transporte'&&!editId){value.origen='Mi ciudad';value.destino=t.destino;value.fecha_hora_salida=t.fecha_inicio+'T08:00'}
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
   if(data.fecha_inicio>data.fecha_fin)throw Error('La fecha final no puede ser anterior a la inicial.');
   if(id){await api('/api/viajes/'+id,{method:'PUT',body:data});closeModal();await loadTrips(id)}
   else{let res=await api('/api/viajes',{method:'POST',body:data});closeModal();await loadTrips(res.id_viaje);state.city=data.destino}
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
  const opts=d.opciones.sort((a,b)=>mot==='presupuesto'?a.diferencia-b.diferencia:0);
  $('#planb-list').innerHTML=opts.length?opts.map(l=>`<div class="planb-option">${photo(img(l),'')}<div class="grow"><h4>${esc(l.nombre)}</h4><p>${esc(l.motivo)} · ${l.duracion_min} min</p><strong class="small">${money(l.precio_estimado)}</strong> <span class="tiny muted">(${l.diferencia>=0?'+':''}${money(l.diferencia)} previsto)</span></div><button class="btn sm primary" data-action="apply-planb" data-id="${l.id_lugar}">Elegir</button></div>`).join(''):'<div class="empty">No hay alternativas en este catálogo para este motivo.</div>';
 }catch(e){fail(e)}}
async function chooseAction(action,el){let id=el.dataset.id,tab=el.dataset.nav;try{
 if(tab){go(tab);return}
 if(action==='newtrip'){openForm('viaje');return}
 if(action==='choose-trip'){await loadTrips(Number(id));go('inicio');return}
 if(action==='edit-trip'){openForm('viaje',Number(id));return}
 if(action==='delete-trip'){
   if(!confirm('¿Eliminar este viaje y todos sus registros? Esta acción NO se puede deshacer.'))return;
   await api('/api/viajes/'+id,{method:'DELETE'});await loadTrips();go('inicio');toast('Viaje eliminado.');return;
 }
 if(action==='filter'){state.filter=el.dataset.filter;render();return}
 if(action==='add-place'){
   let l=placeById(id);if(!trip()||l.ciudad!==trip().destino){toast('Crea o selecciona primero un viaje al mismo destino.',true);return}
   if(!state.detail.dias.length){toast('Crea primero un día del itinerario.',true);go('agenda');return}
   state.modal={chosenPlace:id};openForm('actividad',null,{nombre:l.nombre,lugar:l.nombre,costo_estimado:l.precio_estimado,duracion_min:l.duracion_min,categoria:l.categoria,hora_inicio:'10:00'});state.modal={chosenPlace:id};return
 }
 if(action==='info-place'){let l=placeById(id);showModal(esc(l.nombre),`${photo(img(l),'card-img','Fotografía de '+l.nombre)}<p class="illustration-label">Fotografía: ${esc(l.credito||'Autor indicado en la fuente')} · ${esc(l.licencia||'Consulta licencia')} · <a href="${esc(l.fuente||'#')}" target="_blank" rel="noopener">Ver fuente y licencia ↗</a></p><p class="body-copy">${esc(l.descripcion)}</p><div class="grid grid-2"><div class="box-soft"><span class="tiny muted">Costo orientativo (no oficial)</span><h3>${money(l.precio_estimado)}</h3></div><div class="box-soft"><span class="tiny muted">Tiempo estimado de visita</span><h3>${l.duracion_min} minutos</h3></div></div><br><div class="btn-group"><button class="btn primary" data-action="add-place" data-id="${l.id_lugar}">+ Agregar al itinerario</button><button class="btn outline" data-action="close">Cerrar</button></div>`);return}
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
 if(e.target.id==='city-filter'){state.city=e.target.value;state.filter='Todos';render();}
 if(e.target.id==='voter'){state.voter=Number(e.target.value)}
});
document.addEventListener('input',e=>{
 if(e.target.closest('#editor-form[data-kind="viaje"]') && state.draft){
   const form=e.target.closest('form'),fd=Object.fromEntries(new FormData(form).entries());
   state.draft={destino:fd.destino,fecha_inicio:fd.fecha_inicio,fecha_fin:fd.fecha_fin,presupuesto:fd.presupuesto||0};renderDock();
 }
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
 if(e.target.id==='editor-form'){e.preventDefault();const btn=e.target.querySelector('[type="submit"]');btn.disabled=true;try{await submitForm(e.target)}catch(err){fail(err);btn.disabled=false}}
});
$('#show-register').addEventListener('click',()=>{$('#login-form').classList.add('hidden');$('#register-form').classList.remove('hidden')});
$('#show-login').addEventListener('click',()=>{$('#register-form').classList.add('hidden');$('#login-form').classList.remove('hidden')});
$('#account-btn').addEventListener('click',()=>chooseAction('logout',document.createElement('button')));
window.addEventListener('keydown',e=>{if(e.key==='Escape' && $('#modal-root').firstChild)closeModal()});
init();
