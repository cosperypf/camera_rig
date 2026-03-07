/**
 * Main Entry Point
 */

function showError(msg) {
    const el = document.getElementById('error-message');
    if (el) {
        el.textContent = 'Error: ' + msg;
        el.style.display = 'block';
    }
    console.error(msg);
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded');
    
    const container = document.getElementById('canvas-container');
    if (!container) {
        showError('Canvas container not found');
        return;
    }
    
    if (typeof THREE === 'undefined') {
        showError('Three.js not loaded. Check your internet connection.');
        return;
    }
    
    try {
        const parser = new CameraRigParser();
        console.log('Parser created');
        
        const visualizer = new CameraRigVisualizer(container);
        console.log('Visualizer created');
        
        const ui = new UIController(visualizer, parser);
        console.log('UI created');
        
        window.visualizer = visualizer;
        window.parser = parser;
        window.ui = ui;
        
        console.log('Initialization complete');
    } catch (err) {
        showError(err.message);
    }
});
