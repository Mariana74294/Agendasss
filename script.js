/* Agenda Estudiantil - versión mejorada de demostración
   Importante: localStorage solo comparte datos dentro de ESTE navegador.
   Para cuentas compartidas, seguridad real y notificaciones externas se necesita
   conectar Firebase/Supabase y configurar permisos del lado del servidor. */

"use strict";
let usuarioActual = null;
let cuentas = leer("agendaCuentas", []);
let tareas = leer("agendaTareas", []);
let materiaSeleccionada = null;

// Materias indicadas por la estudiante según la lista escolar proporcionada.
const materiasBasicas = [
  "Comunicación y Lenguajes", "Lengua Extranjera", "Ciencias Sociales",
  "Educación Física y Deportes", "Educación Musical", "Artes Plásticas",
  "Matemáticas", "Técnica Tecnológica", "Religión"
];
function materiasDe(curso) {
  const n = parseInt(String(curso), 10);
  if (n <= 2) return [...materiasBasicas, "Ciencias Naturales", "Filosofía"];
  return [...materiasBasicas, "Física", "Química", "Sistemas Informáticos", "Biología", "Psicología"];
}
function leer(clave, fallback) {
  try { const valor = JSON.parse(localStorage.getItem(clave) || "null"); return Array.isArray(valor) ? valor : fallback; }
  catch (_) { return fallback; }
}
function guardarDatos() {
  localStorage.setItem("agendaCuentas", JSON.stringify(cuentas));
  localStorage.setItem("agendaTareas", JSON.stringify(tareas));
}
function guardarRegistros() { localStorage.setItem("agendaRegistros", JSON.stringify(cuentas.map(c => ({nombre:c.nombre, usuario:c.usuario, correo:c.correo, curso:c.curso, paralelo:c.paralelo, fechaRegistro:c.fechaRegistro, tipo:c.tipo})))); }
function escapeHTML(text) {
  return String(text ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
function ocultarPantallas() {
  ["registerScreen","loginScreen","adminScreen","studentScreen"].forEach(id => document.getElementById(id).classList.add("hidden"));
}
function mostrarRegistro() { ocultarPantallas(); document.getElementById("registerScreen").classList.remove("hidden"); }
function mostrarLogin() { ocultarPantallas(); document.getElementById("loginScreen").classList.remove("hidden"); }

document.getElementById("registerForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const nombre = document.getElementById("nombre").value.trim();
  const usuario = document.getElementById("usuario").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const curso = document.getElementById("curso").value;
  const paralelo = document.getElementById("paralelo").value;
  const password = document.getElementById("password").value;
  if (cuentas.some(c => c.usuario.toLowerCase() === usuario.toLowerCase())) { alert("Ese usuario ya existe. Elige otro."); return; }

  // Los registros públicos siempre son de estudiante. No se permite autoproclamarse administrador.
  const nuevaCuenta = { id: Date.now(), nombre, usuario, correo, curso, paralelo, tipo:"estudiante", password, fechaRegistro:new Date().toISOString() };
  cuentas.push(nuevaCuenta);
  guardarDatos();
  guardarRegistros();

  // Aviso local de demostración: solo se muestra en este mismo navegador.
  const admins = cuentas.filter(c => c.tipo === "administrador");
  if (admins.length) {
    localStorage.setItem("agendaAvisosAdmin", JSON.stringify(
      [{id:Date.now(), texto:`Nuevo registro: ${nombre} (${curso} ${paralelo})`, fecha:new Date().toISOString()}, ...leer("agendaAvisosAdmin",[])]
    ));
  }
  alert("¡Cuenta creada correctamente! 🎉 Ya puedes iniciar sesión.");
  document.getElementById("registerForm").reset();
  mostrarLogin();
  document.getElementById("loginUsuario").value = usuario;
});

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const usuario = document.getElementById("loginUsuario").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  const cuenta = cuentas.find(c => c.usuario.toLowerCase() === usuario && c.password === password);
  if (!cuenta) { alert("Usuario o contraseña incorrectos. ❌"); return; }
  usuarioActual = cuenta;
  mostrarPanel();
});

function mostrarPanel() {
  ocultarPantallas();
  if (!usuarioActual) { mostrarRegistro(); return; }
  if (usuarioActual.tipo === "administrador") {
    document.getElementById("adminScreen").classList.remove("hidden");
    document.getElementById("adminName").textContent = usuarioActual.nombre;
    cargarTareasAdmin();
    cargarRegistrosAdmin();
  } else {
    document.getElementById("studentScreen").classList.remove("hidden");
    document.getElementById("studentName").textContent = usuarioActual.nombre;
    document.getElementById("studentCourse").textContent = usuarioActual.curso + " " + usuarioActual.paralelo;
    materiaSeleccionada = null;
    mostrarMaterias();
    actualizarEstadisticas();
  }
}

