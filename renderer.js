// Variables globales para el timer
let currentTimer = null;
let isPaused = false;
let currentState = 'idle';
let remainingTime = 25 * 60; // 25 minutos en segundos
let totalTime = 25 * 60;
let currentCycle = 0;
let totalCycles = 4;
let lastActiveState = 'idle';


// Referencias a elementos DOM
const timerDisplay = document.getElementById('remaining');
const stateDisplay = document.getElementById('state');
const progressFill = document.querySelector('.progress .fill');
const startBtn = document.getElementById('start');
const pauseBtn = document.getElementById('pause');
const stopBtn = document.getElementById('stop');
const configBtn = document.getElementById('btn-config');
const configModal = document.getElementById('config-modal');
const modalBackdrop = document.getElementById('modal-backdrop');
const configClose = document.getElementById('config-close');
const configSave = document.getElementById('config-save');

const DEV = false; // ponlo a false para build normal



// Controles de ventana
const btnMin = document.getElementById('btn-min');
const btnClose = document.getElementById('btn-close');

// Función para cambiar estado de LEDs
// 1) Memoriza el último estado "real" dentro de changeLEDState
function changeLEDState(state) {
    // Si es un estado activo, guárdalo
    if (state === 'work' || state === 'rest' || state === 'longbreak') {
        lastActiveState = state;
    }

    // Actualizar UI (si tu "icono" dependía de otra cosa, aquí solo tocamos texto)
    if (stateDisplay) stateDisplay.textContent = state;

    if (window.electronAPI?.changeLEDs) {
        window.electronAPI.changeLEDs(state);
    } else {
        // fallback visual
        const body = document.body;
        body.classList.remove('work-state', 'rest-state', 'paused-state', 'idle-state');
        switch (state) {
            case 'work': body.classList.add('work-state'); break;
            case 'rest':
            case 'longbreak': body.classList.add('rest-state'); break;
            case 'paused': body.classList.add('paused-state'); break;
            default: body.classList.add('idle-state'); break;
        }
    }
}


// Función para formatear tiempo
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const cfg = getCurrentConfig();
    remainingTime = (parseInt(cfg.work) || 25) * 60;
    totalTime = remainingTime;

    updateDisplay();
    pauseBtn.disabled = true;
    stopBtn.disabled = true;

    console.log('🚀 Pomodoro RGB iniciado');
});


// Función para actualizar la visualización
function updateDisplay() {
    timerDisplay.textContent = formatTime(remainingTime);
    const progress = ((totalTime - remainingTime) / totalTime) * 100;
    progressFill.style.width = `${progress}%`;
}

// Función para obtener configuración actual
function getCurrentConfig() {
    return {
        work: parseInt(document.getElementById('work').value),
        rest: parseInt(document.getElementById('rest').value),
        cycles: parseInt(document.getElementById('cycles').value),
        longbreak: parseInt(document.getElementById('longbreak').value)
    };
}

// Función para iniciar siguiente fase
function startNextPhase() {
    const config = getCurrentConfig();

    if (currentCycle < config.cycles) {
        // Alternar entre trabajo y descanso
        if (currentState === 'work') {
            // Cambiar a descanso
            currentState = 'rest';
            remainingTime = config.rest * 60;
            totalTime = config.rest * 60;
            changeLEDState('rest');
            setPressed(startBtn);

            // Mostrar notificación de descanso
            if (window.electronAPI && window.electronAPI.showNotification) {
                window.electronAPI.showNotification('¡Hora de descansar!', `Descanso de ${config.rest} minutos`);
            }

        } else {
            // Cambiar a trabajo (siguiente ciclo)
            currentCycle++;
            currentState = 'work';
            remainingTime = config.work * 60;
            totalTime = config.work * 60;
            changeLEDState('work');
            setPressed(startBtn);

            // Mostrar notificación de trabajo
            if (window.electronAPI && window.electronAPI.showNotification) {
                window.electronAPI.showNotification('¡Hora de trabajar!', `Sesión ${currentCycle} de ${config.cycles} - ${config.work} minutos`);
            }
        }
    } else {
        // Todos los ciclos completados - descanso largo
        currentState = 'longbreak';
        remainingTime = config.longbreak * 60;
        totalTime = config.longbreak * 60;
        changeLEDState('longbreak');
        setPressed(startBtn);

        // Mostrar notificación de descanso largo
        if (window.electronAPI && window.electronAPI.showNotification) {
            window.electronAPI.showNotification('¡Descanso largo!', `¡Has completado todos los ciclos! Descanso de ${config.longbreak} minutos`);
        }
    }

    updateConfigAccess();
    updateDisplay();
    startTimer();
}

