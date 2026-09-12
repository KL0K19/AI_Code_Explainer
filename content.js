(function () {
    const browserAPI = typeof browser !== "undefined" ? browser : chrome;

    let overlay = null;
    let startX = 0;
    let startY = 0;
    let selectionBox = null;

    browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "START_SELECTION") {
            startSelectionMode();
        } else if (request.action === "SHOW_RESULT") {
            showResultModal(request.text);
        }
    });


    function startSelectionMode() {
        if (overlay) return;

        overlay = document.createElement('div');
        overlay.id = "ai-screen-capture-overlay";
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '2147483646',
            cursor: 'crosshair',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            userSelect: 'none'
        });

        selectionBox = document.createElement('div');
        Object.assign(selectionBox.style, {
            position: 'absolute',
            border: '2px dashed #00b4d8',
            backgroundColor: 'rgba(0, 180, 216, 0.15)',
            display: 'none',
            pointerEvents: 'none'
        });

        overlay.appendChild(selectionBox);
        document.body.appendChild(overlay);

        overlay.addEventListener('mousedown', onMouseDown);
        window.addEventListener('keydown', onKeyDown);
    }

    function onMouseDown(e) {
        startX = e.clientX;
        startY = e.clientY;

        selectionBox.style.left = startX + 'px';
        selectionBox.style.top = startY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';

        overlay.addEventListener('mousemove', onMouseMove);
        overlay.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
        const currentX = e.clientX;
        const currentY = e.clientY;

        const left = Math.min(startX, currentX);
        const top = Math.min(startY, currentY);
        const width = Math.abs(currentX - startX);
        const height = Math.abs(currentY - startY);

        selectionBox.style.left = left + 'px';
        selectionBox.style.top = top + 'px';
        selectionBox.style.width = width + 'px';
        selectionBox.style.height = height + 'px';
    }

    function onMouseUp(e) {
        overlay.removeEventListener('mousemove', onMouseMove);
        overlay.removeEventListener('mouseup', onMouseUp);

        const rect = selectionBox.getBoundingClientRect();
        removeSelectionMode();

        if (rect.width > 20 && rect.height > 20) {
            browserAPI.runtime.sendMessage({
                action: "CAPTURE_AREA",
                coords: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    pixelRatio: window.devicePixelRatio || 1
                }
            });
        }
    }

    function onKeyDown(e) {
        if (e.key === "Escape") {
            removeSelectionMode();
            browserAPI.runtime.sendMessage({ action: "CANCEL_REQUEST" });
        }
    }

    function removeSelectionMode() {
        window.removeEventListener('keydown', onKeyDown);
        if (overlay) {
            overlay.remove();
            overlay = null;
            selectionBox = null;
        }
    }

    function formatMarkdown(text) {
        if (!text) return "";


        let safe = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        safe = safe.replace(/```[a-zA-Z]*\n?([\s\S]*?)```/g, '<pre style="background: #12151a; border: 1px solid #2d333b; border-radius: 6px; padding: 10px; margin: 8px 0; overflow-x: auto; color: #adbac7;"><code>$1</code></pre>');

        safe = safe.replace(/`([^`\n]+)`/g, '<span style="background: #1f242d; color: #58a6ff; padding: 2px 6px; border-radius: 4px; border: 1px solid #2d333b; font-family: Consolas, \'Fira Code\', monospace; font-size: 12px; display: inline-block;">$1</span>');

        safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: #ffffff; font-weight: 600;">$1</strong>');

        return safe;
    }

    function showResultModal(text) {
        let modal = document.getElementById('ai-code-modal');

        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'ai-code-modal';
            Object.assign(modal.style, {
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                width: '500px',
                height: '420px',
                minWidth: '320px',
                minHeight: '200px',
                backgroundColor: '#181818',
                color: '#e5e5e5',
                borderRadius: '8px',
                boxShadow: '0 12px 36px rgba(0,0,0,0.65)',
                border: '1px solid #333333',
                zIndex: '2147483647',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: '13px',
                lineHeight: '1.6',
                overflow: 'hidden',
                boxSizing: 'border-box'
            });

            const header = document.createElement('div');
            Object.assign(header.style, {
                padding: '10px 14px',
                backgroundColor: '#202020',
                borderBottom: '1px solid #2e2e2e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontWeight: '600',
                fontSize: '13px',
                color: '#ffffff',
                cursor: 'grab',
                userSelect: 'none',
                flexShrink: '0'
            });
            header.innerText = 'AI Code Explainer';

            const closeBtn = document.createElement('span');
            closeBtn.innerText = '✕';
            Object.assign(closeBtn.style, {
                cursor: 'pointer',
                color: '#888',
                fontSize: '14px',
                padding: '2px 6px'
            });
            closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
            closeBtn.onmouseout = () => closeBtn.style.color = '#888';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                modal.remove();
                browserAPI.runtime.sendMessage({ action: "CANCEL_REQUEST" });
            };

            header.appendChild(closeBtn);

            header.addEventListener('mousedown', (e) => {
                if (e.target === closeBtn) return;
                e.preventDefault();

                header.style.cursor = 'grabbing';
                const rect = modal.getBoundingClientRect();

                modal.style.bottom = 'auto';
                modal.style.right = 'auto';
                modal.style.top = rect.top + 'px';
                modal.style.left = rect.left + 'px';

                const shiftX = e.clientX - rect.left;
                const shiftY = e.clientY - rect.top;

                function onMouseMove(moveEvent) {
                    let newX = moveEvent.clientX - shiftX;
                    let newY = moveEvent.clientY - shiftY;

                    const maxX = window.innerWidth - modal.offsetWidth;
                    const maxY = window.innerHeight - modal.offsetHeight;

                    newX = Math.max(0, Math.min(newX, maxX));
                    newY = Math.max(0, Math.min(newY, maxY));

                    modal.style.left = newX + 'px';
                    modal.style.top = newY + 'px';
                }

                function onMouseUp() {
                    header.style.cursor = 'grab';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });

            const content = document.createElement('div');
            content.id = 'ai-code-modal-content';
            Object.assign(content.style, {
                padding: '14px',
                flex: '1',
                minHeight: '0',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'Consolas, "Fira Code", monospace',
                fontSize: '12.5px',
                color: '#d4d4d4'
            });

            modal.appendChild(header);
            modal.appendChild(content);

            setupWindowResizers(modal);

            document.body.appendChild(modal);
        }

        const contentEl = modal.querySelector('#ai-code-modal-content');
        if (contentEl) {
            contentEl.innerHTML = formatMarkdown(text);
            contentEl.scrollTop = contentEl.scrollHeight;
        }
    }

    function setupWindowResizers(modal) {
        const directions = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

        directions.forEach(dir => {
            const resizer = document.createElement('div');
            resizer.style.position = 'absolute';
            resizer.style.zIndex = '2147483648';

            const thickness = 6;
            const cornerSize = 12;

            if (dir === 'e') {
                Object.assign(resizer.style, { right: '0', top: '0', bottom: '0', width: `${thickness}px`, cursor: 'ew-resize' });
            } else if (dir === 'w') {
                Object.assign(resizer.style, { left: '0', top: '0', bottom: '0', width: `${thickness}px`, cursor: 'ew-resize' });
            } else if (dir === 's') {
                Object.assign(resizer.style, { bottom: '0', left: '0', right: '0', height: `${thickness}px`, cursor: 'ns-resize' });
            } else if (dir === 'n') {
                Object.assign(resizer.style, { top: '0', left: '0', right: '0', height: `${thickness}px`, cursor: 'ns-resize' });
            } else if (dir === 'se') {
                Object.assign(resizer.style, { right: '0', bottom: '0', width: `${cornerSize}px`, height: `${cornerSize}px`, cursor: 'se-resize' });
            } else if (dir === 'sw') {
                Object.assign(resizer.style, { left: '0', bottom: '0', width: `${cornerSize}px`, height: `${cornerSize}px`, cursor: 'sw-resize' });
            } else if (dir === 'ne') {
                Object.assign(resizer.style, { right: '0', top: '0', width: `${cornerSize}px`, height: `${cornerSize}px`, cursor: 'ne-resize' });
            } else if (dir === 'nw') {
                Object.assign(resizer.style, { left: '0', top: '0', width: `${cornerSize}px`, height: `${cornerSize}px`, cursor: 'nw-resize' });
            }

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const startX = e.clientX;
                const startY = e.clientY;
                const rect = modal.getBoundingClientRect();

                modal.style.bottom = 'auto';
                modal.style.right = 'auto';
                modal.style.top = rect.top + 'px';
                modal.style.left = rect.left + 'px';

                function doResize(moveEvent) {
                    const dx = moveEvent.clientX - startX;
                    const dy = moveEvent.clientY - startY;

                    if (dir.includes('e')) {
                        const newW = Math.max(320, rect.width + dx);
                        modal.style.width = newW + 'px';
                    }
                    if (dir.includes('w')) {
                        const newW = Math.max(320, rect.width - dx);
                        if (newW > 320) {
                            modal.style.width = newW + 'px';
                            modal.style.left = (rect.left + dx) + 'px';
                        }
                    }
                    if (dir.includes('s')) {
                        const newH = Math.max(200, rect.height + dy);
                        modal.style.height = newH + 'px';
                    }
                    if (dir.includes('n')) {
                        const newH = Math.max(200, rect.height - dy);
                        if (newH > 200) {
                            modal.style.height = newH + 'px';
                            modal.style.top = (rect.top + dy) + 'px';
                        }
                    }
                }

                function stopResize() {
                    document.removeEventListener('mousemove', doResize);
                    document.removeEventListener('mouseup', stopResize);
                }

                document.addEventListener('mousemove', doResize);
                document.addEventListener('mouseup', stopResize);
            });

            modal.appendChild(resizer);
        });
    }
})();
