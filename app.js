/* D3 v7 author network. Data preprocessing is explained in the notebook. */
(() => {
  'use strict';
  if (!window.d3 || !window.AUTHOR_NETWORK) {
    document.querySelector('#status').textContent = 'Missing files: keep vendor/d3.v7.min.js and author_network.js beside the page.';
    return;
  }
  const graph = window.AUTHOR_NETWORK;
  const nodes = graph.nodes.map(d => ({...d}));
  const links = graph.links.map(d => ({...d}));
  const top = graph.metadata.topCountries;
  const color = d3.scaleOrdinal(top, d3.schemeTableau10);
  const extent = d3.extent(nodes, d => d.degree);
  const radius = d3.scaleSqrt().domain(extent[0] === extent[1] ? [0, extent[1] || 1] : extent).range([3, 12]);
  const chart = document.querySelector('#chart');
  let width = chart.clientWidth, height = chart.clientHeight, paused = false;
  const svg = d3.select('#network').attr('viewBox', [0, 0, width, height]);
  const world = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.08, 8]).on('zoom', event => world.attr('transform', event.transform));
  svg.call(zoom).on('dblclick.zoom', null);
  const edges = world.append('g').attr('stroke', '#a1b2be').selectAll('line').data(links).join('line')
    .attr('stroke-opacity', 0.38).attr('stroke-width', d => Math.min(4, 0.6 + Math.sqrt(d.weight) * 0.4));
  const dots = world.append('g').selectAll('circle').data(nodes).join('circle')
    .attr('r', d => radius(d.degree)).attr('fill', d => top.includes(d.country) ? color(d.country) : '#A9A9A9')
    .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.name}, ${d.country}, ${d.degree} coauthors. Open details.`);
  dots.append('title').text(d => `${d.name} · ${d.country} · ${d.degree} coauthors`);
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(34).strength(0.35))
    .force('charge', d3.forceManyBody().strength(-35))
    .force('collision', d3.forceCollide(d => radius(d.degree) * 1.4).iterations(2))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('x', d3.forceX(width / 2).strength(0.035))
    .force('y', d3.forceY(height / 2).strength(0.035));
  function tick() {
    edges.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    dots.attr('cx', d => d.x).attr('cy', d => d.y);
  }
  simulation.on('tick', tick);
  function fit() {
    const x = d3.extent(nodes, d => d.x), y = d3.extent(nodes, d => d.y);
    const k = Math.min(2, 0.90 * Math.min(width / (x[1] - x[0] + 30), height / (y[1] - y[0] + 30)));
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(k).translate(-(x[0] + x[1]) / 2, -(y[0] + y[1]) / 2));
  }
  // Warm up synchronously so all 1,535 authors are visible on first paint.
  simulation.stop().tick(150); tick(); fit(); simulation.restart();
  simulation.on('end', fit);
  const normalStatus = `${nodes.length.toLocaleString()} authors · ${links.length.toLocaleString()} coauthor pairs`;
  function restore() { dots.attr('opacity', 1); edges.attr('stroke-opacity', 0.38); d3.select('#status').text(normalStatus); }
  function highlight(event, d) {
    const affiliations = new Set(d.affiliationKeys);
    const same = n => n.affiliationKeys.some(a => affiliations.has(a));
    dots.attr('opacity', n => same(n) ? 1 : 0.2);
    edges.attr('stroke-opacity', e => same(e.source) && same(e.target) ? 0.5 : 0.06);
    d3.select('#status').text(`${d.name} · ${nodes.filter(same).length} authors share an affiliation`);
  }
  let selectedNode = null;
  function showDetails(event, d) {
    event.stopPropagation(); selectedNode = this;
    const panel = d3.select('#details'); panel.selectAll('*').remove();
    panel.append('h3').text(d.name);
    panel.append('p').attr('class', 'id').text(`Scopus author ID: ${d.id}`);
    panel.append('p').text(`${d.country} · ${d.degree} coauthors · ${d.publicationCount} publications`);
    panel.append('p').text(`Publication years: ${d.years.join(', ')}`);
    panel.append('h4').text('Affiliations');
    panel.append('ul').selectAll('li').data(d.affiliations).join('li').text(a => a);
    panel.append('p').text(`All recognized countries: ${d.countries.join(', ') || 'Unknown'}`);
    document.querySelector('#tooltip').hidden = false;
  }
  dots.on('mouseenter', highlight).on('mouseleave', restore).on('focus', highlight).on('blur', restore)
    .on('click', showDetails).on('keydown', function(event, d) { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showDetails.call(this, event, d); document.querySelector('#close').focus(); } });
  function closeDetails() { document.querySelector('#tooltip').hidden = true; }
  document.querySelector('#close').onclick = () => { closeDetails(); if(selectedNode) selectedNode.focus(); };
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetails(); });
  svg.on('click', closeDetails);
  dots.call(d3.drag().on('start', (event,d) => { if(!paused && !event.active) simulation.alphaTarget(0.2).restart(); d.fx=d.x; d.fy=d.y; })
    .on('drag', (event,d) => { d.fx=event.x; d.fy=event.y; if(paused) {d.x=event.x;d.y=event.y;tick();} })
    .on('end', (event,d) => { if(!event.active) simulation.alphaTarget(0); d.fx=null;d.fy=null; }));
  function reheat() { paused=false; document.querySelector('#pause').textContent='Pause motion'; simulation.alpha(0.6).restart(); }
  document.querySelector('#charge').oninput = function() { d3.select('#charge-value').text(this.value); simulation.force('charge').strength(+this.value); reheat(); };
  document.querySelector('#collision').oninput = function() { d3.select('#collision-value').text(`${(+this.value).toFixed(1)}×`); simulation.force('collision').radius(d => radius(d.degree) * +this.value); reheat(); };
  document.querySelector('#link').oninput = function() { d3.select('#link-value').text((+this.value).toFixed(2)); simulation.force('link').strength(+this.value); reheat(); };
  document.querySelector('#pause').onclick = function() { paused=!paused; this.textContent=paused?'Resume motion':'Pause motion'; if(paused) simulation.stop(); else simulation.alpha(0.3).restart(); };
  document.querySelector('#fit').onclick = fit;
  document.querySelector('#reset').onclick = () => { for(const [id,value] of [['charge',-35],['collision',1.4],['link',0.35]]) { const input=document.getElementById(id);input.value=value;input.dispatchEvent(new Event('input')); } closeDetails();restore();fit(); };
  const stats = d3.select('#stats').selectAll('div').data([[nodes.length,'authors'],[links.length,'links']]).join('div').attr('class','stat');
  stats.append('strong').text(d=>d[0].toLocaleString()); stats.append('span').text(d=>d[1]);
  d3.select('#cleaning').text(`${graph.metadata.retainedPublications} publications retained · ${graph.metadata.excludedRecords} incomplete records excluded`);
  const items=top.map(country=>({country,count:graph.metadata.countryCounts[country],color:color(country)}));
  items.push({country:'Other / unknown',count:nodes.filter(n=>!top.includes(n.country)).length,color:'#A9A9A9'});
  const legend=d3.select('#legend').selectAll('div').data(items).join('div').attr('class','legend-row');
  legend.append('span').attr('class','swatch').style('background',d=>d.color);legend.append('span').text(d=>d.country);legend.append('span').attr('class','count').text(d=>d.count);
  new ResizeObserver(()=> { width=chart.clientWidth;height=chart.clientHeight;svg.attr('viewBox',[0,0,width,height]);simulation.force('center').x(width/2).y(height/2);simulation.force('x').x(width/2);simulation.force('y').y(height/2);fit(); }).observe(chart);
  restore();
})();
