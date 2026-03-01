// DAG Visualization module using D3.js
class DAGVisualization {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.showLabels = false;
        this.currentTransform = d3.zoomIdentity;
        
        this.initSVG();
        this.initForceSimulation();
    }
    
    initSVG() {
        // Create SVG element
        this.svg = d3.select(this.container)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', [0, 0, this.width, this.height]);
        
        // Add zoom behavior and store it for later use
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.currentTransform = event.transform;
                this.g.attr('transform', event.transform);
            });
        
        this.svg.call(this.zoom);
        
        // Create main group for graph elements
        this.g = this.svg.append('g');
        
        // Create groups for links and nodes
        this.linkGroup = this.g.append('g').attr('class', 'links');
        this.nodeGroup = this.g.append('g').attr('class', 'nodes');
        this.labelGroup = this.g.append('g').attr('class', 'labels');
    }
    
    initForceSimulation() {
        this.simulation = d3.forceSimulation()
            .force('link', d3.forceLink().id(d => d.id).distance(100))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(20));
    }

    /** Clear all rendered elements (chart, peers, DAG) so modes don't leak into each other */
    clearAll() {
        this.simulation.stop();
        this.linkGroup.selectAll('*').remove();
        this.nodeGroup.selectAll('*').remove();
        this.labelGroup.selectAll('*').remove();
        // Remove world map background
        this.g.selectAll('rect.ocean-bg').remove();
        // Remove chart-specific gradient def (keeps arrowhead marker)
        this.svg.selectAll('defs #price-gradient').remove();
    }

    update(data) {
        if (!data || !data.nodes || !data.links) return;
        
        // In demo mode, cap displayed nodes to 100
const cap = CONFIG.DEMO_MODE ? 111 : CONFIG.MAX_NODES;
        if (data.nodes.length > cap) {
            data.nodes = data.nodes.slice(0, cap);
            const nodeIds = new Set(data.nodes.map(n => n.id));
            data.links = data.links.filter(l => {
                const src = l.source.id || l.source;
                const tgt = l.target.id || l.target;
                return nodeIds.has(src) && nodeIds.has(tgt);
            });
        }

        this.clearAll();
        console.log('📊 Visualization update:', data.nodes.length, 'nodes,', data.links.length, 'links');
        
        // Deep clone the data to prevent D3 from mutating the original
        const clonedData = {
            nodes: data.nodes.map(n => ({...n})),
            links: data.links.map(l => ({...l}))
        };
        
        console.log('✓ Data cloned successfully');
        
        // Update links
        const link = this.linkGroup
            .selectAll('line')
            .data(clonedData.links, d => `${d.source.id || d.source}-${d.target.id || d.target}`);
        
        link.exit().remove();
        
        const linkEnter = link.enter()
            .append('line')
            .attr('stroke', CONFIG.COLORS.LINK)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', 2)
            .attr('marker-end', 'url(#arrowhead)');
        
        const linkMerge = linkEnter.merge(link);
        
        // Update nodes
        const node = this.nodeGroup
            .selectAll('circle')
            .data(clonedData.nodes, d => d.id);
        
        node.exit().remove();
        
        const nodeEnter = node.enter()
            .append('circle')
            .attr('r', CONFIG.NODE_RADIUS)
            .attr('fill', d => this.getNodeColor(d.state))
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .call(this.drag())
            .on('click', (event, d) => this.onNodeClick(d))
            .on('mouseover', (event, d) => this.onNodeHover(event, d))
            .on('mouseout', () => this.onNodeOut());
        
        const nodeMerge = nodeEnter.merge(node);
        
        // Update node colors
        nodeMerge.attr('fill', d => this.getNodeColor(d.state));
        
        // Update labels if enabled
        if (this.showLabels) {
            this.updateLabels(clonedData.nodes);
        }
        
        // Ensure arrow marker definition exists (price chart also uses <defs>)
        let defs = this.svg.select('defs');
        if (!defs.node()) defs = this.svg.append('defs');

        if (!defs.select('#arrowhead').node()) {
            defs.append('marker')
                .attr('id', 'arrowhead')
                .attr('viewBox', '-0 -5 10 10')
                .attr('refX', 20)
                .attr('refY', 0)
                .attr('orient', 'auto')
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .append('path')
                .attr('d', 'M 0,-5 L 10,0 L 0,5')
                .attr('fill', CONFIG.COLORS.LINK);
        }
        
        // Update and restart simulation
        this.simulation
            .nodes(clonedData.nodes)
            .on('tick', () => {
                linkMerge
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                nodeMerge
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);
                
                if (this.showLabels) {
                    this.labelGroup.selectAll('text')
                        .attr('x', d => d.x + 12)
                        .attr('y', d => d.y + 4);
                }
            });
        
        this.simulation.force('link').links(clonedData.links);
        this.simulation.alpha(1).restart();
    }
    
    updateLabels(nodes) {
        const label = this.labelGroup
            .selectAll('text')
            .data(nodes, d => d.id);
        
        label.exit().remove();
        
        label.enter()
            .append('text')
            .attr('font-size', '10px')
            .attr('fill', '#fff')
            .attr('pointer-events', 'none')
            .text(d => d.id.substring(0, 8));
    }
    
    getNodeColor(state) {
        switch(state) {
            case CONFIG.TX_STATE.CONFIRMED:
                return CONFIG.COLORS.CONFIRMED;
            case CONFIG.TX_STATE.HIBERNATING:
                return CONFIG.COLORS.HIBERNATING;
            case CONFIG.TX_STATE.PENDING:
            default:
                return CONFIG.COLORS.PENDING;
        }
    }
    
    drag() {
        return d3.drag()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }
    
    onNodeClick(node) {
        // Dispatch custom event for node selection
        const event = new CustomEvent('nodeSelected', { detail: node });
        document.dispatchEvent(event);
    }
    
    onNodeHover(event, node) {
        d3.select(event.currentTarget)
            .transition()
            .duration(200)
            .attr('r', CONFIG.NODE_RADIUS * 1.5)
            .attr('stroke-width', 3);
    }
    
    onNodeOut() {
        this.nodeGroup.selectAll('circle')
            .transition()
            .duration(200)
            .attr('r', CONFIG.NODE_RADIUS)
            .attr('stroke-width', 2);
    }
    
    toggleLabels() {
        this.showLabels = !this.showLabels;
        if (this.showLabels) {
            this.updateLabels(this.simulation.nodes());
        } else {
            this.labelGroup.selectAll('text').remove();
        }
    }
    
    zoomIn() {
        this.svg.transition().duration(300).call(
            this.zoom.scaleBy,
            1.3
        );
    }
    
    zoomOut() {
        this.svg.transition().duration(300).call(
            this.zoom.scaleBy,
            0.7
        );
    }
    
    resetView() {
        this.svg.transition().duration(500).call(
            this.zoom.transform,
            d3.zoomIdentity
        );
    }
    
    resize() {
        this.width = this.container.clientWidth;
        this.height = this.container.clientHeight;
        this.svg.attr('viewBox', [0, 0, this.width, this.height]);
        this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
        this.simulation.alpha(1).restart();
    }

    /** Render a peer network map (hub-and-spoke from local node) */
    updatePeers(peers, stats) {
        if (!peers || peers.length === 0) return;

        console.log('🌐 Peer map update:', peers.length, 'peers');

        const localNodeId = stats.localNodeId || 'local';

        // Build nodes: local node center + all peers
        const nodes = [
            {
                id: localNodeId, label: 'You', isLocal: true, status: 1,
                port:    stats.localNodePort || 10000,
                portApi: 5500,
                address: stats.localNodeIp || 'N/A',
                prefix:  'wss://',
                online:  stats.localNodeOnline,
                isPublic: stats.localNodePublic,
                peerCount: stats.peerCount
            }
        ];
        const links = [];

        peers.forEach(p => {
            nodes.push({
                id:      p.id,
                label:   p.id.substring(0, 10) + '...',
                isLocal: false,
                status:  p.status,
                port:    p.port,
                portApi: p.portApi,
                address: p.address,
                prefix:  p.prefix,
                updated: p.updated,
                created: p.created
            });
            links.push({ source: localNodeId || 'local', target: p.id, value: 1 });
        });

        // Clear existing
        this.clearAll();

        // Links
        const link = this.linkGroup.selectAll('line')
            .data(links)
            .enter().append('line')
            .attr('stroke', 'rgba(139, 92, 246, 0.3)')
            .attr('stroke-width', 1);

        // Nodes
        const node = this.nodeGroup.selectAll('circle')
            .data(nodes)
            .enter().append('circle')
            .attr('r', d => d.isLocal ? 16 : 7)
            .attr('fill', d => d.isLocal ? '#c084fc' : (d.status === 1 ? '#10b981' : '#60a5fa'))
            .attr('stroke', d => d.isLocal ? '#fff' : 'rgba(255,255,255,0.3)')
            .attr('stroke-width', d => d.isLocal ? 3 : 1)
            .call(this.drag())
            .on('click', (event, d) => {
                document.dispatchEvent(new CustomEvent('peerSelected', { detail: d }));
            })
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition().duration(200)
                    .attr('r', d.isLocal ? 20 : 11)
                    .attr('stroke-width', 3);
                // Show label on hover
                this.labelGroup.append('text')
                    .attr('class', 'hover-label')
                    .attr('x', d.x + 14)
                    .attr('y', d.y + 4)
                    .attr('font-size', '11px')
                    .attr('fill', '#fff')
                    .text(d.isLocal ? 'Your Node' : d.id.substring(0, 20));
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .transition().duration(200)
                    .attr('r', d.isLocal ? 16 : 7)
                    .attr('stroke-width', d.isLocal ? 3 : 1);
                this.labelGroup.selectAll('.hover-label').remove();
            });

        // Local node label always visible
        this.labelGroup.append('text')
            .datum(nodes[0])
            .attr('font-size', '12px')
            .attr('fill', '#c084fc')
            .attr('font-weight', 'bold')
            .attr('text-anchor', 'middle')
            .text('YOU');

        // Simulation
        this.simulation
            .nodes(nodes)
            .force('link', d3.forceLink(links).id(d => d.id).distance(120))
            .force('charge', d3.forceManyBody().strength(-200))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(15))
            .on('tick', () => {
                link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
                node.attr('cx', d => d.x).attr('cy', d => d.y);
                // Keep local node label centered
                this.labelGroup.select('text:not(.hover-label)')
                    .attr('x', nodes[0].x)
                    .attr('y', nodes[0].y - 22);
            });

        this.simulation.alpha(1).restart();
    }

    /** Render peers on a world map based on their geolocation */
    async updatePeersWorldMap(peers, stats) {
        if (!peers || peers.length === 0) return;

        console.log('🗺️  World map update:', peers.length, 'peers');

        this.clearAll();
        this.svg.call(this.zoom.transform, d3.zoomIdentity);

        const localNodeId = stats.localNodeId || 'local';

        // Fetch world map GeoJSON (simplified 110m resolution)
        let worldData;
        try {
            const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
            const topoData = await response.json();
            worldData = topojson.feature(topoData, topoData.objects.countries);
        } catch (error) {
            console.error('Failed to load world map:', error);
            // Fallback: show a message
            this.labelGroup.append('text')
                .attr('x', this.width / 2).attr('y', this.height / 2)
                .attr('text-anchor', 'middle').attr('fill', '#c084fc')
                .attr('font-size', '18px')
                .text('World map loading failed. Showing node-centric view.');
            // Fall back to hub-and-spoke
            this.updatePeers(peers, stats);
            return;
        }

        // Projection: Mercator centered
        const projection = d3.geoMercator()
            .scale(this.width / 6.5)
            .translate([this.width / 2, this.height / 1.7]);

        const path = d3.geoPath().projection(projection);

        // Draw world map countries
        this.nodeGroup.selectAll('path.country')
            .data(worldData.features)
            .enter().append('path')
            .attr('class', 'country')
            .attr('d', path)
            .attr('fill', '#1a1a2e')
            .attr('stroke', '#8b5cf6')
            .attr('stroke-width', 0.5)
            .attr('opacity', 0.6);

        // Add ocean/background
        this.g.insert('rect', ':first-child')
            .attr('class', 'ocean-bg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', '#0f0f1e');

        // Add local node to peers list if it has geolocation
        const allNodes = [
            {
                id: localNodeId,
                label: 'You',
                isLocal: true,
                status: 1,
                port: stats.localNodePort || 10000,
                portApi: 5500,
                address: stats.localNodeIp || 'N/A',
                prefix: 'wss://',
                online: stats.localNodeOnline,
                isPublic: stats.localNodePublic,
                peerCount: stats.peerCount,
                lat: null,  // Would need to geolocate local IP
                lon: null
            },
            ...peers
        ];

        // Filter nodes that have valid coordinates
        const geoNodes = allNodes.filter(n => n.lat !== null && n.lon !== null);

        console.log(`🌍 Positioned ${geoNodes.length}/${allNodes.length} peers on map`);

        // Draw connection lines from local node to peers
        if (geoNodes.length > 0 && geoNodes[0].isLocal && geoNodes[0].lat !== null) {
            const localPos = projection([geoNodes[0].lon, geoNodes[0].lat]);
            geoNodes.slice(1).forEach(peer => {
                const peerPos = projection([peer.lon, peer.lat]);
                this.linkGroup.append('line')
                    .attr('x1', localPos[0]).attr('y1', localPos[1])
                    .attr('x2', peerPos[0]).attr('y2', peerPos[1])
                    .attr('stroke', 'rgba(139, 92, 246, 0.2)')
                    .attr('stroke-width', 1)
                    .attr('opacity', 0.4);
            });
        }

        // Draw peer nodes
        const nodes = this.nodeGroup.selectAll('circle.peer')
            .data(geoNodes)
            .enter().append('circle')
            .attr('class', 'peer')
            .attr('cx', d => projection([d.lon, d.lat])[0])
            .attr('cy', d => projection([d.lon, d.lat])[1])
            .attr('r', d => d.isLocal ? 8 : 5)
            .attr('fill', d => d.isLocal ? '#c084fc' : (d.status === 1 ? '#10b981' : '#60a5fa'))
            .attr('stroke', '#fff')
            .attr('stroke-width', d => d.isLocal ? 2 : 1)
            .attr('filter', d => d.isLocal ? 'drop-shadow(0 0 8px rgba(192, 132, 252, 0.8))' : 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))')
            .on('click', (event, d) => {
                document.dispatchEvent(new CustomEvent('peerSelected', { detail: d }));
            })
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .transition().duration(200)
                    .attr('r', d.isLocal ? 12 : 8);
                // Show label
                const [x, y] = projection([d.lon, d.lat]);
                this.labelGroup.append('text')
                    .attr('class', 'hover-label')
                    .attr('x', x + 10).attr('y', y)
                    .attr('font-size', '11px')
                    .attr('fill', '#fff')
                    .attr('font-weight', d.isLocal ? 'bold' : 'normal')
                    .text(d.isLocal ? `YOUR NODE (${d.country || 'Unknown'})` : `${d.country || 'Unknown'} - ${d.city || ''}`);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .transition().duration(200)
                    .attr('r', d.isLocal ? 8 : 5);
                this.labelGroup.selectAll('.hover-label').remove();
            });

        // Add legend for peers without geolocation
        const missingGeo = allNodes.length - geoNodes.length;
        if (missingGeo > 0) {
            this.labelGroup.append('text')
                .attr('x', 20).attr('y', this.height - 20)
                .attr('font-size', '11px')
                .attr('fill', '#8b5cf6')
                .text(`⚠ ${missingGeo} peer(s) without geolocation data`);
        }

        // Add map title
        this.labelGroup.append('text')
            .attr('x', this.width / 2).attr('y', 30)
            .attr('text-anchor', 'middle')
            .attr('font-size', '18px')
            .attr('fill', '#c084fc')
            .attr('font-weight', 'bold')
            .text('Millix Peer Network Map');
    }

    /** Render MLX price chart in the visualization area */
    updatePriceChart(data) {
        if (!data) return;

        const history = data.history || [];
        console.log('📈 Price chart update:', history.length, 'points, $' + (data.price || 0).toFixed(9));

        // Stop simulation, clear all graph elements
        this.clearAll();

        // Reset zoom
        this.svg.call(this.zoom.transform, d3.zoomIdentity);

        const margin = { top: 40, right: 60, bottom: 50, left: 80 };
        const w = this.width - margin.left - margin.right;
        const h = this.height - margin.top - margin.bottom;

        // Use labelGroup as our chart container (it's inside the zoom group)
        const chart = this.labelGroup;

        if (history.length < 2) {
            // Not enough data yet — show message + current price
            chart.append('text')
                .attr('x', this.width / 2).attr('y', this.height / 2 - 30)
                .attr('text-anchor', 'middle').attr('fill', '#c084fc')
                .attr('font-size', '24px').attr('font-weight', 'bold')
                .text(`MLX $${(data.price || 0).toFixed(9)}`);
            chart.append('text')
                .attr('x', this.width / 2).attr('y', this.height / 2 + 10)
                .attr('text-anchor', 'middle').attr('fill', '#a78bfa')
                .attr('font-size', '14px')
                .text('Price chart building... data updates every 30s');
            chart.append('text')
                .attr('x', this.width / 2).attr('y', this.height / 2 + 35)
                .attr('text-anchor', 'middle').attr('fill', '#8b5cf6')
                .attr('font-size', '12px')
                .text('Source: fiatleak.com/mlx');
            return;
        }

        // Scales
        const xExtent = d3.extent(history, d => d.t);
        const yExtent = d3.extent(history, d => d.p);
        const yPad = (yExtent[1] - yExtent[0]) * 0.1 || yExtent[0] * 0.01;

        const x = d3.scaleTime()
            .domain(xExtent)
            .range([margin.left, margin.left + w]);

        const y = d3.scaleLinear()
            .domain([yExtent[0] - yPad, yExtent[1] + yPad])
            .range([margin.top + h, margin.top]);

        // Grid lines
        const yTicks = y.ticks(6);
        yTicks.forEach(tick => {
            chart.append('line')
                .attr('x1', margin.left).attr('x2', margin.left + w)
                .attr('y1', y(tick)).attr('y2', y(tick))
                .attr('stroke', 'rgba(139, 92, 246, 0.1)').attr('stroke-width', 1);
        });

        // Area fill under the line
        const area = d3.area()
            .x(d => x(d.t))
            .y0(margin.top + h)
            .y1(d => y(d.p))
            .curve(d3.curveMonotoneX);

        // Gradient
        const gradId = 'price-gradient';
        let defs = this.svg.select('defs');
        if (!defs.node()) defs = this.svg.append('defs');
        defs.selectAll('#' + gradId).remove();
        const grad = defs.append('linearGradient').attr('id', gradId)
            .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1');
        grad.append('stop').attr('offset', '0%').attr('stop-color', '#8b5cf6').attr('stop-opacity', 0.4);
        grad.append('stop').attr('offset', '100%').attr('stop-color', '#8b5cf6').attr('stop-opacity', 0.02);

        chart.append('path')
            .datum(history)
            .attr('fill', `url(#${gradId})`)
            .attr('d', area);

        // Price line
        const line = d3.line()
            .x(d => x(d.t))
            .y(d => y(d.p))
            .curve(d3.curveMonotoneX);

        chart.append('path')
            .datum(history)
            .attr('fill', 'none')
            .attr('stroke', '#c084fc')
            .attr('stroke-width', 2.5)
            .attr('filter', 'drop-shadow(0 0 4px rgba(192,132,252,0.6))')
            .attr('d', line);

        // Data points (only if < 60 points to avoid clutter)
        if (history.length < 60) {
            chart.selectAll('.price-dot')
                .data(history)
                .enter().append('circle')
                .attr('cx', d => x(d.t))
                .attr('cy', d => y(d.p))
                .attr('r', 3)
                .attr('fill', '#c084fc')
                .attr('stroke', '#fff')
                .attr('stroke-width', 1);
        }

        // X axis (time)
        const xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%H:%M'));
        chart.append('g')
            .attr('transform', `translate(0, ${margin.top + h})`)
            .call(xAxis)
            .selectAll('text,line,path').attr('stroke', '#8b5cf6').attr('fill', '#a78bfa').attr('font-size', '11px');

        // Y axis (price)
        const yAxis = d3.axisLeft(y).ticks(6).tickFormat(d => '$' + d.toFixed(9));
        chart.append('g')
            .attr('transform', `translate(${margin.left}, 0)`)
            .call(yAxis)
            .selectAll('text,line,path').attr('stroke', '#8b5cf6').attr('fill', '#a78bfa').attr('font-size', '11px');

        // Title
        const changeStr = data.change ? ` (${data.change > 0 ? '+' : ''}${(data.change * 100).toFixed(2)}%)` : '';
        chart.append('text')
            .attr('x', this.width / 2).attr('y', 24)
            .attr('text-anchor', 'middle').attr('fill', '#c084fc')
            .attr('font-size', '16px').attr('font-weight', 'bold')
            .text(`MLX/USD  $${(data.price || 0).toFixed(9)}${changeStr}`);

        // Source label
        chart.append('text')
            .attr('x', margin.left + w).attr('y', margin.top + h + 40)
            .attr('text-anchor', 'end').attr('fill', '#6b5ca8')
            .attr('font-size', '10px')
            .text('fiatleak.com/mlx');

        // Latest price dot (highlighted)
        const last = history[history.length - 1];
        chart.append('circle')
            .attr('cx', x(last.t)).attr('cy', y(last.p))
            .attr('r', 6).attr('fill', '#10b981')
            .attr('stroke', '#fff').attr('stroke-width', 2)
            .attr('filter', 'drop-shadow(0 0 6px rgba(16,185,129,0.8))');
    }
}