function llenarMateriasSelect() {
  const curso = document.getElementById("taskCourse").value;
  const select = document.getElementById("taskSubject");
  const anterior = select.value;
  select.innerHTML = materiasDe(curso).map(m => `<option value="${escapeHTML(m)}">${escapeHTML(m)}</option>`).join("");
  if (materiasDe(curso).includes(anterior)) select.value = anterior;
}
document.getElementById("taskCourse").addEventListener("change", llenarMateriasSelect);
document.getElementById("adminFilterCurso").addEventListener("change", cargarTareasAdmin);
document.getElementById("adminFilterParalelo").addEventListener("change", cargarTareasAdmin);

function abrirModal() {
  if (!usuarioActual || usuarioActual.tipo !== "administrador") { alert("Solo una cuenta administradora autorizada puede publicar actividades."); return; }
  document.getElementById("taskCourse").value = document.getElementById("adminFilterCurso").value === "todos" ? "1ro" : document.getElementById("adminFilterCurso").value;
  document.getElementById("taskParallel").value = document.getElementById("adminFilterParalelo").value === "todos" ? "A" : document.getElementById("adminFilterParalelo").value;
  llenarMateriasSelect();
  document.getElementById("taskModal").classList.remove("hidden");
}
function cerrarModal() { document.getElementById("taskModal").classList.add("hidden"); }

document.getElementById("taskForm").addEventListener("submit", function(e) {
  e.preventDefault();
  if (!usuarioActual || usuarioActual.tipo !== "administrador") { alert("No tienes permiso para publicar actividades."); return; }
  const tarea = {
    id: Date.now(),
    titulo: document.getElementById("taskTitle").value.trim(),
    materia: document.getElementById("taskSubject").value,
    descripcion: document.getElementById("taskDescription").value.trim(),
    tipo: document.getElementById("taskType").value,
    fecha: document.getElementById("taskDate").value,
    curso: document.getElementById("taskCourse").value,
    paralelo: document.getElementById("taskParallel").value,
    completadaPor: []
  };
  if (!tarea.titulo || !tarea.fecha || !tarea.materia) { alert("Completa el nombre, materia y fecha."); return; }
  tareas.push(tarea);
  localStorage.setItem("agendaTareas", JSON.stringify(tareas));
  document.getElementById("taskForm").reset();
  cerrarModal();
  cargarTareasAdmin();
  alert("Actividad registrada para " + tarea.curso + " " + tarea.paralelo + " — " + tarea.materia + ". ✅");
});