// Función para iniciar el timer
function startTimer() {

    if (currentTimer) return;

    const cfg = getCurrentConfig();

    if (currentState === 'idle') {
        // primer arranque → WORK
        currentState = 'work';
        currentCycle = 1;
        remainingTime = cfg.work * 60;
        totalTime = cfg.work * 60;
        totalCycles = cfg.cycles;
        isPaused = false;
        changeLEDState('work');
        setPressed(startBtn);

    } else if (currentState === 'paused') {
        // reanudar
        isPaused = false;
        currentState = lastActiveState || 'work';
        changeLEDState(currentState);
        setPressed(startBtn);
    }

    // ← AQUÍ: bloquea/activa Config según estado actual
    updateConfigAccess();

    currentTimer = setInterval(() => {
        remainingTime--;
        updateDisplay();

        if (remainingTime <= 0) {
            clearInterval(currentTimer);
            currentTimer = null;
            if (window.electronAPI?.playSound) window.electronAPI.playSound();

            // Fin de descanso corto: pausa + modal 1 botón
            if (currentState === 'rest') {
                isPaused = true;
                currentState = 'paused';
                changeLEDState('paused');
                updateConfigAccess(); // ← sigue bloqueado en pausa
                setPressed(pauseBtn);
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = false;

                showConfirmModal({
                    title: 'Descanso terminado',
                    message: 'Pulsa Seguir para volver al trabajo.',
                    acceptText: 'Seguir',
                    cancelText: null
                }).then((ok) => {
                    isPaused = false;
                    if (ok) startNextPhase();
                });
                return;
            }

            // Fin de descanso largo: decidir
            if (currentState === 'longbreak') {
                isPaused = true;
                currentState = 'paused';
                changeLEDState('paused');
                updateConfigAccess(); // ← bloqueado en pausa
                setPressed(pauseBtn);

                showConfirmModal({
                    title: 'Descanso largo terminado',
                    message: '¿Quieres iniciar un nuevo Pomodoro?',
                    acceptText: 'Iniciar nuevo',
                    cancelText: 'Descansar por hoy'
                }).then((again) => {
                    isPaused = false;
                    if (again) {
                        const cfg2 = getCurrentConfig();
                        currentState = 'work';
                        currentCycle = 1;
                        totalCycles = cfg2.cycles;
                        remainingTime = cfg2.work * 60;
                        totalTime = cfg2.work * 60;
                        changeLEDState('work');
                        startTimer();
                    } else {
                        stopTimer();
                    }
                });
                return;
            }

            // Fin de trabajo → siguiente fase normal
            setTimeout(() => startNextPhase(), 1000);
        }
    }, 1000);

    startBtn.disabled = true;
    pauseBtn.disabled = false;
    stopBtn.disabled = false;
}


// Función para pausar el timer
// 3) Pausa coherente también para la tecla Space
function pauseTimer() {

    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
        isPaused = true;
        currentState = 'paused';
        changeLEDState('paused');
        updateConfigAccess();
        setPressed(pauseBtn);

        // bloquear config
        if (typeof hideModal === 'function') hideModal();


        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = false;
    }
}




// Función para detener el timer
function stopTimer() {
    if (currentTimer) { clearInterval(currentTimer); currentTimer = null; }
    // reset
    isPaused = false;                 // ← esto arregla tu “parece que puedes pulsar pero no abre”
    currentState = 'idle';
    currentCycle = 0;
    const cfg = getCurrentConfig();
    remainingTime = cfg.work * 60;
    totalTime = cfg.work * 60;
    changeLEDState('idle');
    updateDisplay();

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;

    updateConfigAccess();
    setPressed(null);             // en idle vuelve a habilitarse
}


// Función para mostrar el modal
function showModal() {
    if (configBtn?.disabled) return;
    if (isPaused || currentState === 'paused') return;
    // Cargar valores actuales
    document.getElementById('modal-work').value = document.getElementById('work').value;
    document.getElementById('modal-rest').value = document.getElementById('rest').value;
    document.getElementById('modal-cycles').value = document.getElementById('cycles').value;
    document.getElementById('modal-longbreak').value = document.getElementById('longbreak').value;

    modalBackdrop.style.display = 'block';
    configModal.style.display = 'block';

    // Fade in animation
    setTimeout(() => {
        modalBackdrop.style.opacity = '1';
        configModal.style.opacity = '1';
    }, 10);
}

// Función para ocultar el modal
function hideModal() {
    modalBackdrop.style.display = 'none';
    configModal.style.display = 'none';
}

