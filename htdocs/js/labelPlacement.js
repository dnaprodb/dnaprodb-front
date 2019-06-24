importScripts("https://d3js.org/d3.v5.js");

onmessage = function (event) {
    var nodes = event.data.nodes,
        labels = event.data.labels,
        link_distance = event.data.link_distance;
    var label_nodes = [],
        label_links = [],
        theta;
    
    /* Build the nodes and anchor nodes */
    for (let i = 0; i < nodes.length; i++) {
        theta = 2*Math.PI*Math.random()
        label_nodes.push({
            type: "label",
            text: labels[i].label,
            id: 2*i,
            x: nodes[i].x + link_distance*Math.cos(theta),
            y: nodes[i].y + link_distance*Math.sin(theta),
            fx: labels[i].fx,
            fy: labels[i].fy,
            node: nodes[i],
            parent_id: nodes[i].com_id
        });
        label_nodes.push({
            type: "anchor",
            fx: nodes[i].x,
            fy: nodes[i].y,
            node: nodes[i],
            id: 2*i + 1
        });
        label_links.push({
            source: 2*i,
            target: 2*i + 1
        });
    }
    
    /* Setup the simulation */
    var simulation = d3.forceSimulation()
        .nodes(label_nodes)
        .force("link", d3.forceLink(label_links)
            .id(function (d, index) {
                return d.id;
            })
            .distance(link_distance)
            .strength(5)
        )
        .force("charge", d3.forceManyBody()
            .strength(-50)
            //.distanceMax(200)
        )
        .alphaDecay(0.05)
        .velocityDecay(0.2)
        .stop();
    
    /* Execute the simulation */
    for (let i = 0, n = Math.ceil(Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())); i < n; ++i) {
    //for (let i = 0, n = 5; i < n; ++i) {
        //postMessage({type: "tick", label_nodes: label_nodes});
        simulation.tick();
    }
    
    /* Return the label nodes */
    postMessage({type: "end", label_nodes: label_nodes.filter(item => item.type == "label")});
}