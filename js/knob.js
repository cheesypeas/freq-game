/**
 * Simple DAW-style rotary knob that syncs with a hidden range input.
 * - Drag to rotate (vertical or circular)
 * - Click to focus, arrow keys to fine adjust
 * - Emits 'input' on the backing range input for compatibility
 */
(function() {
    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function createKnob(elementId, backingInputId) {
        const knob = document.getElementById(elementId);
        const input = document.getElementById(backingInputId);
        if (!knob || !input) return;

        // Internal state
        let isDragging = false;
        let startY = 0;
        let startValue = 50;

        // Ensure initial value
        if (input.value === '') input.value = '50';
        startValue = parseFloat(input.value);
        render(startValue);

        function render(v) {
            const percent = (v - parseFloat(input.min)) / (parseFloat(input.max) - parseFloat(input.min));
            const angle = -135 + percent * 270; // from -135deg to +135deg
            knob.style.setProperty('--knob-rotation', angle + 'deg');
            knob.setAttribute('aria-valuenow', String(Math.round(v)));
        }

        function commit(v) {
            const value = clamp(v, parseFloat(input.min), parseFloat(input.max));
            input.value = String(value);
            render(value);
            // Dispatch input event so existing listeners react
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }

        knob.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startValue = parseFloat(input.value || '50');
            knob.classList.add('dragging');
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const deltaY = startY - e.clientY; // up increases
            // Sensitivity factor: 200px for full sweep
            const range = parseFloat(input.max) - parseFloat(input.min);
            const value = startValue + (deltaY / 200) * range;
            commit(value);
        });

        window.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            knob.classList.remove('dragging');
        });

        // Touch support
        knob.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            if (!t) return;
            isDragging = true;
            startY = t.clientY;
            startValue = parseFloat(input.value || '50');
            knob.classList.add('dragging');
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            if (!t) return;
            const deltaY = startY - t.clientY;
            const range = parseFloat(input.max) - parseFloat(input.min);
            const value = startValue + (deltaY / 200) * range;
            commit(value);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            knob.classList.remove('dragging');
        });

        // Keyboard support for accessibility
        knob.addEventListener('keydown', (e) => {
            const step = parseFloat(input.step || '1');
            const range = parseFloat(input.max) - parseFloat(input.min);
            const fine = range / 100; // fine step with Shift
            let delta = 0;
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowRight':
                    delta = e.shiftKey ? fine : step; break;
                case 'ArrowDown':
                case 'ArrowLeft':
                    delta = e.shiftKey ? -fine : -step; break;
                case 'Home':
                    commit(parseFloat(input.min)); return;
                case 'End':
                    commit(parseFloat(input.max)); return;
                default: return;
            }
            e.preventDefault();
            commit(parseFloat(input.value) + delta);
        });

        // Sync knob if slider is changed externally
        input.addEventListener('input', () => {
            render(parseFloat(input.value));
        });

        // Initialize on DOM ready (in case script loads before DOM)
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => render(parseFloat(input.value)));
        }
    }

    // Initialize default knob used by the app
    document.addEventListener('DOMContentLoaded', () => {
        createKnob('parameter-knob', 'parameter-slider');
        const led = document.getElementById('power-led');
        if (led) {
            // Light the LED once the app is interactive
            requestAnimationFrame(() => led.classList.add('on'));
        }
    });
})();