// Función para guardar configuración
function saveConfig() {
    const work = parseInt(document.getElementById('modal-work').value);
    const rest = parseInt(document.getElementById('modal-rest').value);
    const cycles = parseInt(document.getElementById('modal-cycles').value);
    const longbreak = parseInt(document.getElementById('modal-longbreak').value);

    // Validar valores
    if (work < 1 || rest < 1 || cycles < 1 || longbreak < 1) {
        alert('Todos los valores deben ser mayores que 0');
        return;
    }

    // Guardar en inputs ocultos
    document.getElementById('work').value = work;
    document.getElementById('rest').value = rest;
    document.getElementById('cycles').value = cycles;
    document.getElementById('longbreak').value = longbreak;

    // Actualizar timer si está en estado idle
    if (currentState === 'idle') {
        remainingTime = work * 60;
        totalTime = work * 60;
        updateDisplay();
    }

    hideModal();

    // Mostrar confirmación
    console.log('⚙️ Configuración guardada:', { work, rest, cycles, longbreak });
}

// Event listeners
startBtn.addEventListener('click', startTimer);
configBtn.addEventListener('click', showModal);
configClose.addEventListener('click', hideModal);
configSave.addEventListener('click', saveConfig);
modalBackdrop.addEventListener('click', hideModal);

// Controles de ventana - FUNCIONALES
btnMin.addEventListener('click', () => {
    if (window.electronAPI && window.electronAPI.minimize) {
        window.electronAPI.minimize();
    } else {
        console.log('🔽 Minimizar ventana');
    }
});

btnClose.addEventListener('click', () => {
    // Restaurar LEDs al modo arcoiris antes de cerrar
    changeLEDState('idle');

    if (window.electronAPI && window.electronAPI.close) {
        window.electronAPI.close();
    } else {
        console.log('❌ Cerrar ventana');
        // En desarrollo, al menos detener el timer
        stopTimer();
    }
});

pauseBtn.addEventListener('click', () => {
    // si está corriendo, pausamos
    if (currentTimer && !isPaused) {
        pauseTimer();
        return;
    }
    // si estaba en pausa, reanudamos al último estado real
    if (isPaused) {
        isPaused = false;
        currentState = lastActiveState || 'work';
        changeLEDState(currentState);
        startTimer();                   // ← vuelve a arrancar el interval
        // pauseBtn.textContent = 'Pausa';
    }
});



// Evitar que el modal se cierre al hacer clic dentro de él
configModal.addEventListener('click', (e) => {
    e.stopPropagation();
});

/* Teclas de acceso rápido
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (currentState === 'idle') {
            startTimer();
        } else if (currentTimer) {
            pauseTimer();
        } else {
            startTimer();
        }
    } else if (e.code === 'Escape') {
        if (modalBackdrop.style.display === 'block') {
            hideModal();
        } else {
            stopTimer();
        }
    }
});
*/

// Función para manejar cuando se cierra la aplicación
window.addEventListener('beforeunload', () => {
    // Restaurar LEDs al modo arcoiris
    changeLEDState('idle');
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    updateDisplay();
    pauseBtn.disabled = true;
    stopBtn.disabled = true;

    const devSkipBtn = document.getElementById('dev-skip');
    if (DEV && devSkipBtn) devSkipBtn.classList.add('dev-visible');

    console.log('🚀 Pomodoro RGB iniciado');
});


function confirmStop() {
    const estabaCorriendo = !!currentTimer && !isPaused;

    // congela si estaba en marcha
    if (estabaCorriendo) {
        pauseTimer(); // ya te pone currentState='paused' y ajusta botones
    }

    showConfirmModal({
        title: 'Detener Pomodoro',
        message: 'Se reiniciará todo el progreso.',
        acceptText: 'Detener',
        cancelText: 'Seguir',
        variant: 'danger'
    }).then((ok) => {
        if (ok) {
            stopTimer(); // resetea todo y LEDs a idle
        } else if (estabaCorriendo) {
            // reanuda exactamente donde estabas
            isPaused = false;
            currentState = lastActiveState || 'work';
            changeLEDState(currentState);
            startTimer();
            setPressed(startBtn);
        }
    });
}

stopBtn.removeEventListener('click', stopTimer); // por si quedaba
stopBtn.addEventListener('click', confirmStop);


