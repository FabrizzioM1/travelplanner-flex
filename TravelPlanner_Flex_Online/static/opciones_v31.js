/* TravelPlanner Flex 3.1 — selecciones presupuestadas.
   Las tarifas son intervalos orientativos de planeación, NO cotizaciones.
   El programa calcula y guarda exclusivamente en endpoints 3.0 ya existentes. */
'use strict';
const TP31 = (() => {
 const GEO = {"Aguascalientes": [21.8853, -102.2916], "Baja California": [32.5149, -117.0382], "Baja California Sur": [22.8905, -109.9167], "Campeche": [19.8301, -90.5349], "Chiapas": [16.7516, -93.1029], "Chihuahua": [28.6353, -106.0889], "Ciudad de México": [19.4326, -99.1332], "Coahuila": [25.4383, -100.9737], "Colima": [19.2452, -103.7241], "Durango": [24.0277, -104.6532], "Estado de México": [19.257, -99.6557], "Guanajuato": [21.019, -101.2574], "Guerrero": [16.8531, -99.8237], "Hidalgo": [20.1011, -98.7591], "Jalisco": [20.6597, -103.3496], "Michoacán": [19.7008, -101.1844], "Morelos": [18.9242, -99.2216], "Nayarit": [21.5042, -104.8946], "Nuevo León": [25.6866, -100.3161], "Oaxaca": [17.0654, -96.7237], "Puebla": [19.0414, -98.2063], "Querétaro": [20.5888, -100.3899], "Quintana Roo": [21.1619, -86.8515], "San Luis Potosí": [22.1565, -100.9855], "Sinaloa": [23.2494, -106.4111], "Sonora": [29.0729, -110.9559], "Tabasco": [17.9895, -92.9475], "Tamaulipas": [23.7369, -99.1411], "Tlaxcala": [19.3139, -98.2404], "Veracruz": [19.1738, -96.1342], "Yucatán": [20.9674, -89.5926], "Zacatecas": [22.7709, -102.5832]};
 const status = {mode:'', options:[], date:'', old:null, kind:'', origin:'', search:'', replaceId:null};
 const m=n=>money(n);
 const safe=s=>esc(s);
 const midpoint=(lo,hi)=>Math.round(((Number(lo)+Number(hi))/2)/10)*10;
 const maps=(name,region)=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(name+', '+region+', México');
 const days=()=>v3Days();
 const t=()=>trip();
 const n=()=>Number(t()?.num_viajeros||1);
 const nights=()=>Math.max(1,v3NumDays(t())-1);
 const selectDay=val=>v3DaySelect(val||v3Day()?.fecha);
 const subtitle='<div class="v31-disclaimer">Rangos de referencia para presupuestar en MXN; no son tarifas en vivo ni garantizan disponibilidad. Revisa precios finales, equipaje, impuestos, coberturas y horarios antes de contratar.</div>';
 const homeButton='<button class="btn outline" type="button" data-action="v31-back">← Cambiar opciones</button>';
 const card=o=>`<article class="v31-choice"><div class="v31-choice-main"><span class="v31-emoji">${safe(o.icon||'✦')}</span><div class="v31-grow"><strong>${safe(o.name)}</strong><small>${safe(o.desc||'')}</small>${o.url?`<a href="${safe(o.url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Comprobar proveedor o ubicación ↗</a>`:''}</div></div><div class="v31-choice-footer"><span><strong>${m(o.lo)}–${m(o.hi)}</strong><small>${safe(o.unit||'referencia por persona')}</small></span><button class="btn primary" data-action="v31-pick" data-id="${o.idx}">Elegir →</button></div></article>`;
 function show(title,options, mode, description='') {
  status.options=options.map((o,i)=>({...o,idx:i}));status.mode=mode;
  showModal(title, `<p class="modal-sub">${safe(description)}</p><div class="v31-options">${status.options.map(card).join('')}</div>${subtitle}<div class="form-actions"><button type="button" class="btn outline" data-action="close">Cerrar</button></div>`,true);
 }
 function menu(){
  const groups=[['boleto_ida','🚌','Ida al destino','Autobús o avión con precio orientativo'],['boleto_regreso','✈','Regreso a casa','Opciones de transporte de vuelta'],['hospedaje','🏨','Hospedaje','Tipos de habitación y noches'],['comida','🍽','Dónde comer','Restaurantes, mercados y presupuesto'],['uber','🚕','Uber y taxi','Traslados cortos, largos o aeropuerto'],['renta_auto','🚙','Rentar automóvil','Económico, sedán o SUV'],['actividad','🌿','Actividad','Lugares y precios de referencia'],['gasolina','⛽','Gasolina','Estimación de combustible'],['casetas','🛣','Casetas','Peajes de ida y vuelta'],['otro','＋','Otro costo','Gasto que no está en las opciones']];
  showModal('¿Qué quieres añadir al día '+(state.dayIndex+1)+'?', `<p class="modal-sub">Primero compara opciones y rangos. Después elige una para calcularla en tu viaje.</p><div class="v3-menu-grid">${groups.map(([kind,ico,title,desc])=>`<button data-action="v31-menu" data-kind="${kind}">${ico}<strong>${safe(title)}</strong><small>${safe(desc)}</small></button>`).join('')}</div>`,true);
 }
 function routeDistance(a,b){const c=GEO[a],d=GEO[b];if(!c||!d)return null;const toRad=x=>x*Math.PI/180;const h=Math.sin(toRad((d[0]-c[0])/2))**2+Math.cos(toRad(c[0]))*Math.cos(toRad(d[0]))*Math.sin(toRad((d[1]-c[1])/2))**2;return Math.round(6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h)));}
 function ticketOptions(origin){
  const destination=t().destino,dist=routeDistance(origin,destination);
  if(dist===null)return [];
  // Estimador de planificación con gran margen, no kilómetros reales por carretera ni tarifas de operadores.
  const km=Math.max(85,dist*1.35);
  const bus=Math.min(3200,Math.max(190,Math.round((140+km*.72)/50)*50));
  const flight=Math.min(8500,Math.max(950,Math.round((780+dist*.95)/50)*50));
  return [
   {name:'Autobús económico',desc:`${origin} → ${destination}. Distancia geográfica aprox. ${dist} km; ruta, terminal y horarios por confirmar.`,lo:Math.round(bus*.72/10)*10,hi:Math.round(bus*1.35/10)*10,unit:'por boleto · estimado',icon:'🚌',url:'https://www.ado.com.mx/'},
   {name:'Autobús ejecutivo',desc:'Asientos y comodidad superiores cuando exista servicio en la ruta.',lo:Math.round(bus*1.3/10)*10,hi:Math.round(bus*2/10)*10,unit:'por boleto · estimado',icon:'🚍',url:'https://etn.com.mx/'},
   {name:'Vuelo básico',desc:'No presupone ruta directa. Verificar TUA, equipaje, conexiones y traslado al aeropuerto.',lo:Math.round(flight*.7/10)*10,hi:Math.round(flight*1.75/10)*10,unit:'por boleto · estimado',icon:'✈',url:'https://www.google.com/travel/flights'},
   {name:'Vuelo con equipaje',desc:'Referencia con margen adicional para equipaje y selección; no es tarifa oficial.',lo:Math.round(flight*1.15/10)*10,hi:Math.round(flight*2.2/10)*10,unit:'por boleto · estimado',icon:'🧳',url:'https://www.google.com/travel/flights'}
  ];
 }
 function ticket(type){
  status.kind=type;status.old=null;
  const origin=status.origin;
  const options='<option value="">Selecciona el estado desde donde sales</option>'+Object.keys(GEO).map(g=>`<option value="${safe(g)}" ${g===origin?'selected':''}>${safe(g)}</option>`).join('');
  showModal(type==='boleto_ida'?'Comparar boletos de ida':'Comparar boletos de regreso',`<p class="modal-sub">Tu destino: <b>${safe(t().destino)}</b>. Primero dinos desde dónde sales. Los rangos dependen de una distancia aproximada.</p><label class="v31-field-label">Estado de origen habitual</label><select id="v31-origin">${options}</select><div id="v31-route-options">${origin?`<div class="v31-options">${ticketOptions(origin).map((o,i)=>card({...o,idx:i})).join('')}</div>`:'<div class="v3-muted-box">Selecciona el origen para comparar opciones.</div>'}</div>${subtitle}`,true);
  status.mode='ticket';status.options=ticketOptions(origin).map((o,i)=>({...o,idx:i}));
 }
 function transport(type){
  status.kind=type;status.old=null;
  const rent=[{name:'Automóvil económico',desc:'Compacto para recorridos urbanos. Seguro, depósito e impuestos por confirmar.',lo:450,hi:900,unit:'por día por vehículo',icon:'🚗',url:'https://www.booking.com/cars/'},{name:'Sedán mediano',desc:'Más espacio. Consulta conductor, seguros y kilometraje permitido.',lo:650,hi:1250,unit:'por día por vehículo',icon:'🚘',url:'https://www.hertzmexico.com/'},{name:'SUV o familiar',desc:'Verifica capacidad de pasajeros y equipaje antes de reservar.',lo:1100,hi:2300,unit:'por día por vehículo',icon:'🚙',url:'https://www.booking.com/cars/'}];
  const uber=[{name:'Traslado corto',desc:'Ejemplo de trayecto urbano; distancia, tránsito y demanda cambian la tarifa.',lo:65,hi:160,unit:'por auto / trayecto',icon:'🚕',url:'https://www.uber.com/global/es/price-estimate/'},{name:'Traslado mediano',desc:'Ejemplo de trayecto por distintos barrios de la ciudad.',lo:130,hi:300,unit:'por auto / trayecto',icon:'🚕',url:'https://www.uber.com/global/es/price-estimate/'},{name:'Aeropuerto o traslado largo',desc:'Ejemplo ilustrativo; pueden existir suplementos y variaciones.',lo:230,hi:550,unit:'por auto / trayecto',icon:'🚖',url:'https://www.uber.com/global/es/price-estimate/'}];
  const other={gasolina:[{name:'Combustible urbano',desc:'Una provisión para recorrido moderado. Ajusta según distancia y consumo.',lo:250,hi:600,unit:'por vehículo',icon:'⛽'},{name:'Carretera / excursiones',desc:'Trayectos largos. Ajusta al consumo del vehículo.',lo:550,hi:1500,unit:'por vehículo',icon:'⛽'}],casetas:[{name:'Peajes del trayecto',desc:'Provisión provisional; comprueba la ruta y autopistas reales.',lo:100,hi:650,unit:'por vehículo',icon:'🛣'},{name:'Ruta de peaje larga',desc:'Provisión para varios peajes y regreso; revisa si es ida y vuelta.',lo:600,hi:1900,unit:'por vehículo',icon:'🛣'}],otro:[{name:'Otros imprevistos',desc:'Concepto editable.',lo:100,hi:500,unit:'por grupo',icon:'＋'}]};
  show(type==='renta_auto'?'Elige automóvil':type==='uber'?'Compara traslados':type==='gasolina'?'Estimación de gasolina':type==='casetas'?'Previsión de casetas':'Otro gasto',type==='renta_auto'?rent:type==='uber'?uber:other[type]||other.otro,'concept','El importe que elijas se guardará como una previsión editable, sin contratar nada.');
 }
 function hotels(replaceId=null){
  status.kind='hospedaje';status.old=null;status.replaceId=replaceId;
  show('Opciones para hospedarte',[
   {name:'Habitación económica',desc:'Estimación por habitación y noche. No corresponde a un hotel reservado.',lo:550,hi:950,unit:'por habitación / noche',icon:'🛏',url:'https://www.booking.com/'},
   {name:'Hotel de gama media',desc:'Tarifa orientativa por habitación y noche; confirmar impuestos y desayuno.',lo:900,hi:1650,unit:'por habitación / noche',icon:'🏨',url:'https://www.booking.com/'},
   {name:'Hotel familiar o boutique',desc:'Revisar capacidad real por habitación y política de menores.',lo:1450,hi:2800,unit:'por habitación / noche',icon:'🏩',url:'https://www.booking.com/'},
  ],'hotel',`Se presupuestan ${nights()} noches. Puedes editar el alojamiento, cambiar de opción o añadir otra estancia.`);
  const existing=state.detail?.hospedajes||[];
  if(existing.length){
   const html='<section class="v32-lodging-existing"><strong>🏨 Hospedaje ya guardado</strong><p>Editar no añade otro hotel ni duplica tu presupuesto.</p>'+existing.map(h=>`<div class="v32-lodging-row"><span>${safe(h.nombre)} · ${m(h.costo)} · ${safe(h.estado)}</span><button class="btn sm outline" data-action="edit-hostel" data-id="${h.id_hospedaje}">✎ Editar</button>${h.estado==='pendiente'&&!h.num_reservacion?`<button class="btn sm soft" data-action="v31-replace-hotel" data-id="${h.id_hospedaje}">Cambiar opción</button>`:''}</div>`).join('')+'</section>';
   document.querySelector('.modal .v31-options')?.insertAdjacentHTML('beforebegin',html);
  }
  if(replaceId){
   const h=existing.find(x=>x.id_hospedaje===Number(replaceId));
   if(!h||h.estado!=='pendiente'||h.num_reservacion)throw Error('Sólo puedes sustituir una estimación sin reserva. Para otro caso usa Editar.');
   document.querySelector('.modal .v31-options')?.insertAdjacentHTML('beforebegin',`<div class="v32-hotel-replace-note">Cambiarás la estimación de <b>${safe(h.nombre)}</b>; no se agregará otro hotel.</div>`);
  }
 }

 function meals(old=null){
  status.old=old;status.kind=old?.tipo||'comida';
  const typ=status.kind,place=t().destino;
  const kindNames={desayuno:'Desayuno',comida:'Comida',cena:'Cena'};
  const base=typ==='desayuno'?[55,130]:typ==='cena'?[80,200]:[75,180];
  const gastro=state.catalog.filter(p=>p.ciudad===place && classifyPlace(p)==='Gastronomía').slice(0,6);
  const presets=[
   {name:'Mercado o fonda local',desc:'Menú sencillo o antojitos. Previsión por comensal, no un precio de carta.',lo:base[0],hi:base[1],unit:'por persona',icon:'🥘',url:maps('mercados y fondas',place)},
   {name:'Restaurante regional',desc:'Comida en establecimiento formal. Añade bebidas y propina cuando corresponda.',lo:typ==='desayuno'?120:180,hi:typ==='desayuno'?250:420,unit:'por persona',icon:'🍛',url:maps('restaurantes regionales',place)},
   {name:'Restaurante de especialidad',desc:'Referencia alta; menú, horarios y cargos deben verificarse.',lo:typ==='desayuno'?200:350,hi:typ==='desayuno'?450:850,unit:'por persona',icon:'🍽',url:maps('restaurantes de especialidad',place)}
  ];
  for(const p of gastro){presets.push({name:p.nombre,desc:`Zona gastronómica documentada en ${place}. El rango es una previsión por comida, NO una tarifa del establecimiento.`,lo:base[0],hi:typ==='desayuno'?190:350,unit:'presupuesto por persona',icon:'📍',url:maps(p.nombre,place)});}
  show('Dónde '+(typ==='desayuno'?'desayunar':typ==='cena'?'cenar':'comer')+' en '+place,presets,'meal','Elige un tipo de comida o una zona concreta. Podrás cambiar el importe al conocer el menú.');
  const wrapper=document.querySelector('.modal .v31-options');
  if(wrapper){
   const btn=document.createElement('button');btn.type='button';btn.className='btn outline v31-real-food-button';btn.dataset.action='v31-restaurants';
   btn.textContent='🔎 Buscar restaurantes registrados cerca de '+place;
   wrapper.before(btn);
  }
 }
 async function nearbyRestaurants(){
  showModal('Buscando restaurantes', '<p class="modal-sub">Consultando establecimientos registrados en OpenStreetMap cerca de la coordenada de referencia de '+safe(t().destino)+'…</p><div class="v3-muted-box">Si el servicio externo no responde, puedes continuar usando los presupuestos de comida y mercados del catálogo.</div>',true);
  let res;
  try{res=await api('/api/opciones/restaurantes?destino='+encodeURIComponent(t().destino));}
  catch(err){showModal('No se pudo consultar', '<p>El servicio externo de restaurantes no respondió.</p><button class="btn primary" data-action="v31-back">Volver a las opciones</button>',true);return}
  const opts=(res.resultados||[]).map(r=>({name:r.nombre,desc:'Registrado como '+(r.tipo==='cafe'?'cafetería':r.tipo==='fast_food'?'comida rápida':'restaurante')+' en OpenStreetMap. '+(r.cocina?'Cocina: '+r.cocina+'. ':'')+'Rango general para presupuestar, NO precio de menú.',lo:r.min,hi:r.max,unit:'por persona · referencia',icon:'🍴',url:r.fuente}));
  if(!opts.length){showModal('Sin resultados externos', '<p class="modal-sub">No se recibieron establecimientos verificables desde la fuente externa; esto no significa que no existan restaurantes.</p><button class="btn primary" data-action="v31-back">Ver mercados y otras opciones</button>',true);return}
  show('Restaurantes registrados cerca de '+t().destino,opts,'meal',res.aviso||'Nombres tomados de OpenStreetMap; verifica horarios, ubicación y menú antes de visitar.');
 }
 function activities(placeId=null){
  status.kind='actividad';status.old=null;
  const focus=placeId?state.catalog.find(p=>p.id_lugar===placeId):null;
  const pool=focus?[focus]:state.catalog.filter(p=>p.ciudad===t().destino && classifyPlace(p)!=='Gastronomía').slice(0,12);
  const opts=pool.map(p=>{
   const known=Number(p.precio_estimado)>0;
   const indoor=p.interior==1;
   const lo=known?Math.max(0,Math.round(Number(p.precio_estimado)*.7/10)*10):(p.categoria==='Naturaleza'?90:60);
   const hi=known?Math.round(Number(p.precio_estimado)*1.5/10)*10:(p.categoria==='Naturaleza'?420:280);
   return {name:p.nombre,desc:`${p.categoria} · ${p.ciudad}. ${known?'Costo del catálogo sujeto a verificación':'Sin precio oficial verificado; presupuesto general de actividad'}.`,lo,hi,unit:'por persona · referencia',icon:indoor?'🏛':'🌿',placeId:p.id_lugar,url:maps(p.nombre,p.ciudad)};
  });
  if(!focus)opts.push({name:'Recorrido guiado opcional',desc:'Una opción abierta para añadir una experiencia todavía sin proveedor confirmado.',lo:200,hi:750,unit:'por persona',icon:'🗺'});
  show(focus?'Presupuesta tu visita':'Actividades para '+t().destino,opts,'activity','Elige un atractivo o tipo de experiencia. Modifica después la tarifa real y el número de participantes.');
 }
 function pick(i){
  const o=status.options[Number(i)];if(!o)return;
  status.selected=o;
  const isMeal=status.mode==='meal',isHotel=status.mode==='hotel',isActivity=status.mode==='activity';
  const isRent=status.kind==='renta_auto',isTicket=status.mode==='ticket';
  const unit=midpoint(o.lo,o.hi);
  const q=isHotel?Math.ceil(n()/2)*nights():isRent?v3NumDays(t()):1;
  const persons=isMeal||isTicket||isActivity?n():1;
  const label=isHotel?'Habitaciones × noches':isRent?'Días de renta':isTicket?'Boletos por viajero':'Cantidad de servicios';
  const old=status.old;
  const dateInput=isMeal?`<input type="hidden" name="fecha" value="${safe(old.fecha)}"><p class="v31-locked-date">${dateES(old.fecha)} · para cambiar de día, edita la comida correspondiente de ese día.</p>`:selectDay(v3Day()?.fecha);
  showModal('Presupuestar · '+o.name,`<div class="v31-picked"><strong>${safe(o.name)}</strong><span>Rango de referencia: ${m(o.lo)} a ${m(o.hi)} ${safe(o.unit||'')}</span>${o.url?`<a href="${safe(o.url)}" target="_blank" rel="noopener noreferrer">Consultar precios o ubicación ↗</a>`:''}</div><form id="v31-option-form"><div class="form-grid"><div class="field full"><label>Nombre o descripción</label><input name="nombre" maxlength="140" required value="${safe(isMeal?(status.kind==='desayuno'?'Desayuno':status.kind==='cena'?'Cena':'Comida')+' · '+o.name:o.name)}"></div><div class="field"><label>Día del itinerario</label>${dateInput}</div><div class="field"><label>Hora (opcional)</label><input name="hora" type="time" value="${isMeal?(status.kind==='desayuno'?'08:30':status.kind==='cena'?'20:00':'14:30'):'10:00'}"></div><div class="field"><label>Precio ${isHotel?'por habitación/noche':isRent?'por día':isTicket?'por boleto':isMeal||isActivity?'por persona':'por servicio'} (MXN)</label><input name="precio_unitario" type="number" min="0" max="1000000" step="0.01" value="${unit}" required></div><div class="field"><label>${label}</label><input name="cantidad" type="number" min="1" max="365" step="1" value="${q}" required></div><div class="field"><label>${isHotel?'Habitaciones calculadas según viajeros':'Personas que consumen o pagan esta unidad'}</label><input name="personas" type="number" min="1" max="${n()}" step="1" value="${persons}" ${isHotel?'readonly':''} required></div><div class="field"><label>¿Está incluido en otro pago?</label><select name="incluido"><option value="0">No, contar el costo</option><option value="1">Sí, costo adicional $0</option></select></div><div class="field full"><label>Nota</label><textarea name="nota" maxlength="350">Rango orientativo: ${o.lo}–${o.hi} MXN. ${isHotel?'Capacidad estimada de 2 personas por habitación; verificar con alojamiento.':isTicket?'Origen: '+status.origin+'; ruta y disponibilidad por confirmar.':'Confirmar precio real antes del viaje.'}</textarea></div></div><div class="v31-live-total">Costo previsto para tu viaje: <strong id="v31-total">${m(unit*q*persons)}</strong></div>${subtitle}<div class="form-actions">${homeButton}<button class="btn primary" type="submit">${isMeal?'Actualizar esta comida':'Añadir al presupuesto'} →</button></div></form>`,true);
 }
 async function save(form){
  const p=Object.fromEntries(new FormData(form).entries());const o=status.selected;const isMeal=status.mode==='meal',isHotel=status.mode==='hotel',isActivity=status.mode==='activity';
  const price=Number(p.precio_unitario),quantity=Number(p.cantidad),people=Number(p.personas);
  if(!Number.isFinite(price)||price<0||!Number.isFinite(quantity)||quantity<=0||!Number.isInteger(people)||people<1||people>n())throw Error('Revisa precio, cantidad y personas.');
  if(p.fecha<t().fecha_inicio||p.fecha>t().fecha_fin)throw Error('Día fuera de las fechas del viaje.');
  if(isHotel){
    const existing=state.detail?.hospedajes||[];
    const replace=existing.find(x=>x.id_hospedaje===Number(status.replaceId));
    const data={id_viaje:state.tripId,nombre:p.nombre+' (presupuesto, sin reserva)',direccion:'Alojamiento a confirmar',fecha_entrada:t().fecha_inicio,fecha_salida:t().fecha_fin,costo:Math.round(price*quantity*100)/100,num_reservacion:'',estado:'pendiente'};
    if(replace){
      if(replace.estado!=='pendiente'||replace.num_reservacion)throw Error('No se puede sustituir una reservación confirmada. Selecciona Editar.');
      await api('/api/hospedaje/'+replace.id_hospedaje,{method:'PUT',body:{nombre:data.nombre,costo:data.costo}});
    }else{
      if(existing.length&&!confirm('Ya tienes alojamiento. Agregar otro sumará ambas estancias; si quieres cambiar la opción anterior usa «Cambiar opción». ¿Agregar uno nuevo?'))return;
      await api('/api/hospedaje',{method:'POST',body:data});
    }
  } else if(isActivity){
    const idx=days().find(d=>d.fecha===p.fecha);if(!idx)throw Error('Día no disponible.');
    let cost=Math.round(price*quantity*people*100)/100;
    if(o.placeId){
      const r=await api(`/api/viajes/${state.tripId}/lugares`,{method:'POST',body:{id_lugar:o.placeId,fecha:p.fecha,hora_inicio:p.hora||'10:00'}});
      if(r.id_actividad)await api(`/api/actividad/${r.id_actividad}`,{method:'PUT',body:{costo_estimado:cost,nombre:p.nombre}});
    } else {
      await api('/api/actividad',{method:'POST',body:{id_itinerario:idx.id_itinerario,nombre:p.nombre,hora_inicio:p.hora||'10:00',duracion_min:120,lugar:t().destino,costo_estimado:cost,categoria:'Otros',estado:'planeada'}});
    }
  } else {
    const type=status.kind;
    const body={tipo:type,fecha:p.fecha,nombre:p.nombre,hora:p.hora,precio_unitario:price,cantidad:quantity,personas:people,incluido:Number(p.incluido),nota:p.nota};
    let url=`/api/viajes/${state.tripId}/plan/conceptos`;const old=status.old;
    if(isMeal){if(!old)throw Error('La comida no existe en el itinerario.');url+='/'+old.id_concepto;}
    await api(url,{method:isMeal?'PUT':'POST',body});
  }
  const day=p.fecha;closeModal();await v3Refresh();let idx=days().findIndex(d=>d.fecha===day);if(idx>=0)state.dayIndex=idx;go('planificar');toast(isMeal?'Comida actualizada con su costo por persona.':'Opción añadida al presupuesto.');
 }
 async function handle(action,el){
  if(action==='v31-menu'){
    const kind=el.dataset.kind;
    if(['boleto_ida','boleto_regreso'].includes(kind))ticket(kind);
    else if(kind==='hospedaje')hotels();
    else if(kind==='actividad')activities();
    else if(kind==='comida'){
      const meal=v3Day()?.conceptos.find(x=>x.tipo==='comida');if(meal)meals(meal);
    }else transport(kind);
    return;
  }
  if(action==='v31-pick')return pick(el.dataset.id);
  if(action==='v31-replace-hotel')return hotels(Number(el.dataset.id));
  if(action==='v31-restaurants')return await nearbyRestaurants();
  if(action==='v31-back'){
    if(status.mode==='ticket')ticket(status.kind);
    else if(status.mode==='meal')meals(status.old);
    else if(status.mode==='hotel')hotels();
    else if(status.mode==='activity')activities(status.selected?.placeId||null);
    else transport(status.kind);
    return;
  }
 }
 function recalc(form){
  const n1=Number(form.elements.precio_unitario?.value)||0,n2=Number(form.elements.cantidad?.value)||0,n3=Number(form.elements.personas?.value)||0;
  const included=Number(form.elements.incluido?.value)||0;
  const node=document.getElementById('v31-total');if(node)node.textContent=m(included?0:n1*n2*n3);
 }
 return {menu,meals,activities,hotels,transport,ticket,handle,save,recalc,status};
})();
