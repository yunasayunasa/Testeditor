/**
 * AnimationTimeline.js
 * Manages the animation timeline UI, keyframe editing, and playback controls
 */

export default class AnimationTimeline {
    constructor(game, editorUI) {
        this.game = game;
        this.editorUI = editorUI;
        
        // UI Elements
        this.container = document.getElementById('timeline-container');
        this.canvas = document.getElementById('timeline-canvas');
        this.ctx = this.canvas?.getContext('2d');
        this.tracksContainer = document.getElementById('timeline-tracks');
        
        // Controls
        this.playBtn = document.getElementById('anim-play-btn');
        this.pauseBtn = document.getElementById('anim-pause-btn');
        this.stopBtn = document.getElementById('anim-stop-btn');
        this.loopCheckbox = document.getElementById('anim-loop-checkbox');
        this.currentTimeDisplay = document.getElementById('anim-current-time');
        this.totalDurationDisplay = document.getElementById('anim-total-duration');
        
        // Timeline state
        this.selectedObject = null;
        this.currentTime = 0;
        this.duration = 5.0; // Default 5 seconds
        this.zoom = 100; // pixels per second
        this.scrollOffset = 0;
        this.isPlaying = false;
        this.animationType = 'basic'; // 'basic', 'spritesheet', 'path'
        
        // Animation data
        this.tracks = {
            x: [],
            y: [],
            scaleX: [],
            scaleY: [],
            rotation: [],
            alpha: []
        };
        
        // Playback
        this.playbackStartTime = 0;
        this.animationFrameId = null;
        
        this.initializeEventListeners();
        this.resizeCanvas();
    }
    
    initializeEventListeners() {
        if (this.playBtn) {
            this.playBtn.addEventListener('click', () => this.play());
        }
        if (this.pauseBtn) {
            this.pauseBtn.addEventListener('click', () => this.pause());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stop());
        }
        