function devSkipPhase() {
    // corta el interval si estaba corriendo
    if (currentTimer) {
        clearInterval(currentTimer);
        currentTimer = null;
    }

    // Normaliza si estabas en pausa
    if (currentState === 'paused') {
        currentState = lastActiveState || 'work';
    }

    // Caso especial: saltar fin de descanso pide confirmación (como al agotar tiempo)
    if (currentState === 'rest') {
        isPaused = true;
        currentState = 'paused';
        changeLEDState('paused');
        setTimeout(() => {
            alert('⏭️ [DEV] Descanso saltado. Volviendo al trabajo.');
            isPaused = false;
            startNextPhase(); // pasa a 'work'
        }, 0);
        return;
    }

    // Si era longbreak, cierra ciclo entero
    if (currentState === 'longbreak') {
        stopTimer();
        return;
    }

    // Si era trabajo, pasa inmediatamente a descanso / siguiente fase
    if (currentState === 'work') {
        startNextPhase();
        return;
    }

    // Si estabas en idle, no hay fase que saltar
    if (currentState === 'idle') {
        alert('[DEV] No hay fase activa. Dale a Start primero.');
    }
}

function showConfirmModal({ title = 'Confirmación', message = '', acceptText = 'Aceptar', cancelText = 'Cancelar', variant = null } = {}) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        const backdrop = document.getElementById('confirm-backdrop');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const btnOk = document.getElementById('confirm-accept');
        const btnCancel = document.getElementById('confirm-cancel');
        const actions = modal.querySelector('.modal-actions');

        const hasCancel = !!cancelText;

        titleEl.textContent = title;
        msgEl.textContent = message;
        btnOk.textContent = acceptText;
        btnCancel.textContent = cancelText || '';

        // variante visual (danger para Stop)
        btnOk.classList.toggle('danger', variant === 'danger');

        // mostrar/ocultar cancelar
        btnCancel.style.display = hasCancel ? '' : 'none';
        actions.style.gap = hasCancel ? '10px' : '0';
        actions.style.justifyContent = 'center';

        const cleanup = (result) => {
            btnOk.removeEventListener('click', onOk);
            if (hasCancel) {
                btnCancel.removeEventListener('click', onCancel);
                backdrop.removeEventListener('click', onCancel);
            }
            document.removeEventListener('keydown', onKey);
            modal.style.opacity = '0';
            backdrop.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                backdrop.style.display = 'none';
                // reset styles
                btnCancel.style.display = '';
                actions.style.gap = '';
                btnOk.classList.remove('danger');
                resolve(result);
            }, 150);
        };
        const onOk = () => cleanup(true);
        const onCancel = () => cleanup(false);
        const onKey = (e) => {
            if (e.code === 'Escape') { if (hasCancel) { e.preventDefault(); onCancel(); } }
            if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); onOk(); }
        };

        backdrop.style.display = 'block';
        modal.style.display = 'block';
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            backdrop.style.opacity = '1';
            btnOk.focus();
        });

        btnOk.addEventListener('click', onOk);
        if (hasCancel) {
            btnCancel.addEventListener('click', onCancel);
            backdrop.addEventListener('click', onCancel);
        }
        document.addEventListener('keydown', onKey);

        modal.addEventListener('click', (e) => e.stopPropagation());
    });
}

function updateConfigAccess() {
    const shouldDisable = currentState === 'work' || currentState === 'paused';
    if (configBtn) {
        configBtn.disabled = shouldDisable;
    }
    if (shouldDisable) {
        // por si estaba abierto
        if (typeof hideModal === 'function') hideModal();
    }
}

function setPressed(btn) {
    [startBtn, pauseBtn, stopBtn].forEach(b => b?.classList.remove('pressed'));
    if (btn) btn.classList.add('pressed');
}

function updateDisplay() {
    // tiempo
    timerDisplay.textContent = formatTime(remainingTime);

    // ancho: llena en work, vacía en rest/longbreak
    let widthPct;
    if (currentState === 'rest' || currentState === 'longbreak') {
        widthPct = (remainingTime / totalTime) * 100;              // vaciando
    } else {
        widthPct = ((totalTime - remainingTime) / totalTime) * 100; // llenando
    }
    progressFill.style.width = `${Math.max(0, Math.min(100, widthPct))}%`;

    // color por estado (inline para que funcione igual en navegador y Electron)
    if (currentState === 'work') {
        progressFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)'; // verde
    } else if (currentState === 'rest' || currentState === 'longbreak') {
        progressFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
    } else if (currentState === 'paused') {
        progressFill.style.background = '#7f8c8d';                                   // gris
    } else {
        progressFill.style.background = ''; // idle u otros
    }
}
























// botón
const devSkipBtn = document.getElementById('dev-skip');
if (devSkipBtn) devSkipBtn.addEventListener('click', devSkipPhase);

// atajo de teclado: N = Next (solo en DEV)
document.addEventListener('keydown', (e) => {
    if (DEV && e.code === 'KeyN') {
        e.preventDefault();
        devSkipPhase();
    }
});

