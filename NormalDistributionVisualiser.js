class NormalDistributionVisualiser {
    constructor(containerId, props = {}) {
        this.container = document.getElementById(containerId);
        this.props = {
            width: props.width || 1140,
            height: props.height || 570,
            min: props.min || 1,
            max: props.max || 13,
            average: props.average || 7,
            standardDeviation: props.standardDeviation || 2,
            totalRecords: props.totalRecords || 500,
            quartileColors: props.quartileColors || ['rgba(255, 0, 0, 0.2)', 'rgba(0, 255, 0, 0.2)', 'rgba(0, 0, 255, 0.2)', 'rgba(255, 255, 0, 0.2)'],
            curveColor: props.curveColor || 'blue',
            showStats: props.showStats !== undefined ? props.showStats : true,
            showValues: props.showValues !== undefined ? props.showValues : true,
            showQuartiles: props.showQuartiles !== undefined ? props.showQuartiles : true,
            interactive: props.interactive !== undefined ? props.interactive : true
        };

        this.values = {}; // To store calculated values
        this.setupDOM();
        this.setupCanvas();
        this.addEventListeners();
        this.updateGraph();
    }

    setupDOM() {
        this.container.innerHTML = `
            <canvas id="graph" width="${this.props.width}" height="${this.props.height}"></canvas>
            ${this.props.showStats ? '<div id="stats"></div>' : ''}
            ${this.props.showValues ? '<div id="values"></div>' : ''}
            ${this.props.showQuartiles ? '<div id="quartiles"></div>' : ''}
        `;

        this.canvas = this.container.querySelector('#graph');
        this.ctx = this.canvas.getContext('2d');
        this.statsDiv = this.container.querySelector('#stats');
        this.valuesDiv = this.container.querySelector('#values');
        this.quartilesDiv = this.container.querySelector('#quartiles');
    }

    setupCanvas() {
        this.canvas.width = this.props.width * 1.5;
        this.canvas.height = this.props.height * 1.5;
    }

    addEventListeners() {
        if (this.props.interactive) {
            this.canvas.addEventListener('mousedown', this.startDragging.bind(this));
            this.canvas.addEventListener('mousemove', this.drag.bind(this));
            this.canvas.addEventListener('mouseup', this.stopDragging.bind(this));
            this.canvas.addEventListener('mouseleave', this.stopDragging.bind(this));
        }

        window.addEventListener('resize', () => {
            this.canvas.width = this.canvas.offsetWidth;
            this.canvas.height = this.canvas.offsetWidth / 2;
            this.updateGraph();
        });
    }

    normalDistribution(x, mean, stdDev) {
        return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * 
               Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
    }

    normalCDF(x, mean, stdDev) {
        return 0.5 * (1 + this.erf((x - mean) / (stdDev * Math.sqrt(2))));
    }

    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = (x >= 0) ? 1 : -1;
        x = Math.abs(x);

        const t = 1.0/(1.0 + p*x);
        const y = 1.0 - (((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-x*x);

        return sign * y;
    }

    updateGraph() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.calculateValues();
        this.drawAxis();
        this.drawQuartiles();
        this.drawCurve();
        this.drawQuartileBoundaries();

        this.updateValues();
        this.updateStats();
    }

    calculateValues() {
        this.values = {
            average: this.props.average,
            standardDeviation: this.props.standardDeviation,
            numbers: {}
        };

        const q1 = Math.max(this.props.min, Math.min(this.props.max, this.props.average - 0.67448 * this.props.standardDeviation));
        const q2 = this.props.average;
        const q3 = Math.max(this.props.min, Math.min(this.props.max, this.props.average + 0.67448 * this.props.standardDeviation));

        for (let i = this.props.min; i <= this.props.max; i++) {
            const value = Math.round(this.normalDistribution(i, this.props.average, this.props.standardDeviation) * this.props.totalRecords);
            this.values.numbers[i] = {
                value: value,
                quartile: i <= q1 ? 1 : i <= q2 ? 2 : i <= q3 ? 3 : 4
            };
        }

        const quartiles = [
            [this.props.min, q1],
            [q1, q2],
            [q2, q3],
            [q3, this.props.max]
        ];

        this.values.quartiles = quartiles.map(([start, end], index) => {
            const proportion = this.normalCDF(end, this.props.average, this.props.standardDeviation) - this.normalCDF(start, this.props.average, this.props.standardDeviation);
            return {
                start: start,
                end: end,
                value: Math.round(proportion * this.props.totalRecords)
            };
        });
    }

    drawAxis() {
        // Draw x-axis
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.canvas.height - 30);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - 30);
        this.ctx.stroke();
    
        // Draw x-axis labels
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = 'black';
        this.ctx.textAlign = 'centre';
        this.ctx.textBaseline = 'top';
    
        const padding = 20; // Padding on each side
        const availableWidth = this.canvas.width - 2 * padding;
        const range = this.props.max - this.props.min;
    
        for (let i = this.props.min; i <= this.props.max; i++) {
            const x = padding + (i - this.props.min) * availableWidth / range;
            this.ctx.fillText(i.toString(), x, this.canvas.height - 25);
        }
    }

    drawQuartiles() {
        const q1 = Math.max(this.props.min, Math.min(this.props.max, this.props.average - 0.67448 * this.props.standardDeviation));
        const q2 = Math.max(this.props.min, Math.min(this.props.max, this.props.average));
        const q3 = Math.max(this.props.min, Math.min(this.props.max, this.props.average + 0.67448 * this.props.standardDeviation));

        const quartileBoundaries = [q1, q2, q3];
        const maxY = this.normalDistribution(this.props.average, this.props.average, this.props.standardDeviation);

        const padding = 20;
        const availableWidth = this.canvas.width - 2 * padding;
        const range = this.props.max - this.props.min;

        for (let q = 0; q < 4; q++) {
            this.ctx.beginPath();
            const startX = q === 0 ? this.props.min : quartileBoundaries[q - 1];
            const endX = q === 3 ? this.props.max : quartileBoundaries[q];

            for (let i = 0; i <= availableWidth; i++) {
                const x = this.props.min + (i / availableWidth) * range;
                if (x >= startX && x <= endX) {
                    const y = this.normalDistribution(x, this.props.average, this.props.standardDeviation);
                    const canvasY = this.canvas.height - 30 - (y / maxY) * (this.canvas.height - 40);
                    const canvasX = padding + i;
                    if (i === 0 || x === startX) {
                        this.ctx.moveTo(canvasX, canvasY);
                    } else {
                        this.ctx.lineTo(canvasX, canvasY);
                    }
                }
            }

            const endCanvasX = padding + (endX - this.props.min) * availableWidth / range;
            const startCanvasX = padding + (startX - this.props.min) * availableWidth / range;
            this.ctx.lineTo(endCanvasX, this.canvas.height - 30);
            this.ctx.lineTo(startCanvasX, this.canvas.height - 30);
            this.ctx.closePath();
            this.ctx.fillStyle = this.props.quartileColors[q];
            this.ctx.fill();
        }
    }

    drawCurve() {
        const maxY = this.normalDistribution(this.props.average, this.props.average, this.props.standardDeviation);

        const padding = 20;
        const availableWidth = this.canvas.width - 2 * padding;
        const range = this.props.max - this.props.min;

        this.ctx.beginPath();
        let firstPoint = true;
        for (let i = 0; i <= availableWidth; i++) {
            const x = this.props.min + (i / availableWidth) * range;
            if (x >= this.props.min && x <= this.props.max) {
                const y = this.normalDistribution(x, this.props.average, this.props.standardDeviation);
                const canvasY = this.canvas.height - 30 - (y / maxY) * (this.canvas.height - 40);
                const canvasX = padding + i;
                if (firstPoint) {
                    this.ctx.moveTo(canvasX, canvasY);
                    firstPoint = false;
                } else {
                    this.ctx.lineTo(canvasX, canvasY);
                }
            }
        }
        this.ctx.strokeStyle = this.props.curveColor;
        this.ctx.stroke();
    }

    drawQuartileBoundaries() {
        const q1 = Math.max(this.props.min, Math.min(this.props.max, this.props.average - 0.67448 * this.props.standardDeviation));
        const q2 = Math.max(this.props.min, Math.min(this.props.max, this.props.average));
        const q3 = Math.max(this.props.min, Math.min(this.props.max, this.props.average + 0.67448 * this.props.standardDeviation));

        const quartileBoundaries = [q1, q2, q3];

        const padding = 20;
        const availableWidth = this.canvas.width - 2 * padding;
        const range = this.props.max - this.props.min;

        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.setLineDash([5, 5]);
        quartileBoundaries.forEach(boundary => {
            if (boundary >= this.props.min && boundary <= this.props.max) {
                const x = padding + (boundary - this.props.min) * availableWidth / range;
                this.ctx.beginPath();
                this.ctx.moveTo(x, 0);
                this.ctx.lineTo(x, this.canvas.height - 30);
                this.ctx.stroke();
            }
        });
        this.ctx.setLineDash([]);
    }

    updateValues() {
        if (!this.props.showValues && !this.props.showQuartiles) return;

        if (this.props.showValues) {
            const values = Object.entries(this.values.numbers).map(([number, data]) => 
                `<div class="value-box">${number}: ${data.value}</div>`
            );
            this.valuesDiv.innerHTML = values.join('');
        }

        if (this.props.showQuartiles) {
            this.quartilesDiv.innerHTML = this.values.quartiles.map((q, i) => 
                `<div class="value-box" style="background-color:${this.props.quartileColors[i]}">Q${i+1}: ${q.value}</div>`
            ).join('');
        }
    }

    updateStats() {
        if (this.props.showStats) {
            this.statsDiv.textContent = `Average: ${this.values.average.toFixed(2)}, Standard Deviation: ${this.values.standardDeviation.toFixed(2)}`;
        }
    }

    startDragging(e) {
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;

        // Adjust average (horizontal drag)
        this.props.average = Math.max(this.props.min, Math.min(this.props.max, this.props.average + dx * 0.02));

        // Adjust standard deviation (vertical drag)
        this.props.standardDeviation = Math.max(0.5, Math.min((this.props.max - this.props.min) / 2, this.props.standardDeviation + dy * 0.01));

        this.lastX = e.clientX;
        this.lastY = e.clientY;

        this.updateGraph();
    }

    stopDragging() {
        this.isDragging = false;
    }

    // New method to get all calculated values
    getValues() {
        return this.values;
    }
}