        // Animation type tabs
        document.querySelectorAll('.anim-type-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.anim-type-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.animationType = e.target.dataset.type;
                this.rebuild();
            });
        });
        
        // Canvas interactions
        if (this.canvas) {
            this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));
            this.canvas.addEventListener('mousemove', (e) => this.onCanvasHover(e));
        }
        
        // Resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    resizeCanvas() {
        if (!this.canvas || !this.container) return;
        
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = 200; // Fixed height for timeline
        
        this.draw();
    }
    
    setSelectedObject(gameObject) {
        this.selectedObject = gameObject;
        this.loadAnimationData();
        this.rebuild();
    }
    
    loadAnimationData() {
        if (!this.selectedObject) {
            this.tracks = { x: [], y: [], scaleX: [], scaleY: [], rotation: [], alpha: [] };
            return;
        }
        
        // Load from object's data
        const animData = this.selectedObject.getData('animation');
        if (animData && animData.tracks) {
            this.tracks = animData.tracks;
            this.duration = animData.duration || 5.0;
        } else {
            // Initialize with current values as first keyframe
            this.tracks = {
                x: [{ time: 0, value: this.selectedObject.x }],
                y: [{ time: 0, value: this.selectedObject.y }],
                scaleX: [{ time: 0, value: this.selectedObject.scaleX }],
                scaleY: [{ time: 0, value: this.selectedObject.scaleY }],
                rotation: [{ time: 0, value: this.selectedObject.rotation }],
                alpha: [{ time: 0, value: this.selectedObject.alpha }]
            };
        }
    }
    
    saveAnimationData() {
        if (!this.selectedObject) return;
        
        this.selectedObject.setData('animation', {
            duration: this.duration,
            loop: this.loopCheckbox?.checked || false,
            easing: 'linear',
            tracks: this.tracks
        });
    }
    
    rebuild() {
        this.buildTracks();
        this.draw();
        this.updateTimeDisplay();
    }
    
    buildTracks() {
        if (!this.tracksContainer) return;
        
        this.tracksContainer.innerHTML = '';
        
        if (this.animationType === 'basic') {
            const trackNames = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'alpha'];
            trackNames.forEach(name => {
                const trackDiv = document.createElement('div');
                trackDiv.className = 'timeline-track';
                trackDiv.innerHTML = `<span class="track-name">${name}</span>`;
                this.tracksContainer.appendChild(trackDiv);
            });
        }
    }
    
    draw() {
        if (!this.ctx) return;
        
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);
        
        // Background
        this.ctx.fillStyle = '#1e1e1e';
        this.ctx.fillRect(0, 0, width, height);
        
        // Time ruler
        this.drawTimeRuler();
        
        // Playhead
        this.drawPlayhead();
        
        // Keyframes
        if (this.animationType === 'basic') {
            this.drawKeyframes();
        }
    }
    
    drawTimeRuler() {
        const { width, height } = this.canvas;
        this.ctx.strokeStyle = '#444';
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px Arial';
        
        // Draw time marks
        const step = 1.0; // 1 second intervals
        for (let t = 0; t <= this.duration; t += step) {
            const x = this.timeToX(t);
            if (x < 0 || x > width) continue;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
            this.ctx.stroke();
            
            this.ctx.fillText(t.toFixed(1) + 's', x + 2, 12);
        }
    }
    
    drawPlayhead() {
        const x = this.timeToX(this.currentTime);
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.lineWidth = 1;
    }
    
    drawKeyframes() {
        const trackNames = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'alpha'];
        const trackHeight = this.canvas.height / trackNames.length;
        
        trackNames.forEach((trackName, index) => {
            const y = index * trackHeight + trackHeight / 2;
            const keyframes = this.tracks[trackName] || [];
            
            keyframes.forEach(kf => {
                const x = this.timeToX(kf.time);
                
                // Draw diamond keyframe
                this.ctx.fillStyle = '#4fc3f7';
                this.ctx.beginPath();
                this.ctx.moveTo(x, y - 5);
                this.ctx.lineTo(x + 5, y);
                this.ctx.lineTo(x, y + 5);
                this.ctx.lineTo(x - 5, y);
                this.ctx.closePath();
                this.ctx.fill();
            });
        });
    }
    
    timeToX(time) {
        return time * this.zoom - this.scrollOffset;
    }
    
    xToTime(x) {
        return (x + this.scrollOffset) / this.zoom;
    }
    
    onCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const time = this.xToTime(x);
        
        if (this.animationType === 'basic') {
            // Determine which track was clicked
            const trackNames = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'alpha'];
            const trackHeight = this.canvas.height / trackNames.length;
            const trackIndex = Math.floor(y / trackHeight);
            
            if (trackIndex >= 0 && trackIndex < trackNames.length) {
                const trackName = trackNames[trackIndex];
                this.addKeyframe(trackName, time);
            }
        }
    }
    
    onCanvasHover(e) {
        // TODO: Show tooltip for keyframe values
    }
    
    addKeyframe(trackName, time) {
        if (!this.selectedObject) return;
        
        // Get current value from object
        let value = this.selectedObject[trackName];
        if (value === undefined) {
            console.warn(`Property ${trackName} not found on object`);
            return;
        }
        
        // Add to track
        const track = this.tracks[trackName];
        track.push({ time: Math.max(0, time), value });
        track.sort((a, b) => a.time - b.time);
        
        this.saveAnimationData();
        this.draw();
        
        console.log(`Added keyframe: ${trackName} = ${value} at ${time.toFixed(2)}s`);
    }
    
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.playbackStartTime = performance.now() - (this.currentTime * 1000);
        this.updatePlayback();
    }
    
    pause() {
        this.isPlaying = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    stop() {
        this.pause();
        this.currentTime = 0;
        this.draw();
        this.updateTimeDisplay();
        this.applyAnimationAtTime(0);
    }
    
    updatePlayback() {
        if (!this.isPlaying) return;
        
        const elapsed = (performance.now() - this.playbackStartTime) / 1000;
        this.currentTime = elapsed;
        
        if (this.currentTime >= this.duration) {
            if (this.loopCheckbox?.checked) {
                this.currentTime = 0;
                this.playbackStartTime = performance.now();
            } else {
                this.stop();
                return;
            }
        }
        
        this.applyAnimationAtTime(this.currentTime);
        this.draw();
        this.updateTimeDisplay();
        
        this.animationFrameId = requestAnimationFrame(() => this.updatePlayback());
    }
    
    applyAnimationAtTime(time) {
        if (!this.selectedObject) return;
        
        const trackNames = ['x', 'y', 'scaleX', 'scaleY', 'rotation', 'alpha'];
        
        trackNames.forEach(trackName => {
            const track = this.tracks[trackName];
            if (!track || track.length === 0) return;
            
            const value = this.interpolateTrack(track, time);
            this.selectedObject[trackName] = value;
        });
    }
    
    interpolateTrack(track, time) {
        if (track.length === 0) return 0;
        if (track.length === 1) return track[0].value;
        
        // Find surrounding keyframes
        let before = track[0];
        let after = track[track.length - 1];
        
        for (let i = 0; i < track.length - 1; i++) {
            if (track[i].time <= time && track[i + 1].time >= time) {
                before = track[i];
                after = track[i + 1];
                break;
            }
        }
        
        if (before.time === after.time) return before.value;
        
        // Linear interpolation
        const t = (time - before.time) / (after.time - before.time);
        return before.value + (after.value - before.value) * t;
    }
    
    updateTimeDisplay() {
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = this.currentTime.toFixed(2);
        }
        if (this.totalDurationDisplay) {
            this.totalDurationDisplay.textContent = this.duration.toFixed(2);
        }
    }
}