function tareaCompletada(tarea) {
  return Array.isArray(tarea.completadaPor) && tarea.completadaPor.includes(usuarioActual?.id);
}
function obtenerPrioridad(fecha, completada) {
  if (completada) return {clase:"easy", texto:"✓ Completada"};
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const entrega = new Date(fecha + "T00:00:00");
  const dias = Math.ceil((entrega-hoy)/86400000);
  if (dias < 0) return {clase:"urgent",texto:"🔴 Fecha vencida"};
  if (dias <= 1) return {clase:"urgent",texto:"🔴 Urgente"};
  if (dias <= 6) return {clase:"medium",texto:"🟠 Próxima"};
  return {clase:"easy",texto:"🟢 Con tiempo"};
}
function fechaBonita(fecha) {
  if (!fecha) return "Sin fecha";
  return new Date(fecha+"T00:00:00").toLocaleDateString("es-BO",{day:"numeric",month:"long",year:"numeric"});
}
function crearHTMLTarea(tarea, estudiante=false) {
  const completa = estudiante ? tareaCompletada(tarea) : false;
  const prioridad = obtenerPrioridad(tarea.fecha, completa);
  return `<article class="task ${prioridad.clase} ${completa?"completed":""}">
    <div class="task-header"><div class="task-title">${escapeHTML(tarea.titulo)}</div><span class="task-type">${escapeHTML(tarea.tipo)}</span></div>
    <div class="task-description"><strong>📘 ${escapeHTML(tarea.materia || "Sin materia")}</strong></div>
    ${tarea.descripcion ? `<div class="task-description">${escapeHTML(tarea.descripcion)}</div>` : ""}
    <div class="task-date">📅 Entrega: ${fechaBonita(tarea.fecha)} · ${escapeHTML(tarea.curso)} ${escapeHTML(tarea.paralelo)}</div>
    <span class="priority ${prioridad.clase}">${prioridad.texto}</span>
    ${estudiante && !completa ? `<br><button class="complete-btn" onclick="completarTarea(${Number(tarea.id)})">✓ Marcar como completada</button>` : ""}
  </article>`;
}
function cargarTareasAdmin() {
  const contenedor = document.getElementById("adminTasks");
  if (!contenedor || !usuarioActual) return;
  const curso = document.getElementById("adminFilterCurso").value;
  const paralelo = document.getElementById("adminFilterParalelo").value;
  const lista = tareas.filter(t => (curso==="todos" || t.curso===curso) && (paralelo==="todos" || t.paralelo===paralelo));
  if (!lista.length) { contenedor.innerHTML = '<div class="empty-state">📚 No hay actividades para este filtro todavía.</div>'; return; }
  contenedor.innerHTML = lista.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(t=>crearHTMLTarea(t)).join("");
}
function mostrarMaterias() {
  const grid = document.getElementById("studentSubjects");
  const tareasDelCurso = tareas.filter(t => t.curso===usuarioActual.curso && t.paralelo===usuarioActual.paralelo);
  grid.innerHTML = materiasDe(usuarioActual.curso).map(materia => {
    const pendientes = tareasDelCurso.filter(t=>t.materia===materia && !tareaCompletada(t)).length;
    return `<button class="subject-card" onclick="abrirMateria('${escapeHTML(materia).replace(/'/g,"&#039;")}')"><span class="subject-name">${escapeHTML(materia)}</span>${pendientes ? `<span class="subject-alert" title="${pendientes} actividad(es) pendiente(s)">❓ ${pendientes}</span>` : '<span class="subject-empty">Sin pendientes</span>'}</button>`;
  }).join("");
  document.getElementById("studentSubjects").classList.remove("hidden");
  document.getElementById("subjectTasks").classList.add("hidden");
}
function abrirMateria(materia) {
  materiaSeleccionada = materia;
  document.getElementById("selectedSubjectTitle").textContent = "📘 " + materia;
  const lista = tareas.filter(t=>t.curso===usuarioActual.curso && t.paralelo===usuarioActual.paralelo && t.materia===materia);
  const contenedor = document.getElementById("studentTasks");
  contenedor.innerHTML = lista.length ? lista.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(t=>crearHTMLTarea(t,true)).join("") : '<div class="empty-state">🌟 No hay actividades en esta materia por ahora.</div>';
  document.getElementById("studentSubjects").classList.add("hidden");
  document.getElementById("subjectTasks").classList.remove("hidden");
}
function actualizarEstadisticas() {
  const lista = tareas.filter(t=>t.curso===usuarioActual.curso && t.paralelo===usuarioActual.paralelo);
  document.getElementById("totalTasks").textContent = lista.length;
  document.getElementById("pendingTasks").textContent = lista.filter(t=>!tareaCompletada(t)).length;
  document.getElementById("doneTasks").textContent = lista.filter(t=>tareaCompletada(t)).length;
}
function completarTarea(id) {
  const tarea = tareas.find(t=>Number(t.id)===Number(id));
  if (!tarea || !usuarioActual || usuarioActual.tipo!=="estudiante") return;
  if (!Array.isArray(tarea.completadaPor)) tarea.completadaPor = [];
  if (!tarea.completadaPor.includes(usuarioActual.id)) tarea.completadaPor.push(usuarioActual.id);
  localStorage.setItem("agendaTareas", JSON.stringify(tareas));
  if (materiaSeleccionada) abrirMateria(materiaSeleccionada);
  actualizarEstadisticas();
}
function cargarRegistrosAdmin() {
  const el = document.getElementById("adminRegistrations");
  if (!el) return;
  const lista = cuentas.filter(c=>c.tipo!=="administrador").slice().sort((a,b)=>(b.id||0)-(a.id||0)).slice(0,10);
  el.innerHTML = lista.length ? lista.map(c=>`<div class="registration-item"><strong>${escapeHTML(c.nombre)}</strong> · ${escapeHTML(c.curso)} ${escapeHTML(c.paralelo)}<br><span class="muted">@${escapeHTML(c.usuario)} · ${c.fechaRegistro ? new Date(c.fechaRegistro).toLocaleString("es-BO") : "Fecha no disponible"}</span></div>`).join("") : '<p class="muted">Todavía no hay registros.</p>';
}
function cerrarSesion() {
  usuarioActual = null;
  materiaSeleccionada = null;
  document.getElementById("loginForm").reset();
  mostrarRegistro();
}

/* CONFIGURACIÓN INICIAL DEL ADMINISTRADOR:
   Por seguridad, el formulario público no permite crear cuentas admin.
   En esta demo no existe una forma segura de convertirte en admin desde la web.
   Para uso real, configura un proveedor de autenticación y permisos en el servidor.
   No pongas una contraseña secreta dentro de este archivo: el código publicado es visible. */
