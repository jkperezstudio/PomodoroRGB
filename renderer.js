const fmt = s => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
};

window.addEventListener('DOMContentLoaded', () => {
    const elWork = document.getElementById('work');
    const elRest = document.getElementById('rest');
    const elStart = document.getElementById('start');
    const elPause = document.getElementById('pause');
    const elStop = document.getElementById('stop');
    const elState = document.getElementById('state');
    const elRem = document.getElementById('remaining');
    const elCycles = document.getElementById('cycles');
    const elLongBreak = document.getElementById('longbreak');

    let phase = 'idle';         // idle | work | break | paused
    let remaining = 0;
    let timerId = null;
    let workSec = 0, restSec = 0;
    let completedWork = 0;
    let shortsBeforeLong = 3;          // se actualizará desde el input
    let longBreakSec = 15 * 60;        // se actualizará desde el input

    const tick = () => {
        if (phase === 'paused') return;
        remaining -= 1;
        elRem.textContent = fmt(remaining);

        if (remaining <= 0) {
            if (phase === 'work') {
                completedWork += 1;
                startNextBreak();
            } else if (phase === 'break' || phase === 'longbreak') {
                alert("Descanso terminado. Empezamos el siguiente foco.");
                startWork();
            }

        }
    };


    const startWork = () => {
        phase = 'work'; remaining = workSec;
        elState.textContent = 'work'; elRem.textContent = fmt(remaining);
        window.rgb.action('work');
        clearInterval(timerId); timerId = setInterval(tick, 1000);
    };


    const startShortBreak = () => {
        phase = 'break'; remaining = restSec;
        elState.textContent = 'break'; elRem.textContent = fmt(remaining);
        window.rgb.action('break');
    };

    const startLongBreak = () => {
        phase = 'longbreak'; remaining = longBreakSec;
        elState.textContent = 'longbreak'; elRem.textContent = fmt(remaining);
        window.rgb.action('break'); // mismo color verde por ahora
    };

    const startNextBreak = () => {
        if ((completedWork % shortsBeforeLong) === 0) startLongBreak();
        else startShortBreak();
    };


    const finishAll = () => {
        clearInterval(timerId); timerId = null;
        phase = 'idle'; elState.textContent = 'idle'; elRem.textContent = '00:00';
        completedWork = 0;
        window.rgb.action('restore');
        elStart.disabled = false;
        elWork.disabled = false;
        elRest.disabled = false;
        elCycles.disabled = false;
        elLongBreak.disabled = false;
    };



    elStart.addEventListener('click', () => {
        elStart.disabled = true;
        elWork.disabled = true;
        elRest.disabled = true;
        elCycles.disabled = true;
        elLongBreak.disabled = true;

        /*        workSec = Math.max(1, parseInt(elWork.value, 10)) * 60;
        restSec = Math.max(1, parseInt(elRest.value, 10)) * 60;
        shortsBeforeLong = Math.max(1, parseInt(elCycles.value, 10));
        longBreakSec = Math.max(1, parseInt(elLongBreak.value, 10)) * 60;
        */

        //Test segundos
        workSec = Math.max(1, parseInt(elWork.value, 10));
        restSec = Math.max(1, parseInt(elRest.value, 10));
        shortsBeforeLong = Math.max(1, parseInt(elCycles.value, 10));
        longBreakSec = Math.max(1, parseInt(elLongBreak.value, 10));

        startWork();
    });


    elPause.addEventListener('click', () => {
        if (phase === 'paused') {
            // reanudar
            if (elState.textContent === 'paused-work') phase = 'work';
            else if (elState.textContent === 'paused-longbreak') phase = 'longbreak';
            else phase = 'break';

            elState.textContent = phase;
            window.rgb.action(phase === 'work' ? 'work' : 'break');
        } else if (phase === 'work' || phase === 'break' || phase === 'longbreak') {
            // pausar
            phase = 'paused';
            elState.textContent = 'paused-' + elState.textContent;
            window.rgb.action('pause');
        }

    });


    elStop.addEventListener('click', () => {
        const confirmed = confirm("¿Seguro que quieres detener el Pomodoro? Se perderá el progreso.");
        if (confirmed) {
            finishAll();
        }
    });
});
