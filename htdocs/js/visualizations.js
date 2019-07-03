/*
#  Copyright 2019, Jared Sagendorf, All rights reserved.
#  
#  Correspondance can be sent by e-mail to Jared Sagendorf <sagendor@usc.edu>
#  
#  This program is free software; you can redistribute it and/or modify
#  it under the terms of the GNU General Public License as published by
#  the Free Software Foundation; either version 2 of the License, or
#  (at your option) any later version.
#  
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
*/
var NUCLEOTIDES,
    RESIDUES,
    PAIRS,
    STACKS,
    LINKS,
    STRANDS,
    SSE,
    ENTITIES,
    INTERFACES,
    NR_INTERACTIONS,
    NS_INTERACTIONS,
    NUCLEOTIDE_INTERFACE_DATA,
    RESIDUE_INTERFACE_DATA,
    SSE_INTERFACE_DATA,
    DATA,
    HB_TEMPLATES;

/* LCM parameters */
var LCM = {
    orientation: 'vertical',
    width: 800,
    height: 800,
    scale: null,
    charge: -40,
    link_distance: {
        stack: 35,
        linkage: 50,
        interaction: 75
    },
    glyph_size: {
        rect_w: 15,
        rect_h: 10,
        sugar: 5,
        sugar_c: null,
        phosphate: 5,
        phosphate_c: null,
        sg: 5,
        wg: 7,
        nucleotide: 20,
        label: 15
    },
    min_marker_size: 100,
    margin: {
        top: 25,
        right: 25,
        bottom: 25,
        left: 25
    },
    toggle: 'ON',
    theta: 0.0,
    label_theta: 0.0,
    label_scale: 1.0,
    simulation: null,
    svg: null,
    residue_padding: 15.0,
    hidden_elements: [],
    visifyComponents: function(val) {
        for (let i = 0; i < this.hidden_elements.length; i++) {
            d3.select(this.hidden_elements[i])
                .attr("visibility", val)
                .each(function (d) {
                    if (d.type == "residue" && val == "visible") {
                        d.active_interactions = d.total_interactions;
                    }
                });
        }
    },
    layout_type: "radial"
};

/* PCM parameters */
var PCM = {
    width: 600,
    height: 600,
    padding: 40,
    theta: 0,
    cx: null,
    cy: null,
    svg: null,
    label_scale: 1.0,
    min_marker_size: 120
};

/* IM paramters */
var IM = {};

/* SOP parameters */
var SOP = { 
    width: 960,
    height: 500,
    max_width: 1000,
    margin: {
        top: 25,
        bottom: 50,
        left: 60,
        right: 50
    },
    svg: null,
    reverse: false,
    label_scale: 1.0,
    min_marker_size: 100,
    min_bp_spacing: 40,
    max_bp_spacing: 60
};

/* shared parameters */
var PLOT_DATA = {
    model: 0,
    dna_entity_id: null,
    protein_chains: null,
    colors: {
        wg: "#00ffff",
        sg: "#dda0dd",
        pp: "#ff9933",
        sr: "#ffe333",
        bs: "#808b96",
        H: "#ff0000",
        S: "#49e20e",
        L: "#003eff"
    },
    active_colors: {
        H:{},
        S:{},
        L:{}
    },
    dna_moieties: [],
    sst_selection: [],
    moiety_labels: {
        wg: "Major Groove",
        sg: "Minor Groove",
        bs: "Base",
        sr: "Sugar",
        pp: "Phosphate",
        sc: "Side Chain",
        mc: "Main Chain"
    },
    secondary_structure_labels: {
        H: "helix",
        S: "strand",
        L: "loop"
    },
    dna_moiety_keys: ["wg", "sg", "bs", "sr", "pp"],
    selected: {
        element_ids: [],
        residue_ids: []
    },
    interface_residue_ids: [],
    element_lookup: {}, // keyed by residue or sse identifer
    dna_shape_labels: {
        buckle: ["Buckle", "[°]"],
        opening: ["Opening", "[°]"],
        propeller: ["Propeller Twist", "[°]"],
        twist: ["Helical Twist", "[°]"],
        roll: ["Roll", "[°]"],
        tilt: ["Tilt", "[°]"],
        rise: ["Rise", "[Å]"],
        shift: ["Shift", "[Å]"],
        stagger: ["Stagger", "[Å]"],
        stretch: ["Stretch", "[Å]"],
        shear: ["Shear", "[Å]"],
        slide: ["Slide", "[Å]"],
        minor_groove_3dna: ["Minor Groove Width", "[Å]"],
        major_groove_3dna: ["Major Groove Width", "[Å]"],
        minor_groove_curves: ["Minor Groove Width", "[Å]"],
        major_groove_curves: ["Major Groove Width", "[Å]"]
    },
    labels: {},
    label_font: {
        size: 10,
        xscale: null,
        yscale: null,
        name: null
    },
    tooltips: "on",
    idMap: {}, // maps DNAproDB id format to html friendly format,
    excluded_ids: new Set(),
    interface_string: "", // string representation of the currently visualizaed interface
    marker_size_represents: null,
    scale_factor: {
        H: 1.0,
        S: 0.636,
        L: 0.778
    }
};

/* add a container for tooltips */
var tooltip = d3.select("body div.tooltip");

function labelInputSubmit (id, mi) {
    var text = $("#label_input").val();
    if (text.trim().length > 0) {
        var id = PLOT_DATA.label_id;
        var mi = PLOT_DATA.model;
        
        if(id in PLOT_DATA.labels[mi]){
            PLOT_DATA.labels[mi][id] = text;
        } else {
            PLOT_DATA.labels[id] = text;
        }
        console.log(id);
        updateLabel(`.label[data-com_id="${PLOT_DATA.idMap[id]}"]`, id, text);
    }
    /* finished - hide the input again */
    d3.select("#label_input_div")
        .style("opacity", 0)
        .style("right", null)
        .style("top", null)
        .style("bottom", null)
        .style("left", null);
}

function labelInputShow(d) {
    $("#label_input").val("");
    d3.event.stopPropagation();
    var div = d3.select("#label_input_div");
    var xy = d3.mouse(d3.event.target.farthestViewportElement);
    
    // set horizontal position of input window
    if(xy[0] <= $(d3.event.target.farthestViewportElement).attr("width")/2) {
        div.style("right", null);
        div.style("left", (d3.event.clientX + 15) + "px");
    } else {
        div.style("right", (window.innerWidth - d3.event.clientX + 15) + "px");
        div.style("left", null);
    }
    
    // set vertical position of input window
    if(xy[1] <= $(d3.event.target.farthestViewportElement).attr("height")/2) {
        div.style("top", (d3.event.clientY) + "px");
        div.style("bottom", null);
    } else {
        div.style("bottom", (window.innerHeight - d3.event.clientY) + "px");
        div.style("top", null);
    }
    
    
    
    var text = $(this).siblings("text").text();
    $("#label_input").attr("placeholder", text);
    
    //console.log(d);
    /*
    if(d.res_id) {
        PLOT_DATA.label_id = d.res_id;
    } else if (d.sse_id ) {
        PLOT_DATA.label_id = d.sse_id;
    }
    */
    PLOT_DATA.label_id = d.parent_id;
    div.style("opacity", 1);
}

function toolTipIn(d) {
    /* check if tooltips on */
    if(PLOT_DATA.tooltips == "off") {
        return;
    }
    
    /* determine object type */
    let xy = d3.mouse(d3.event.target.farthestViewportElement);
    let mi = PLOT_DATA.model; 
    let ent = PLOT_DATA.dna_entity_id;
    let rbg, mty, ss, mtyItems, mtyList, item; 
    switch (d.type) {
        case "nucleotide":
            rgb = hexToRGB(PLOT_DATA.colors.bs);
            if(d.data.include) {
                mtyItems = [];
                for (let i = 0; i < PLOT_DATA.dna_moieties.length; i++) {
                    mty = PLOT_DATA.dna_moieties[i];
                    if(! (mty in d.data.fasa[mi])) {
                        continue;
                    }
                    mtyItems.push({
                        moiety: PLOT_DATA.moiety_labels[mty],
                        hbond: NUCLEOTIDE_INTERFACE_DATA[mi][ent][d.data.id].hbond_sum[mty].mc + NUCLEOTIDE_INTERFACE_DATA[mi][ent][d.data.id].hbond_sum[mty].sc,
                        vdw: NUCLEOTIDE_INTERFACE_DATA[mi][ent][d.data.id].vdw_interaction_sum[mty].mc + NUCLEOTIDE_INTERFACE_DATA[mi][ent][d.data.id].vdw_interaction_sum[mty].sc,
                        basa: NUCLEOTIDE_INTERFACE_DATA[mi][ent][d.data.id].basa_sum[mty],
                        fasa: d.data.fasa[mi][mty]
                    });
                }
                tooltip.html(HB_TEMPLATES.nuc_tooltip({
                        name: d.data.name,
                        sst: d.data.secondary_structure[mi],
                        glyco: d.data.glycosidic_conformation[mi],
                        chain: d.data.chain,
                        number: d.data.number,
                        ins_code: d.data.ins_code,
                        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                        ppp: d.data.phosphate_present,
                        modified: d.data.modified,
                        mtyitem: mtyItems,
                        label: PLOT_DATA.labels[d.data.id],
                        chem_name: d.data.chemical_name
                }));
            } else {
                tooltip.html(HB_TEMPLATES.nuc_tooltip({
                        name: d.data.name,
                        sst: d.data.secondary_structure[mi],
                        glyco: d.data.glycosidic_conformation[mi],
                        chain: d.data.chain,
                        number: d.data.number,
                        ins: d.data.ins,
                        ppp: d.data.phosphate_present,
                        modified: d.data.modified,
                        color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                        label: PLOT_DATA.labels[d.data.id],
                        chem_name: d.data.chemical_name
                }));
            }
            break;
        case "sse":
            ss = d.data.secondary_structure;
            if(ss == "L") {
                toolTipIn({
                    type: "residue",
                    data: RESIDUES[d.data.id]
                });
                return;
            } else {
                item = SSE_INTERFACE_DATA[mi][ent][d.data.id];
                rgb = hexToRGB(PLOT_DATA.active_colors[ss][d.data.chain] || PLOT_DATA.colors[ss]);
                mtyList = item.interacts_with.filter(n => PLOT_DATA.helical_moieties.includes(n));
                mtyItems = [];
                for (let i = 0; i < mtyList.length; i++) {
                    mty = mtyList[i];
                    mtyItems.push({
                        moiety: PLOT_DATA.moiety_labels[mty],
                        hbond: item.hbond_sum[mty].mc + item.hbond_sum[mty].sc,
                        vdw: item.vdw_interaction_sum[mty].mc + item.vdw_interaction_sum[mty].sc,
                        int_count: d.data.interaction_count[mty]
                    });
                }
                tooltip.html(HB_TEMPLATES.sse_tooltip({
                    id: d.data.id,
                    sst: PLOT_DATA.secondary_structure_labels[ss],
                    rnum: d.data.residue_ids.length,
                    chain: d.data.chain,
                    //scfasa: d.data.fasa[mi].sc,
                    //mcfasa: d.data.fasa[mi].mc,
                    scbasa: item.basa_sum.sc,
                    mcbasa: item.basa_sum.mc,
                    color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                    mtyitem: mtyItems,
                    label: PLOT_DATA.labels[PLOT_DATA.model][d.data.id]
                }));
            }
            break;
        case "residue":
            ss = d.data.secondary_structure[mi];
            rgb = hexToRGB(PLOT_DATA.active_colors[ss][d.data.chain] || PLOT_DATA.colors[ss]);
            item = RESIDUE_INTERFACE_DATA[mi][ent][d.data.id]
            mtyItems = [];
            mtyList = item.interacts_with.filter(n => PLOT_DATA.dna_moieties.includes(n));
            for (let i = 0; i < mtyList.length; i++) {
                mty = mtyList[i];
                mtyItems.push({
                    moiety: PLOT_DATA.moiety_labels[mty],
                    hbond: item.hbond_sum[mty].mc + item.hbond_sum[mty].sc,
                    vdw: item.vdw_interaction_sum[mty].mc + item.vdw_interaction_sum[mty].sc,
                    basa: item.basa_sum.total,
                    int_count: d.data.interaction_count[mty]
                });
            }
            tooltip.html(HB_TEMPLATES.res_tooltip({
                    name: d.data.name,
                    sst: PLOT_DATA.secondary_structure_labels[ss],
                    sap: d.data.sap_score[mi],
                    chain: d.data.chain,
                    number: d.data.number,
                    ins_code: d.data.ins_code,
                    scfasa: d.data.fasa[mi].sc,
                    mcfasa: d.data.fasa[mi].mc,
                    scbasa: item.basa_sum.sc,
                    mcbasa: item.basa_sum.mc,
                    scfesa: d.data.sesa[mi].sc,
                    mcfesa: d.data.sesa[mi].mc,
                    cvfine: d.data.cv_fine[mi],
                    cvcoarse: d.data.cv_coarse[mi],
                    color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                    mtyitem: mtyItems,
                    label: PLOT_DATA.labels[d.data.id],
                    chem_name: d.data.chemical_name
            }));
            break;
        case "interaction":
            rgb = hexToRGB(PLOT_DATA.colors[d.source_mty]);
            tooltip.html(HB_TEMPLATES.res_int_tooltip({
                    res_name: d.data.res_name,
                    res_chain: d.data.res_chain,
                    res_number: d.data.res_number,
                    res_ins_code: d.data.res_ins,
                    nuc_name: d.data.nuc_name,
                    nuc_chain: d.data.nuc_chain,
                    nuc_number: d.data.nuc_number,
                    nuc_ins_code: d.data.nuc_ins,
                    color: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
                    geo: d.data.geometry,
                    mindist: d.data.min_distance,
                    mnndist: d.data.mean_nn_distance,
                    comdist: d.data.cm_distance,
                    weak: d.data.weak_interaction,
                    basa: d.data.basa[d.source_mty].mc + d.data.basa[d.source_mty].sc,
                    hbond: d.data.hbond_sum[d.source_mty].mc + d.data.hbond_sum[d.source_mty].sc,
                    vdw: d.data.vdw_sum[d.source_mty].mc + d.data.vdw_sum[d.source_mty].sc,
                    mty: PLOT_DATA.moiety_labels[d.source_mty],
                    res_label: PLOT_DATA.labels[d.data.res_id],
                    nuc_label: PLOT_DATA.labels[d.data.nuc_id]
            }));
            break;
        default:
            return;
    }
    // set horizontal position
    if(xy[0] <= $(d3.event.target.farthestViewportElement).attr("width")/2) {
        tooltip.style("right", null);
        tooltip.style("left", (d3.event.clientX + 15) + "px");
    } else {
        tooltip.style("right", (window.innerWidth - d3.event.clientX + 15) + "px");
        tooltip.style("left", null);
    }
    
    // set vertical position
    if(xy[1] <= $(d3.event.target.farthestViewportElement).attr("height")/2) {
        tooltip.style("top", (d3.event.clientY) + "px");
        tooltip.style("bottom", null);
    } else {
        tooltip.style("bottom", (window.innerHeight - d3.event.clientY) + "px");
        tooltip.style("top", null);
    }
    
    // make div visible
    tooltip.transition()
        .duration(200)
        .style("opacity", 1.0);
}

function toolTipOut() {
    tooltip.transition()
        .duration(200)
        .style("opacity", 0);
}

function selectClick(d) {
    var empty = PLOT_DATA.selected.residue_ids.length == 0;
    
    if ($(this).is("svg")) {
        // clear everything
        d3.selectAll(".highlighted")
            .classed("highlighted", false);
        PLOT_DATA.selected.residue_ids = [];
    } else {
        d3.event.stopPropagation();
        let contains = PLOT_DATA.selected.residue_ids.includes(d.data.id);
        if (!d3.event.shiftKey) {
            // clear all previous selections
            d3.selectAll(".highlighted")
                .classed("highlighted", false);
            PLOT_DATA.selected.residue_ids = [];
            if (contains) {
                addBallStick(PLOT_DATA.selected.residue_ids);
                return;
            }
        }
        if(d.data.id in NUCLEOTIDES){
            // highlight a nucleotide
            if (contains) {
                PLOT_DATA.selected.residue_ids.splice(PLOT_DATA.selected.residue_ids.indexOf(d.data.id), 1);
            } else {
                PLOT_DATA.selected.residue_ids.push(d.data.id);
            }
            d3.selectAll(`${this.tagName}[data-com_id="${PLOT_DATA.idMap[d.data.id]}"]`).each(function(d, i) {
                d3.selectAll(this.childNodes)
                    .classed("highlighted", !contains);
            });
        } else if(d.data.id in RESIDUES) {
            // highlight a residue
            if (contains) {
                PLOT_DATA.selected.residue_ids.splice(PLOT_DATA.selected.residue_ids.indexOf(d.data.id), 1);
            } else {
                PLOT_DATA.selected.residue_ids.push(d.data.id);
            }
            d3.selectAll(`${this.tagName}[data-com_id="${PLOT_DATA.idMap[d.data.id]}"]`).classed("highlighted", !contains);
        } else {
            contains = d3.selectAll(`${this.tagName}[data-com_id="${PLOT_DATA.idMap[d.data.id]}"]`).classed("highlighted");
            
            // select all child residues
            for (let i = 0; i < d.data.residue_ids.length; i++) {
                d3.selectAll(`${this.tagName}[data-com_id="${PLOT_DATA.idMap[d.data.residue_ids[i]]}"]`).classed("highlighted", !contains);
                if (contains) {
                    PLOT_DATA.selected.residue_ids.splice(PLOT_DATA.selected.residue_ids.indexOf(d.data.residue_ids[i]), 1);
                } else {
                    PLOT_DATA.selected.residue_ids.push(d.data.residue_ids[i]);
                }
            }
            
            // highlight the SSE as well, but ignore loops since they are already highlighted from above
            if (d.data.id.secondary_structure != "L") {
                d3.selectAll(`${this.tagName}[data-com_id="${PLOT_DATA.idMap[d.data.id]}"]`).classed("highlighted", !contains);
            }
        }
    }
    
    if(empty && PLOT_DATA.selected.residue_ids.length == 0) {
        return
    }
    addBallStick(PLOT_DATA.selected.residue_ids);
}

function getHash() {
    var args = Array.from(arguments);
    return args.sort().join("@");
}

function setExcludes() {
    var res_list = $('#exclude_residue_select').val();
    var nuc_list = $('#exclude_nucleotide_select').val();
    var sse_list = $('#exclude_sse_select').val();
    var mi = PLOT_DATA.model;
    
    PLOT_DATA.excluded_ids = new Set(res_list.concat(nuc_list));
    
    for (let i = 0; i < sse_list.length; i++) {
        for (let j = 0; j < SSE[mi][sse_list[i]].residue_ids.length; j ++) {
            PLOT_DATA.excluded_ids.add(SSE[mi][sse_list[i]].residue_ids[j]);
        }
    }
}

function makeExcludeSelects() {
    var pc = PLOT_DATA.protein_chains;
    var dc = PLOT_DATA.dna_chains;
    var dna_id = PLOT_DATA.dna_entity_id;
    var mi = PLOT_DATA.model;
    
    var nuc_list = [];
    var res_list = [];
    var sse_list = [];
    
    var nuc, res, sse;
    // Make Nucleotide select
    for (let nid in NUCLEOTIDE_INTERFACE_DATA[mi][dna_id]) {
        if (dc.includes(NUCLEOTIDES[nid].chain)) {
            nuc_list.push(nid);
        }
    }
    nuc_list.sort();
    $('#exclude_nucleotide_select').html('');
    $('#exclude_nucleotide_select')[0].sumo.reload();
    for (let i = 0; i < nuc_list.length; i++) {
        nuc = NUCLEOTIDES[nuc_list[i]];
        $('#exclude_nucleotide_select')[0].sumo.add(nuc_list[i], `${nuc.name} ${nuc.number}${nuc.ins_code.trim()} ${nuc.chain}`);
    }
    
    for (let rid in RESIDUE_INTERFACE_DATA[mi][dna_id]) {
        if (pc.includes(RESIDUES[rid].chain)) {
            res_list.push(rid);
        }
    }
    res_list.sort();
    $('#exclude_residue_select').html('');
    $('#exclude_residue_select')[0].sumo.reload();
    for (let i = 0; i < res_list.length; i++) {
        res = RESIDUES[res_list[i]];
        $('#exclude_residue_select')[0].sumo.add(res_list[i], `${res.name} ${res.number}${res.ins_code.trim()} ${res.chain}`);
    }
    
    for (let sid in SSE_INTERFACE_DATA[mi][dna_id]) {
        if (pc.includes(SSE[mi][sid].chain)) {
            sse_list.push(sid);
        }
    }
    sse_list.sort();
    $('#exclude_sse_select').html('');
    $('#exclude_sse_select')[0].sumo.reload();
    for (let i = 0; i < sse_list.length; i++) {
        sse = SSE[mi][sse_list[i]];
        if(sse.secondary_structure == 'L') {
            continue;
        }
        $('#exclude_sse_select')[0].sumo.add(sse_list[i], `${sse.secondary_structure}${sse.number} ${sse.chain}`);
    }
}

function setIncludes(mi, dna_ent_id, pro_chains) {
    var nr, ns, mty, id, interface, geo, field, val, criteria, passed, exclude_weak, match_all;
    
    /* Get input values from submit form */
    var default_criteria = $('input[type=radio][name="interaction_criteria"]:checked').val() == "default";
    if(! default_criteria) {
        geo = $("input[type=checkbox][name=geometry]:checked")
            .map( function() {
            return this.value;
            })
            .toArray();
        exclude_weak = $('input[type=radio][name="weak_interactions"]:checked').val() == "no";
        match_all = $('input[type=radio][name="interaction_logic"]:checked').val() == "all";
    }
    
    /* reset everything */
    PLOT_DATA.interface_residue_ids = [];
    for (let key in NUCLEOTIDES) {
        // used for LCM
        NUCLEOTIDES[key].interacts = {
            wg: false,
            sg: false,
            sr: false,
            pp: false,
            bs: false
        };
        NUCLEOTIDES.include = false;
    }
    
    for (let key in SSE[mi]) {
        SSE[mi][key].include = false;
        
        // used for PCM
        SSE[mi][key].interacts = {
            wg: false,
            sg: false,
            sr: false,
            pp: false,
            bs: false
        };
        
        SSE[mi][key].interaction_count = {
            wg: 0,
            sg: 0,
            sr: 0,
            pp: 0,
            bs: 0
        };
    }
    
    for (let key in RESIDUES) {
        RESIDUES[key].include = false;
        RESIDUES[key].interaction_count = {
            wg: 0,
            sg: 0,
            sr: 0,
            pp: 0,
            bs: 0,
            total: 0
        };
        RESIDUES[key].active_interactions = 0.0;
    }
    
    /* loop over nucleotide-residue interactions */
    for (let k = 0; k < INTERFACES[mi][dna_ent_id].length; k++) {
        interface = INTERFACES[mi][dna_ent_id][k];
        for (let i = 0; i < interface["nucleotide-residue_interactions"].length; i++) {
            nr = interface["nucleotide-residue_interactions"][i];
            nr.include = false; // reset include field
            
            // check if this chain is included
            if (! pro_chains.includes(nr.res_chain) ) {
                continue;
            }
            
            // check SST
            if (! PLOT_DATA.sst_selection.includes(RESIDUES[nr.res_id]['secondary_structure'][mi]) ) {
                continue;
            }
            
            // check for excluded residue
            if(PLOT_DATA.excluded_ids.has(nr.res_id) || PLOT_DATA.excluded_ids.has(nr.nuc_id)){
                continue;
            }
            
            // get interactiing moieties
            mty = nr.nucleotide_interaction_moieties.filter(n => PLOT_DATA.dna_moieties.includes(n));
            if(mty.length == 0) {
                // We must enforce that a nucleotide-residue interaction can only interact
                // with the dna moieties specified in the .nucleotide_interaction_moieties
                // field, despite whatever custom criteria we define. This means that very
                // low cut-off values are going to be ignored in some cases.
                continue;
            }
            
            // check whether to use default or custom criteria
            if(default_criteria) {
                if(nr.weak_interaction){
                    continue;
                }
            } else {
                // check for weak interactions if selected
                if(exclude_weak) {
                    if(nr.weak_interaction) {
                        continue;
                    }
                }
                
                passed = {};
                // need to parse all the interaction criteria input
                for (let j = 0; j < mty.length; j++) {
                    // get all moiety-based inputs
                    $(`input[data-mty=${mty[j]}]`).each(function(n){
                        field = this.name.split('.');
                        val = this.value;
                        criteria = this.dataset.criteria;
                        if ($.isNumeric(val) && val > 0.0) {
                            if(! (criteria in passed)) {
                                passed[criteria] = [];
                            }
                            passed[criteria].push(checkCriteria(nr, field, val, false));
                        }
                    });
                }
                
                // get distance based inputs
                $("input[data-criteria='distance'").each(function(n) {
                        field = this.name.split('.');
                        val = this.value;
                        criteria = this.dataset.criteria;
                        if ($.isNumeric(val) && val > 0.0) {
                            if(! (criteria in passed)) {
                                passed[criteria] = [];
                            }
                            passed[criteria].push(checkCriteria(nr, field, val, true));
                        }
                });
                
                // get geometry based inputs
                if( geo.length > 0 && geo.length < 3) {
                    passed["geometry"] = [geo.includes(nr.geometry)];
                }
                
                // combine tests
                for(let key in passed){
                    passed[key] = passed[key].some(e => e);
                }
                if(match_all){
                    if(! Object.values(passed).every(e => e)){
                        continue;
                    }
                } else {
                    if(! Object.values(passed).some(e => e)){
                        continue;
                    }
                }
            }
            
            // passed all the tests - include it!
            NR_INTERACTIONS[mi][dna_ent_id][getHash(nr.nuc_id, nr.res_id)].include = true;
            RESIDUES[nr.res_id].include = true;
            NUCLEOTIDES[nr.nuc_id].include = true;
            SSE[mi][nr.res_id].include = true;
            for (let j = 0; j < mty.length; j++) {
                NUCLEOTIDES[nr.nuc_id].interacts[mty[j]] = true;
                SSE[mi][nr.res_id].interaction_count[mty[j]] += 1;
                RESIDUES[nr.res_id].interaction_count[mty[j]] += 1;
            }
            RESIDUES[nr.res_id].interaction_count["total"] += 1;
            RESIDUES[nr.res_id].active_interactions += 1;
            PLOT_DATA.interface_residue_ids.push(nr.res_id);
        }
    }
    
    /* set up SSE interactions */
    for (let k = 0; k < INTERFACES[mi][dna_ent_id].length; k++) {
        interface = INTERFACES[mi][dna_ent_id][k]
        for (let i = 0; i < interface["sse_data"].length; i++) {
            id = interface["sse_data"][i].sse_id;
            if (SSE[mi][id].include) {
                for (let j = 0; j < interface["sse_data"][i].interacts_with.length; j++) {
                    SSE[mi][id].interacts[interface["sse_data"][i].interacts_with[j]] = true;
                }
            }
        }
    }
    
    for (let i = 0; i < ENTITIES[mi][dna_ent_id].nucleotides.length; i++) {
        PLOT_DATA.interface_residue_ids.push(ENTITIES[mi][dna_ent_id].nucleotides[i]);
    }
    PLOT_DATA.interface_residue_ids = PLOT_DATA.interface_residue_ids.unique();
}

function checkCriteria(nr, field, value, reverse) {
    if(field.length == 1) {
        if(typeof nr[field[0]] === "object") {
            let sum = 0.0;
            for (let key in nr[field[0]]) {
                sum += nr[field[0]][key];
            }
            return (reverse) ? sum <= value : sum >= value; 
        }
        return (reverse) ? nr[field[0]] <= value : nr[field[0]] >= value;
    } else {
        return checkCriteria(nr[field[0]], field.slice(1), value, reverse);
    }
}

function entitySelectSetup(mi) {
    let item = "";
    let id;
    mi = Number(mi);
    for (let i = 0; i < DATA.dna.models[mi].entities.length; i++) {
        id = DATA.dna.models[mi].entities[i].id;
        item += `<option value="${id}">${id}</option>`;
    }
    $('#entity_select').html(item);
    $('#entity_select').change(function () {
        proteinChainsSelectSetup($("#model_select").val(), this.value);
    });
    proteinChainsSelectSetup(mi, DATA.dna.models[mi].entities[0].id);
}

function proteinChainsSelectSetup(mi, dna_ent_id) {
    let item = "";
    let chain;
    let chains = [];
    mi = Number(mi);
    /* empty current select */
    $('#protein_chains_select').html('');
    $('#protein_chains_select')[0].sumo.reload();
    
    // gather all protein chains involved with dna_ent_id */
    for (let i = 0; i < INTERFACES[mi][dna_ent_id].length; i++){
        for (let j = 0; j < INTERFACES[mi][dna_ent_id][i].protein_chains.length; j++) {
            chain = INTERFACES[mi][dna_ent_id][i].protein_chains[j];
            chains.push(chain);
        }
    }
    
    // ensure we have a unique list
    chains = chains.unique().sort();
    
    // add each chain to the select
    for (let i = 0; i < chains.length; i++) {
        $('#protein_chains_select')[0].sumo.add(chains[i], i);
    }
    $('#protein_chains_select')[0].sumo.selectAll();
}

function makePlots(mi, dna_entity_id, pro_chains) {
    /* This function is called whenever the "update plots" button
    is pressed, and draws plots for a particular model and interface */
    
    /* set various user-defined variables */
    PLOT_DATA.model = Number(mi);
    PLOT_DATA.dna_entity_id = dna_entity_id;
    PLOT_DATA.protein_chains = pro_chains;
    
    // get selected DNA moieties
    PLOT_DATA.dna_moieties = $("input[type=checkbox][name=dna_moiety_selection]:checked")
        .map( function() {
           return this.value;
        })
        .toArray();
    
    // get selected SST
    PLOT_DATA.sst_selection = $("input[type=checkbox][name=sst_selection]:checked")
        .map( function() {
           return this.value;
        })
        .toArray();
    
    // get marker size selection
    PLOT_DATA.marker_size_represents =  $("input[type=radio][name=marker_size]:checked").val();
        
    PLOT_DATA.helical_moieties = PLOT_DATA.dna_moieties.slice();
    var index = PLOT_DATA.dna_moieties.indexOf("bs");
    if (index > -1) {
        PLOT_DATA.helical_moieties.splice(index, 1); 
    }
    
    // reset UI elements
    PLOT_DATA.tooltips = "on";
    $('input[type=radio][name="tooltip_toggle"]').val(["on"]);
    
    /* get DNA chains corresponding to the selected entity */
    PLOT_DATA.dna_chains = [];
    for(let i = 0; i < ENTITIES[mi][dna_entity_id].nucleotides.length; i++) {
        PLOT_DATA.dna_chains.push(ENTITIES[mi][dna_entity_id].nucleotides[i].charAt(0));
    }
    PLOT_DATA.dna_chains = PLOT_DATA.dna_chains.unique();
    
    /* update font scale */
    var bbox = document.getElementById("test_text").getBBox();
    PLOT_DATA.label_font.xscale = 1.1*bbox.width / 36;
    PLOT_DATA.label_font.yscale = 1.1*bbox.height;
    
    /* show current selection */
    $("#current_model").text(PLOT_DATA.model);
    $("#current_model2").text(PLOT_DATA.model);
    $("#current_dna_entity").text(PLOT_DATA.dna_entity_id);
    if(PLOT_DATA.protein_chains.length > 0) {
        $("#current_protein_chains").text(PLOT_DATA.protein_chains.join(','));
    } else {
        $("#current_protein_chains").text("none selected");
    }
    
    /* Decide whether to rebuild any necessary UI components or simply apply updates */
    var ifs = getInterfaceString();
    if (ifs == PLOT_DATA.interface_string) {
        // we haven't changed the interface, just update stuff
        setExcludes();
    } else {
        // we are visualizing a new interface, start from scratch
        makeExcludeSelects();
        makeLabelFormatInputs(PLOT_DATA.dna_chains, PLOT_DATA.protein_chains);
        makeColorFormatInputs(PLOT_DATA.dna_chains, PLOT_DATA.protein_chains);
        PLOT_DATA.interface_string = ifs;
        for (let key in PLOT_DATA.active_colors) {
            PLOT_DATA.active_colors[key] = {};
        }
        PLOT_DATA.excluded_ids = new Set();
        resetLabels();
    }
    
    /* set included residues, nucleotides and sse */
    setIncludes(mi, dna_entity_id, PLOT_DATA.protein_chains);
    
    // update NGL viewer
    selectModel(PLOT_DATA.model);
    // add colors
    applyColorFormats();
    $("#cartoon_toggle_button").text("Hide Cartoon");
    
    /* Check if DNA entitiy contains helices */
    if(ENTITIES[mi][dna_entity_id].helical_segments.length == 0) {
        // disable PCM and SOP plots
        $("#pcm_link, #sop_link").addClass("disabled");
        $('.nav-tabs a[href="#lcm"]').tab('show');
    } else {
        $("#pcm_link, #sop_link").removeClass("disabled");
        
        var hi = 0; // helix selection
        /* Plot Shape Overlay plot */
        // set up helix select
        $("#sop_grid_button").text("hide grid");
        $("#sop_legend_button").text("hide legend");
        $("#sop_helix_select").empty();
        var opts = ""
        for (let i = 0; i < ENTITIES[mi][dna_entity_id].helical_segments.length; i++) {
            opts += `<option value="${i}">${ENTITIES[mi][dna_entity_id].helical_segments[i].helix_id}</option>`;
        }
        $("#sop_helix_select").append(opts);
    
        var shape_name = $("#shape_parameter_select").val(); // shape selection
        makeShapeOverlay(ENTITIES[mi][dna_entity_id].helical_segments[hi], shape_name, mi, dna_entity_id);
        
        /* Plot Polar Contact Map */
         // set up helix select
        $("#pcm_grid_button").text("hide grid");
        $("#pcm_legend_button").text("hide legend");
        $("#pcm_helix_select").empty();
        opts = ""
        for (let i = 0; i < ENTITIES[mi][dna_entity_id].helical_segments.length; i++) {
            opts += `<option value="${i}">${ENTITIES[mi][dna_entity_id].helical_segments[i].helix_id}</option>`;
        }
        $("#pcm_helix_select").append(opts);
        
        makePCM(ENTITIES[mi][dna_entity_id].helical_segments[hi], mi, dna_entity_id);
    }
    
    /* Plot Linear Contact Map */
    LCM.svg = null;
    $("#lcm_grid_button").text("show grid");
    $("#lcm_legend_button").text("hide legend");
    $("#lcm_selected_button").text("hide selected components");
    $("#lcm_residues_button").text("hide residues");
    $("#lcm_residues_button").prop("disabled", false);
    $("#lcm_selected_button").prop("disabled", false);
    $('input[type=radio][name="show_hbonds"]').val(["no"]);
    $("#lcm_plot_rotation_slider").val(0).trigger("input");
    $("#lcm_label_rotation_slider").val(0).trigger("input");
    $("#lcm_label_scale_slider").val(1.0).trigger("input");
    makeLCM(mi, dna_entity_id, INTERFACES[mi][dna_entity_id]);
    
    /* Update overview table */
    makeOverviewTable(mi);
}

function makeLabelFormatInputs(dna_chains, pro_chains) {
    /* clear out any previous rows */
    $("#nucleotide_label_rows").empty();
    $("#residue_label_rows").empty();
    $("#sse_label_rows").empty();
    
    /* add all chain specs */
    $("#nucleotide_label_rows").append(HB_TEMPLATES.res_labels_row({
        fields: [
            {
                number: 1,
                chain: '_',
                default_text: "Name(1)",
                default_value: "name_short"
            },
            {
                number: 2,
                chain: '_',
                default_value: "blank"
            },
            {
                number: 3,
                chain: '_',
                default_value: "blank"
            }/*,
            {
                number: 4,
                chain: '_'
            }*/
        ],
        text: "All chains format:",
        chain: '_'
    }));
    $("#nucleotide_label_rows").append("<hr>");
        
    $("#residue_label_rows").append(HB_TEMPLATES.res_labels_row({
        fields: [
            {
                number: 1,
                chain: '_',
                default_text: "Name(1)",
                default_value: "name_short"
            },
            {
                number: 2,
                chain: '_',
                default_text: "number",
                default_value: "number"
            },
            {
                number: 3,
                chain: '_',
                default_text: "chain",
                default_value: "chain"
            }/*,
            {
                number: 4,
                chain: '_'
            }*/
        ],
        text: "All chains format:",
        chain: '_'
    }));
    $("#residue_label_rows").append("<hr>");
    
    $("#sse_label_rows").append(HB_TEMPLATES.sse_labels_row({
        fields: [
            {
                number: 1,
                chain: '_',
                default_text: "sec. structure",
                default_value: "secondary_structure"
            },
            {
                number: 2,
                chain: '_',
                default_text: "chain",
                default_value: "chain"
            },
            {
                number: 3,
                chain: '_',
                default_text: "number",
                default_value: "number"
            }/*,
            {
                number: 4,
                chain: '_'
            }*/
        ],
        text: "All chains format:",
        chain: '_'
    }));
    $("#sse_label_rows").append("<hr>");
    
    /* add per-chain specs */
    for (let i = 0; i < dna_chains.length; i++) {
        $("#nucleotide_label_rows").append(HB_TEMPLATES.res_labels_row({
            fields: [
                {
                    number: 1,
                    chain: dna_chains[i],
                    default_value: "blank"
                },
                {
                    number: 2,
                    chain: dna_chains[i],
                    default_value: "blank"
                },
                {
                    number: 3,
                    chain: dna_chains[i],
                    default_value: "blank"
                }/*,
                {
                    number: 4,
                    chain: dna_chains[i]
                }*/
            ],
            text: `Chain ${dna_chains[i]} format:`,
            chain: dna_chains[i]
        }));
    }
    
    for (let i = 0; i < pro_chains.length; i++) {
        $("#residue_label_rows").append(HB_TEMPLATES.res_labels_row({
            fields: [
                {
                    number: 1,
                    chain: pro_chains[i],
                    default_value: "blank"
                },
                {
                    number: 2,
                    chain: pro_chains[i],
                    default_value: "blank"
                },
                {
                    number: 3,
                    chain: pro_chains[i],
                    default_value: "blank"
                }/*,
                {
                    number: 4,
                    chain: pro_chains[i]
                }*/
            ],
            text: `Chain ${pro_chains[i]} format:`,
            chain: pro_chains[i]
        }));
    }
    
    for (let i = 0; i < pro_chains.length; i++) {
        $("#sse_label_rows").append(HB_TEMPLATES.sse_labels_row({
            fields: [
                {
                    number: 1,
                    chain: pro_chains[i],
                    default_value: "blank"
                },
                {
                    number: 2,
                    chain: pro_chains[i],
                    default_value: "blank"
                },
                {
                    number: 3,
                    chain: pro_chains[i],
                    default_value: "blank"
                }/*,
                {
                    number: 4,
                    chain: pro_chains[i]
                }*/
            ],
            text: `Chain ${pro_chains[i]} format:`,
            chain: pro_chains[i]
        }));
    }
}

function labelOptionClick(e) {
    let button = $(e).parent().siblings('button');
    button.attr("data-value", $(e).attr("data-value"));
    button.text($(e).attr("data-placeholder"));
}

function makeColorFormatInputs(dna_chains, pro_chains) {
    $("#dna_color_rows").empty();
    $("#protein_color_rows").empty();
    
    /* add chain color inputs */
    for (let i = 0; i < pro_chains.length; i++) {
        $("#protein_color_rows").append(HB_TEMPLATES.pro_color_row({
            colors: [
                {
                    color: PLOT_DATA.colors['H'],
                    name: 'H',
                    chain: pro_chains[i]
                },
                {
                    color: PLOT_DATA.colors['S'],
                    name: 'S',
                    chain: pro_chains[i]
                },
                {
                    color: PLOT_DATA.colors['L'],
                    name: 'L',
                    chain: pro_chains[i]
                },
            ],
            text: `Chain ${pro_chains[i]} colors:`,
        }));
    }
    
}

function applyLabelFormats() {
    var format, offset;
    var dna_chains = ['_'].concat(PLOT_DATA.dna_chains);
    var pro_chains = ['_'].concat(PLOT_DATA.protein_chains);
    
    for (let i = 0; i < dna_chains.length; i++) {
        format = [];
        // get select elements
        $(`#nucleotide_label_rows button[data-chain=${dna_chains[i]}]`).each(function(n,e) {
            let val = $(this).attr("data-value");
            if (val != "blank") {
                format.push(val);
            }
        });
        if (format.length > 0) {
            // get number offset value
            offset = parseInt($(`#nucleotide_label_rows input[data-chain=${dna_chains[i]}]`).val());
            if(isNaN(offset)) {
                offset = 0;
            }
            updateResLabels(NUCLEOTIDES, format, dna_chains[i], 'nucleotide', offset);
        }
    }
    
    for (let i = 0; i < pro_chains.length; i++) {
        format = [];
        // get select elements
        $(`#residue_label_rows button[data-chain=${pro_chains[i]}]`).each(function(n,e) {
            let val = $(this).attr("data-value");
            if (val != "blank") {
                format.push(val);
            }
        });
        if (format.length > 0) {
            // get number offset value
            offset = parseInt($(`#residue_label_rows input[data-chain=${pro_chains[i]}]`).val());
            if(isNaN(offset)) {
                offset = 0;
            }
            updateResLabels(RESIDUES, format, pro_chains[i], 'label', offset);
        }
    }
    
    for (let i = 0; i < pro_chains.length; i++) {
        format = [];
        // get select elements
        $(`#sse_label_rows button[data-chain=${pro_chains[i]}]`).each(function(n,e) {
            let val = $(this).attr("data-value");
            if (val != "blank") {
                format.push(val);
            }
        });
        if (format.length > 0) {
            updateSSELabels(SSE, format, pro_chains[i], PLOT_DATA.model, 'label');
        }
    }
}

function updateResLabels(lookup, format, chain, label_type, offset) {
    var label;
    var ch;
    
    if (chain == '_') {
        ch = new RegExp('[a-z0-9]', 'i');
    } else {
        ch = new RegExp(chain);
    }
    for (let id in lookup) {
        if(! ch.test(lookup[id].chain)) {
            continue;
        }
        
        if (! (id in PLOT_DATA.labels) ) {
            continue;
        }
        label = "";
        for (let i = 0; i < format.length; i++) {
            switch (format[i]) {
                case 'name_natural':
                    label += lookup[id].name.charAt(0) + lookup[id].name.substring(1).toLowerCase();
                    break;
                case 'name_upper':
                    label += lookup[id].name;
                    break;
                case 'name_lower':
                    label += lookup[id].name.toLowerCase();
                    break;
                case 'name_short':
                    label += lookup[id].name_short;
                    break;
                case 'chain':
                    label += lookup[id].chain;
                    break;
                case 'number':
                    label += lookup[id].number + offset;
                    break;
                case 'ins':
                    label += lookup[id].ins_code;
                    break;
            }
        }
        updateLabel(`.${label_type}[data-com_id="${PLOT_DATA.idMap[id]}"]`, id, label);
    }
}

function updateSSELabels(lookup, format, chain, mi, label_type) {
    var label;
    var ch;
    if (chain == '_') {
        ch = new RegExp('[a-z0-9]', 'i');
    } else {
        ch = new RegExp(chain);
    }
    for (let id in lookup[mi]) {
        if(! ch.test(lookup[mi][id].chain)) {
            continue;
        }
        
        if (! (id in PLOT_DATA.labels[mi]) ) {
            continue;
        }
        
        if (lookup[mi][id].secondary_structure == "L") {
            // we ignore loops, treat them as residues
            continue;
        }
        
        if (id in RESIDUES) {
            // ignore residue ids
            continue;
        }
        
        label = "";
        for (let i = 0; i < format.length; i++) {
            switch (format[i]) {
                case 'secondary_structure':
                    label += lookup[mi][id].secondary_structure;
                    break;
                case 'chain':
                    label += lookup[mi][id].chain;
                    break;
                case 'number':
                    label += lookup[mi][id].number;
                    break;
                case 'range':
                    label += RESIDUES[lookup[mi][id].residue_ids[0]].number + ":" + RESIDUES[lookup[mi][id].residue_ids[lookup[mi][id].residue_ids.length-1]].number;
                    break;
            }
        }
        if (lookup[mi][id].include) {
            updateLabel(`.${label_type}[data-com_id="${PLOT_DATA.idMap[id]}"]`, id, label, mi);
        } else {
            PLOT_DATA.labels[mi][id] = label;
        }
    }
}

function updateLabel(selector, id, label, mi) {
    $(`${selector} text`).text(label);
    let rects = $(`${selector} rect.handle`);
    if(rects.length) {
        rects.each(function(i) {
            $(this).attr("width", PLOT_DATA.label_font.xscale*label.length);
            let t = $(this).attr("transform");
            $(this).attr("transform", t.replace(
                /translate\([0-9\.,+-\s]+\)/,
                `translate(${-$(this).attr("width")/2}, ${-$(this).attr("height")/2})`
            ));
        });
    }
    if (mi) {
        PLOT_DATA.labels[mi][id] = label;
    } else {
        PLOT_DATA.labels[id] = label;
    }
}

function resetLabels() {
    // set nucleotide labels
    for (let i = 0; i < DATA.dna.nucleotides.length; i++) {
        PLOT_DATA.labels[DATA.dna.nucleotides[i].id] = DATA.dna.nucleotides[i].name_short;
    }
    
    // set residue labels
    let res;
    for (let i = 0; i < DATA.protein.residues.length; i++) {
        res = DATA.protein.residues[i];
        PLOT_DATA.labels[res.id] = `${res.name_short}${res.number}${res.chain}`;
    }
    
    // set SSE labels
    let item;
    for (let mi = 0; mi < DATA.num_models; mi++) {
         for (let i = 0; i < DATA.protein.models[mi].secondary_structure_elements.length; i++) {
            item = DATA.protein.models[mi].secondary_structure_elements[i];
            SSE[mi][item.id] = item;
             
            if (item.secondary_structure == "L") {
                PLOT_DATA.labels[mi][item.id] = PLOT_DATA.labels[item.residue_ids[0]];
            } else {
                PLOT_DATA.labels[mi][item.id] = `${item.secondary_structure}${item.chain}${item.number}`;
            }
        }
    }
}

function applyColorFormats(){
    if($('input[name="all_chain_colors"]:checked').val() == "on") {
        $("#protein_all_color_row input[type=color]").each(function(n) {
            let val = $(this).val();
            let sst = $(this).attr("name");
            let spec = {};
            $(`path.${sst}`).css("fill", val);
            $.each(PLOT_DATA.protein_chains, function(i, c) {
                PLOT_DATA.active_colors[sst][c] = val;
            });
        });
    } else {
        let pro_chains = PLOT_DATA.protein_chains;
        for (let i = 0; i < pro_chains.length; i++) {
            $(`#protein_color_rows input[data-chain=${pro_chains[i]}]`).each(function(n) {
                let val = $(this).val();
                let sst = $(this).attr("name");
                let chain = $(this).attr("data-chain");
                $(`path.${sst}[data-chain=${chain}]`).css("fill", val);
                PLOT_DATA.active_colors[sst][pro_chains[i]] = val;
            });
        }
    }
    var color_specs = {};
    for(let sst in PLOT_DATA.active_colors) {
        for (let chain in PLOT_DATA.active_colors[sst]) {
            if (! (chain in color_specs) ) {
                color_specs[chain] = {chain_name: ':'+chain}; 
            }
            switch (sst) {
                case 'H':
                    color_specs[chain]['helix'] = parseInt(PLOT_DATA.active_colors[sst][chain].substring(1), 16);
                    break;
                case 'S':
                    color_specs[chain]['sheet'] = parseInt(PLOT_DATA.active_colors[sst][chain].substring(1), 16);
                    break;
                case 'L':
                    color_specs[chain]['turn'] = parseInt(PLOT_DATA.active_colors[sst][chain].substring(1), 16);
                    break;
            } 
        }
    }
    changeColorScheme3D({chains: Object.values(color_specs)});
    selectResidues3D(PLOT_DATA.interface_residue_ids);
}

function transformTextLCM(d) {
    if (d.type == "nucleotide") {
        return `rotate(${-d.angle}) rotate(${-LCM.theta}) scale(${LCM.label_scale})`;
    } else {
        this.childNodes[0].setAttribute('transform', `rotate(${-LCM.theta}) rotate(${LCM.label_theta}) scale(${LCM.label_scale})`);
        let r = this.childNodes[1];
        r.setAttribute('transform', 
                       `rotate(${-LCM.theta}) ` + 
                       `rotate(${LCM.label_theta}) ` + 
                       `scale(${LCM.label_scale}) ` +
                       `translate(${-r.getAttribute("width")/2}, ${-r.getAttribute("height")/2})`
        );
        return `translate(${d.x}, ${d.y})`;
    }
}

function getInterfaceString(chains) {
    if(chains === undefined) {
        return PLOT_DATA.model + PLOT_DATA.dna_entity_id + PLOT_DATA.protein_chains.sort().join();
    } else {
        return PLOT_DATA.model + PLOT_DATA.dna_entity_id + chains.sort().join();
    }
}

function offsetLabels(selection) {
    selection.each( function(d) {
        d.width = d.text.length*PLOT_DATA.label_font.xscale;
        d.height = PLOT_DATA.label_font.yscale;
        let diffX = d.x - d.node.x;
        let diffY = d.y - d.node.y;
        let theta = Math.atan2(diffY, diffX);
        d.x += d.width*Math.cos(theta)/2;
        d.y += d.height*Math.sin(theta)/2;
        
        // Update handle
        this.childNodes[1].setAttribute("height", d.height);
        this.childNodes[1].setAttribute("width", d.width);
        this.childNodes[1].setAttribute("transform", `translate(${-d.width/2}, ${-d.height/2})`);
        this.setAttribute("transform", `translate(${d.x}, ${d.y})`);
    });
}

function placeLabelsForce(nodes, labels, D, g, opts={
        callback: undefined, 
        link_distance: 5,
        label_destination: undefined
}) {
    D.w = new Worker("/js/labelPlacement.js");
    
    D.w.postMessage({
        nodes: nodes,
        labels: labels,
        link_distance: opts.link_distance
    });

    D.w.onmessage = function(event) {
        var gl = g.selectAll("g.label")
            .data(event.data.label_nodes)
            .enter()
            .append("g")
            .attr("class", "label")
            .attr("data-com_id", function (d) {
                return PLOT_DATA.idMap[d.parent_id];
            })
            .call(d3.drag()
                .on("drag", function(d) {
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;
                    d3.select(this)
                        .attr("transform", `translate(${d.x}, ${d.y})`);
                    }
                )
            );
        
        gl.append("text")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "middle")
            .text(function (d) {
                return d.text;
        });
        
        gl.append("rect")
            .attr("class", "handle")
            .attr("fill-opacity", 0.0)
            .on("dblclick", labelInputShow);
        
        gl.call(offsetLabels);
        
        if( typeof(opts.callback) != "undefined" ) {
            opts.callback(g);
        }
        
        if(typeof(opts.label_destination) != "undefined") {
            let labels = event.data.label_nodes;
            let nodes = opts.label_destination;
            for (let i = 0; i < labels.length; i++) {
                for (let j = 0; j < nodes.length; j++) {
                    if(labels[i].node.id == nodes[j].id) {
                        nodes[j].label_data = labels[i];
                        break;
                    }
                }
            }
        }
    };
}

function escapeID(id1) {
    // used to modify DNAproDB id strings
    var re1 = /\./g;
    var re2 = /\s/g;
    var id2;
    
    id2 = id1.replace(re1, '').replace(re2, '');
    PLOT_DATA.idMap[id1] = id2;
    PLOT_DATA.idMap[id2] = id1;
}

function getMarkerSize(data, min_size, type, mty) {
    let lookup, ss;
    if (type == "residue") {
        lookup = RESIDUE_INTERFACE_DATA[PLOT_DATA.model][PLOT_DATA.dna_entity_id];
        ss = data.secondary_structure[PLOT_DATA.model];
    } else {
        lookup = SSE_INTERFACE_DATA[PLOT_DATA.model][PLOT_DATA.dna_entity_id];
        ss = data.secondary_structure;
    }
   
    let scale = PLOT_DATA.scale_factor[ss];
    switch (PLOT_DATA.marker_size_represents) {
        case "residue_count":
            if(data.residue_ids) {
                return min_size*Math.sqrt(data.residue_ids.length)*scale;
            } else {
                return min_size*scale;
            }
        case "hbonds":
            if(type == "residue"){
                let acc = 0.0;
                let mty_list = lookup[data.id].interacts_with.filter(n => PLOT_DATA.dna_moieties.includes(n));
                for (let i = 0; i < mty_list.length; i++) {
                    acc += lookup[data.id].hbond_sum[mty_list[i]].sc;
                    acc += lookup[data.id].hbond_sum[mty_list[i]].mc;
                }
                return min_size*Math.sqrt(acc+1)*scale;
            } else {
                return min_size*Math.sqrt(lookup[data.id].hbond_sum[mty]+1)*scale;
            }
        case "nucleotide_interactions":
            if(type == "residue"){
                return min_size*Math.sqrt(RESIDUES[data.id].interaction_count["total"])*scale;
            } else {
                return min_size*Math.sqrt(SSE[PLOT_DATA.model][data.id].interaction_count[mty])*scale;
            }
        case "basa":
            return min_size*Math.sqrt(lookup[data.id].basa_sum.total/25.0 + 1.0)*scale;
        default:
            return min_size;
    }
}

function hexToRGB(hex, scale=false) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if(scale){
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : null;
    } else {
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;   
    }
}

function makeShapeOverlay(helix, shape_name, mi, ent_id) {
    
    function makeNodes(length, ids1, ids2, mi, ent_id, shape, ymin, ymax) {
        /* This function generates the residue nodes */
        
        function addNodes(nid, index) {
            if (nid in NR_INTERACTIONS[mi][ent_id]) {
                let rid;
                for (let i = 0; i < NR_INTERACTIONS[mi][ent_id][nid].length; i++) {
                    if ( NR_INTERACTIONS[mi][ent_id][nid][i].include ) {
                        rid = NR_INTERACTIONS[mi][ent_id][nid][i].res_id;
                        if (! (rid in nodes) ) {
                            nodes[rid] = {
                                data: RESIDUES[rid],
                                indices: [],
                                x: null,
                                y: null,
                                type: "residue",
                                size: getMarkerSize(RESIDUES[rid], SOP.min_marker_size, "residue"),
                                res_id: rid,
                                label_id: rid,
                                com_id: rid
                            };
                        }
                        nodes[rid].indices.push(index);
                    }
                }
            }
        }
        
        function interpolate(x, shapex, shapey) {
            var ip, im, t;
            for (let j = 0; j < shapex.length; j++) {
                if (x < shapex[j]) {
                    ip = j;
                    im = j-1;
                    break;
                } else if (x == shapex[j]) {
                    ip = j;
                    im = j;
                    break;
                }
            }
            // check bounds on im and ip
            if(im < 0) {
                im = 0;
            }
            if(isNaN(ip)) {
                ip = shapex.length - 1;
            }
            if(isNaN(im)) {
                im = shapex.length - 1;
            }
            if(im == ip){
                t = 0;
            } else {
                t = (x-shapex[im])/(shapex[ip]-shapex[im]);
            }
            
            return t*shapey[ip] + (1-t)*shapey[im];
        }
        
        function replaceNaN(i, shape) {
            im = i - 1
            ip = i + 1
            if(im < 0) {
                sm = midpoint;
            } else {
                sm = shape[im];
                if(isNaN(sm)) sm = midpoint;
            }
            
            if(ip >= shape.length) {
                sp = midpoint;
            } else {
                sp = shape[ip]
                if(isNaN(sp)) sp = midpoint;
            }
            
            return (sm + sp)/2;
        }
        
        function indexToReal(i, d, z) {
            return z + d*i;
        }
        
        function realToIndex(r, d, z) {
            return Math.floor((r-z)/d);
        }
        
        function findNN(x, y, pointsx, pointsy, xscale, yscale, d) {
            var count = 0;
            for (let i = 0; i < pointsx.length; i++ ) {
                if ( Math.sqrt((x-pointsx[i])**2/xscale**2 + (y-pointsy[i])**2/yscale**2) < d ) {
                    count += 1;
                }
            }
            return count;
        }
        
        var nodes = {}; // store residues
        var midpoint = (ymax + ymin)/2;
        var nid1, nid2;
        
        // generate grid stuff
        var NY = 8;
        var NX = 2*length;
        var dy = (ymax - ymin)/NY;
        var dx = length/NX;
        var slots = []; // 2D array to store slot occupancies
        for(let i = 0; i < NX; i++) {
            slots.push({
                ypos: null,
                direction: 1
            });
        }
        
        // set shape x and y arrays
        shapex = [];
        shapey = shape.slice();
        if(shape.length == length) {
            for(let i = 0; i < shapey.length; i++) {
                shapex.push(i);
                if(isNaN(shapey[i])) shapey[i] = replaceNaN(i, shapey);
            }
        } else {
            for(let i = 0; i < shapey.length; i++) {
                shapex.push(i+0.5);
                if(isNaN(shapey[i])) shapey[i] = replaceNaN(i, shapey);
            }
        }
        
        // interpolate shape to grid
        var y, x, yi, xi;
        for (let i = 0; i < NX; i++) {
            x = i*dx;
            y = interpolate(x, shapex, shapey);
            slots[i].ypos = y;
        }
        
        // add residues which interact with nucleotides in the helix
        for (let i = 0; i < length; i++) {
            nid1 = ids1[i];
            nid2 = ids2[i];
            
            // loop over interactions for each nucleotide
            addNodes(nid1, i);
            addNodes(nid2, i);
        }
        
        nodes = Object.values(nodes);
        // set x-position of nodes
        for(let i = 0; i < nodes.length; i++) {
            nodes[i].x = Math.round(2*nodes[i].indices.reduce((a,b) => a + b, 0) / nodes[i].indices.length)/2;
        }
        
        // set y-position of nodes
        for(let i = 0; i < nodes.length; i++) {
            xi = realToIndex(nodes[i].x, dx, 0);
            yi = slots[xi].ypos + dy*slots[xi].direction;
            if(yi > ymax){
                slots[xi].ypos = interpolate(nodes[i].x, shapex, shapey);
                slots[xi].direction = -1;
                yi = slots[xi].ypos + dy*slots[xi].direction; 
            }
            nodes[i].y = yi;
            slots[xi].ypos = yi;
        }
        
        return nodes;
    }
    
    function makeLegend(w, h, shape_name) {
        var width = 185;
        var height = 100;

        var legend = SOP.svg.append("g")
            .attr("id", "sop_legend")
            .attr("class", "legend")
            .attr("cursor", "move")
            .attr("transform", `translate(${w-width}, 0)`)
            .data([{
                x: w-width,
                y: 0.0
             }])
            .call(d3.drag()
                .on("drag", function (d) {
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;
                    d3.select(this)
                        .attr("transform", "translate(" +
                            Math.max(0, Math.min(w - width, d.x)) +
                            ", " +
                            Math.max(0, Math.min(h - height, d.y)) +
                            ")"
                        )
                })
            );

        legend.append("rect")
            .attr("class", "border")
            .attr("width", width)
            .attr("height", height);
        
        // residue shape symbols
        var lh = 10;
        var lw = 15;
        var start = 15;
        var ssl = [
                "Helix residue",
                "Strand residue",
                "Loop residue"
            ];
        
        var shape = [
                d3.symbolCircle,
                d3.symbolTriangle,
                d3.symbolSquare
            ];
        
        var ss_data = d3.range(start, start + 2 * ssl.length * lh, 2 * lh).map(function (d, i) {
            return {
                label: ssl[i],
                shape: shape[i],
                y: d
            };
        });

        var ss_labels = legend.append("g")
            .selectAll("g")
            .data(ss_data)
            .enter()
            .append("g");

        ss_labels.append("path")
            .attr("d", d3.symbol().size(75).type(function (d) {
                return d.shape;
            }))
            .attr("transform", function (d) {
                return `translate(${lw}, ${d.y})`;
            });

        ss_labels.append("text")
            .attr("x", 2*lw)
            .attr("y", function (d) {
                return d.y;
            })
            .style("dominant-baseline", "middle")
            .text(function (d) {
                return d.label;
            });
        
        // add line label
        legend.append("line")
            .attr("y1", start + 2*lh*ssl.length + lh/2)
            .attr("y2", start + 2*lh*ssl.length + lh/2)
            .attr("x1", lw/2)
            .attr("x2", 2*lw);

        legend.append("text")
            .attr("x", 2.5*lw)
            .attr("y", start + 2*lh*ssl.length + lh/2)
            .style("dominant-baseline", "middle")
            .text(PLOT_DATA.dna_shape_labels[shape_name][0]);
    }
    
    var length = helix.length;
    var shape, ids1, ids2, seq1, seq2;
    if(SOP.reverse) {
        shape = helix.shape_parameters[shape_name].slice().reverse();
        ids1 = helix.ids1.slice().reverse();
        ids2 = helix.ids2.slice().reverse();
        seq1 = helix.sequence1.split("").reverse().join("");
        seq2 = helix.sequence2.split("").reverse().join("");
    } else {
        shape = helix.shape_parameters[shape_name];
        ids1 = helix.ids1;
        ids2 = helix.ids2;
        seq1 = helix.sequence1;
        seq2 = helix.sequence2;
    }
    var shape_filtered = shape.filter(d => ! isNaN(d));
    var bp_type = ["watson-crick"];
    for(let i = 0; i < ids1.length; i++) {
        bp_type.push(PAIRS[mi][getHash(ids1[i], ids2[i])]["pair_type"]);
    }
    bp_type.push("watson-crick");
    var spacing = Math.min(Math.max(SOP.min_bp_spacing, SOP.max_width/(length+2)), SOP.max_bp_spacing);
    SOP.width = spacing*(length+2); // space per base-pair
    var ymin = (1.0-0.2*Math.sign(Math.min(...shape_filtered)))*Math.min(...shape_filtered); // min y-value
    var ymax = (1.0+0.2*Math.sign(Math.max(...shape_filtered)))*Math.max(...shape_filtered); // max y-value
    var xScale = d3.scaleLinear().range([SOP.margin.left, SOP.width - SOP.margin.right])
        .domain([-1, length]);
    var yScale = d3.scaleLinear().range([SOP.height - SOP.margin.bottom, SOP.margin.top])
        .domain([ymin, ymax]);
    
    var line_data;
    if(shape.length == length) {
        line_data = shape.map(function (d, i) {
            return {
                x: i,
                y: d
            };    
        });
    } else {
        line_data = shape.map(function (d, i) {
            return {
                x: i + 0.5,
                y: d
            };    
        });
    }
    
    var line = d3.line()
        .x(function (d) {
            return xScale(d.x);
        })
        .y(function (d) {
            return yScale(d.y);
        })
        .defined(function (d) {
            return ! isNaN(d.y);
        });

    $("#sop_plot").empty();
    SOP.svg = d3.select("#sop_plot")
        .append("svg")
        .attr("id", "sop_svg")
        .attr("width", Math.min(SOP.width, SOP.max_width))
        .attr("height", SOP.height)
        .attr("border", 1)
        .on("click", selectClick);
    
    var gt = SOP.svg.append("g")
        .attr("class", "pan");
    
    // add x grid-lines
    var xgrid = d3.axisBottom(xScale)
        .ticks(length)
        .tickSize(SOP.height-SOP.margin.top-SOP.margin.bottom)
        .tickFormat("");
    
    gt.append("g")
        .attr("class", "grid")
        .attr("id", "sop_grid")
        .attr("transform", `translate(0, ${SOP.margin.top})`)
        .call(xgrid);
    
    // Add shape line
    gt.append('g')
        .attr('class', 'line_chart')
        .datum(line_data)
        .append("path")
        .attr("d", line);
    
    var tickLabels = [""];
    for (let i = 0; i < length; i++) {
        tickLabels.push(seq1.charAt(i) + "-" + seq2.charAt(i));
    }
    tickLabels.push("");
    var yAxis = d3.axisLeft(yScale)
        .ticks(5);
    var xAxis = d3.axisBottom(xScale)
        .ticks(tickLabels.length)
        .tickFormat(function(d, i) {
            return tickLabels[i];
        });
    
    // add x-axis
    gt.append('g')
        .attr("id", "sop_axis_x")
        .attr("class", "sop_axis")
        .attr("transform", "translate(0," + (SOP.height - SOP.margin.bottom) + ")")
        .call(xAxis)
        .selectAll("text")
        .attr("y", 0)
        .attr("x", 9)
        .attr("dy", ".35em")
        .attr("transform", "rotate(90)")
        .style("text-anchor", "start")
        .style("color", function(i) {
            if(bp_type[i+1] == "watson-crick") {
                return "black";
            } else {
                return "#A00";
            }
        });
    
    // add residue markers
    if(shape_filtered.length > 0) {
        var node_data = makeNodes(length, ids1, ids2, mi, ent_id, shape, ymin, ymax);
        var node_labels = [];
        for(let i = 0; i < node_data.length; i++) {
            node_data[i].x = xScale(node_data[i].x);
            node_data[i].y = yScale(node_data[i].y);
            node_labels.push({
                label: PLOT_DATA.labels[node_data[i].res_id],
                fx: null,
                fy: null
            });
        }
        
        gt.append('g')
            .attr("class", "nodes")
            .selectAll("g")
            .data(node_data)
            .enter()
            .append("g")
            .attr("class", function (d) {
                return d.type;
            })
            .attr("transform", function (d) {
                return `translate(${d.x}, ${d.y})`;
            });
        
        // residue nodes
        gt.selectAll(".residue")
            .append("path")
            .attr("d", d3.symbol()
                .size(function (d) {
                    return d.size;
                })
                .type(function (d) {
                    switch (d.data.secondary_structure[mi]) {
                    case "H":
                        return d3.symbolCircle;
                    case "S":
                        return d3.symbolTriangle;
                    case "L":
                        return d3.symbolSquare;
                    }
            }))
            .attr("class", function (d) {
                return d.data.secondary_structure[mi];
            })
            .attr("data-com_id", function (d) {
                return PLOT_DATA.idMap[d.data.id];
            })
            .attr("data-chain", function(d) {
                return d.data.chain;
            })
            .style("fill", function(d) {
                if(d.data.chain in PLOT_DATA.active_colors[d.data.secondary_structure[mi]]) {
                    return PLOT_DATA.active_colors[d.data.secondary_structure[mi]][d.data.chain];
                } else {
                return null;
                }
            })
            .on('mouseover', toolTipIn)
            .on('mouseout', toolTipOut)
            .on('click', selectClick);
        
        
        // add residue labels
        var gl = gt.append("g")
            .attr("class", "labels");
        placeLabelsForce(node_data, node_labels, SOP, gl);
        
    } else {
        gt.append("text")
            .attr("x", SOP.width/2)
            .attr("y", SOP.height/2)
            .style("dominant-baseline", "middle")
            .style("text-anchor", "middle")
            .text(PLOT_DATA.dna_shape_labels[shape_name][0] + " is not available")
    }
    
    // add y-axis and label
    SOP.svg.append("rect")
        .attr("fill", "#FFF")
        .attr("height", SOP.height)
        .attr("width", SOP.margin.left);
    
    SOP.svg.append("g")
        .attr("class", "sop_axis")
        .attr("transform", "translate(" + SOP.margin.left + ", 0)")
        .call(yAxis);
    
    SOP.svg.append("text")
      .attr("transform", `rotate(-90, 0, ${SOP.height/2})`)
      .attr("y", SOP.height/2)
      .attr("x", SOP.margin.left/2)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text(PLOT_DATA.dna_shape_labels[shape_name][0] + " " + PLOT_DATA.dna_shape_labels[shape_name][1]);     
    
    // add legend
    makeLegend(Math.min(SOP.width, SOP.max_width), SOP.height, shape_name)
    
    // add horizonal pan ability
    var zoom_handler = d3.zoom()
        .scaleExtent([1, 1])
        .translateExtent([[0, 0], [SOP.width, SOP.height]])
        .on("zoom", function () {
            gt.attr("transform", d3.event.transform);
        });
    zoom_handler(SOP.svg);
    $("#sop_residues_button").text("hide residues");
    $("#sop_grid_button").text("hide grid");
    $("#sop_legend_button").text("hide legend");
    if ((shape_name == "minor_groove_curves" || shape_name == "major_groove_curves") && (bp_type.includes("other") || bp_type.includes("hoogsteen"))) {
        $("#sop_warning").html('<span style="color:red;">Warning: this helix contains non-Watson-Crick base pairs, Curves groove width calculations may not be accurate.</span>');
    } else {
        $("#sop_warning").html("");
    }
}

function makeLCM(mi, dna_entity_id, interfaces) {
    /* called functions */
    function getNucleotideAngle(node) {
        let n1, n2, dx, dy, theta;
        if (node.data.id in PAIRS[mi] && PAIRS[mi][node.data.id].length == 1 && LCM.layout_type == "radial") {
            /* use pair neighbor to define angle */
            n1 = LCM.node_lookup[PAIRS[mi][node.data.id][0].id1];
            n2 = LCM.node_lookup[PAIRS[mi][node.data.id][0].id2];
        } else if (node.data.id in LINKS[mi] && LINKS[mi][node.data.id].p5 && LINKS[mi][node.data.id].p3) {
            /* use link neighbors to define angle */
            n1 = LCM.node_lookup[LINKS[mi][node.data.id].p5];
            n2 = LCM.node_lookup[LINKS[mi][node.data.id].p3];
        } else if (node.data.id in LINKS[mi] && Object.keys(LINKS[mi]).length > 2) {
            /* use linked neighbor for angle */
            if (LINKS[mi][node.data.id].p3) return getNucleotideAngle(LCM.node_lookup[LINKS[mi][node.data.id].p3]);
            if (LINKS[mi][node.data.id].p5) return getNucleotideAngle(LCM.node_lookup[LINKS[mi][node.data.id].p5]);
        } else {
            return 0.0;
        }

        dx = (n1.x + n2.x) / 2 - node.x;
        dy = (n1.y + n2.y) / 2 - node.y;

        theta = Math.atan2(dy, dx);
        if (theta < 0) {
            return 360 + 180 * Math.atan2(dy, dx) / Math.PI;
        } else {
            return 180 * Math.atan2(dy, dx) / Math.PI;
        }
    }

    function rotateAbout(cx, cy, x, y, theta) {
        let rx, ry;
        theta = Math.PI * theta / 180;
        rx = Math.cos(theta) * (x - cx) - Math.sin(theta) * (y - cy) + cx;
        ry = Math.sin(theta) * (x - cx) + Math.cos(theta) * (y - cy) + cy;
        return [rx, ry];
    }

    function forceAngle(links) {
        var strengths, // cached strength values from calling strength(node, i, nodes)
            strength; // function to compute strength of force on each node

        function force(alpha) {
            let v1, v2, F;
            for (let i = 0; i < links.length; i++) {
                if (links[i].type != "interaction") {
                    continue;
                }
                v1 = [links[i].target.x - links[i].source.x, links[i].target.y - links[i].source.y];
                v2 = [Math.cos(links[i].source.angle * Math.PI / 180), Math.sin(links[i].source.angle * Math.PI / 180)];

                F = rotationForce(v1, v2);

                links[i].target.vx -= alpha * strengths[i] * F[0];
                links[i].target.vy -= alpha * strengths[i] * F[1];
            }
        }

        function initialize() {
            // populate local `strengths` using `strength` accessor
            strengths = new Array(links.length);
            for (let i = 0; i < links.length; i++) strengths[i] = strength(links[i], i, links);
        }

        function rotationForce(v1, v2) {
            // Compute the force on node1 in transformed coordinate system
            let d = v1[0] * v2[0] + v1[1] * v2[1];
            let nv1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2);

            let fx1 = v2[0] / (nv1) - d * v1[0] / (nv1 ** 3);
            let fy1 = v2[1] / (nv1) - d * v1[1] / (nv1 ** 3);
            return [fx1, fy1];
        }

        force.initialize = function (_) {
            initialize();
        };

        force.strength = function (_) {
            if (_ == null) return strength;

            // coerce `strength` accessor into a function
            // if _ is a function, use it
            // else use function which returns +_
            strength = typeof _ === 'function' ? _ : () => +_;

            // reinitialize
            initialize();

            // allow chaining
            return force;
        };

        if (!strength) force.strength(20);
        return force;
    }

    function makeLinks(entity, node_sets, nodes, mi) {
        var node_links = [];
        var node_lines = [];
        var i, j, k, d, id;

        // add inter sugar-phosphate links
        for (i = 0; i < entity.strands.length; i++) {
            for (j = 0; j < entity.strands[i].ids.length - 1; j++) {
                node_lines.push({
                    source: PLOT_DATA.idMap[entity.strands[i].ids[j]],
                    target: PLOT_DATA.idMap[entity.strands[i].ids[j + 1]],
                    source_mty: "sr",
                    target_mty: "pp",
                    type: "linkage",
                    class: "linkage",
                    data: {
                        id1: entity.strands[i].ids[j],
                        id2: entity.strands[i].ids[j + 1]
                    },
                    opacity: 1.0
                });
            }
        }

        // add pairs
        for (i = 0; i < entity.pairs.length; i++) {
            id = entity.pairs[i];
            node_lines.push({
                source: PLOT_DATA.idMap[PAIRS[mi][id].id1],
                target: PLOT_DATA.idMap[PAIRS[mi][id].id2],
                type: PAIRS[mi][id]["pair_type"],
                class: PAIRS[mi][id]["pair_type"],
                source_mty: null,
                target_mty: null,
                data: PAIRS[mi][id],
                opacity: 1.0
            });
        }

        // add stacks
        for (i = 0; i < entity.stacks.length; i++) {
            id = entity.stacks[i];
            node_lines.push({
                source: PLOT_DATA.idMap[STACKS[mi][id].id1],
                target: PLOT_DATA.idMap[STACKS[mi][id].id2],
                type: "stack",
                class: "stack",
                source_mty: null,
                target_mty: null,
                data: STACKS[mi][id],
                opacity: 0.8
            });
        }

        // add nucleotide-residue links
        for (i = 0; i < node_sets.length; i++) {
            for (j = 0; j < node_sets[i].interactions.length; j++) {
                node_links.push({
                    type: "interaction",
                    source: node_sets[i].interactions[j].nuc,
                    target: node_sets[i].interactions[j].res,
                    strength: 0.5,
                    distance: LCM.link_distance.interaction
                });
                d = node_sets[i].interactions[j].data;
                for (k = 0; k < d["nucleotide_interaction_moieties"].length; k++) {
                    if (PLOT_DATA.dna_moieties.includes(d["nucleotide_interaction_moieties"][k])) {
                        node_lines.push({
                            type: "background",
                            class: "background",
                            source: node_sets[i].interactions[j].nuc,
                            target: node_sets[i].interactions[j].res,
                            source_mty: d["nucleotide_interaction_moieties"][k],
                            target_mty: null,
                            data: node_sets[i].interactions[j].data, 
                            opacity: 1.0 - 0.6*node_sets[i].interactions[j].data.weak_interaction
                        });
                        node_lines.push({
                            class: d["nucleotide_interaction_moieties"][k],
                            type: "interaction",
                            source: node_sets[i].interactions[j].nuc,
                            target: node_sets[i].interactions[j].res,
                            data: node_sets[i].interactions[j].data,
                            source_mty: d["nucleotide_interaction_moieties"][k],
                            target_mty: null,
                            opacity: 1.0 - 0.6*node_sets[i].interactions[j].data.weak_interaction
                        });
                        LCM.node_lookup[node_sets[i].interactions[j].res].total_interactions += 1;
                        LCM.node_lookup[node_sets[i].interactions[j].res].active_interactions += 1;
                    }
                }
            }
        }
        return [node_links, node_lines];
    }
    
    function makeNodes(entity, interfaces, mi, scale) {
        
        function makeCoordinateSystem(mi, scale, strand_ids, pair_ids=null) {
            /* get an array of valid nucleotide indices to use */
            let indices = [];
            for (let i = 0; i < strand_ids.length; i++) {
                indices.push(i);
            }
            switch(LCM.layout_type) {
                case "radial":
                    let filtered = indices.filter(function(i) {
                        return PAIRS[mi][getHash(strand_ids[i], pair_ids[i])]["pair_type"] != "other";
                    });
                    if( (indices.length-filtered.length)/indices.length < 0.75) {
                        indices = filtered;
                    }
                    break;
                case "circular":
                    break;
            }
            /* get an array of points which lie along the strand */
            let cx = 0.0;
            let cy = 0.0;
            let dx, dy, px, py, partner, nid, norm;
            for (let i = 0; i < indices.length; i++) {
                nid = strand_ids[indices[i]];
                cx += LCM.graph_coordinates[nid].x;
                cy += LCM.graph_coordinates[nid].y;
            }
            cx /= indices.length;
            cy /= indices.length;

            let points = [];
            for (let i = 0; i < indices.length; i++) {
                nid = strand_ids[indices[i]];
                dx = [0.0, 0.0];
                dy = [0.0, 0.0];
                
                if (indices[i] > 0) {
                    dy[0] += (LCM.graph_coordinates[nid].x - LCM.graph_coordinates[strand_ids[indices[i]-1]].x);
                    dy[1] += (LCM.graph_coordinates[nid].y - LCM.graph_coordinates[strand_ids[indices[i]-1]].y);
                }

                if (i < indices.length-1) {
                    dy[0] += (LCM.graph_coordinates[strand_ids[indices[i+1]]].x - LCM.graph_coordinates[nid].x);
                    dy[1] += (LCM.graph_coordinates[strand_ids[indices[i+1]]].y - LCM.graph_coordinates[nid].y);
                }
                
                // orthnormalize the coordinates
                norm = Math.sqrt(dy[0]**2 + dy[1]**2);
                dy[0] /= norm;
                dy[1] /= norm;
                dx[0] = -dy[1];
                dx[1] = dy[0];
                
                // adjust sign of dx if needed
                partner = pair_ids[indices[i]];
                px = LCM.graph_coordinates[partner].x;
                py = LCM.graph_coordinates[partner].y;
                if (dx[0]*(px-cx) + dx[1]*(py-cy) > 0) {
                    dx[0] = -dx[0];
                    dx[1] = -dx[1];
                }
                
                points.push({
                    x: LCM.graph_coordinates[nid].x,
                    y: LCM.graph_coordinates[nid].y,
                    dx: dx,
                    dy: dy,
                    id: nid
                })
            }
            return [cx, cy, new kdTree(points, function(p1, p2) {return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);}, ["x", "y"])];
        }
        
        function optimizeSSEPositions(resPositions, cx, cy, kdT, hnodes, hlabels) {
            let dx, dy, point, posx, posy, i1, i2;
            let optSSEPosition = [];
            
            // get optimal SSE positions
            for (let sseID in resPositions) {
                posx = 0.0;
                posy = 0.0;
                for (let resID in resPositions[sseID].res_pos) {
                    posx += resPositions[sseID].res_pos[resID].x;
                    posy += resPositions[sseID].res_pos[resID].y;
                }
                posx /= resPositions[sseID].count;
                posy /= resPositions[sseID].count;
                point = kdT.nearest({x: posx, y: posy}, 1)[0][0];
                dx = point.dx;
                dy = point.dy;
                optSSEPosition.push({
                    d: (posx-cx)*dy[0] + (posy-cy)*dy[1],
                    h: resPositions[sseID].count/2,
                    id: sseID,
                    dx: dx,
                    dy: dy
                });
            }
            
            // sort and eliminate collisions
            optSSEPosition = optSSEPosition.sort(function (a, b) {
                return b.d - a.d;
            });
            if (optSSEPosition.length > 1) {
                i1 = Math.floor(optSSEPosition.length / 2) - 1;
                i2 = Math.floor(optSSEPosition.length / 2);
                ybound2 = optSSEPosition[i2].d + rpad * optSSEPosition[i2].h;
                ybound1 = optSSEPosition[i1].d - rpad * optSSEPosition[i1].h;
                if (ybound1 - ybound2 < rpad) {
                    optSSEPosition[i1].d += (rpad - (ybound1 - ybound2)) / 2;
                    optSSEPosition[i2].d -= (rpad - (ybound1 - ybound2)) / 2;
                }
                // adjust top-half
                for (var k = Math.floor(optSSEPosition.length / 2) - 1; k > 0; k--) {
                    ybound1 = optSSEPosition[k].d + rpad * optSSEPosition[k].h;
                    ybound2 = optSSEPosition[k - 1].d - rpad * optSSEPosition[k - 1].h;

                    if (ybound2 - ybound1 < rpad) {
                        optSSEPosition[k - 1].d += rpad - (ybound2 - ybound1);
                    }
                }
                
                // adjust bottom-half
                for (var k = Math.floor(optSSEPosition.length / 2); k < optSSEPosition.length - 1; k++) {
                    ybound1 = optSSEPosition[k + 1].d + rpad * optSSEPosition[k + 1].h;
                    ybound2 = optSSEPosition[k].d - rpad * optSSEPosition[k].h;

                    if (ybound2 - ybound1 < rpad) {
                        optSSEPosition[k + 1].d -= rpad - (ybound2 - ybound1);
                    }
                }
            }
            
            // adjust residue positions based on sse position. We sort the residues
            // based on their ideal position, then re-assign their positon
            // in order using rpad to space them equally
            let r, d, sseID;
            for (let j = 0; j < optSSEPosition.length; j++) {
                sseID = optSSEPosition[j].id;
                dx = optSSEPosition[j].dx;
                dy = optSSEPosition[j].dy;
                
                // sort child residues
                r = [];
                for (let resID in resPositions[sseID].res_pos) {
                    posx = resPositions[sseID].res_pos[resID].x;
                    posy = resPositions[sseID].res_pos[resID].y;
                    r.push({
                        id: resID,
                        d: (posx-cx)*dy[0] + (posy-cy)*dy[1]
                    });
                }
                r = r.sort(function (a, b) {
                    return b.d - a.d;
                });
                
                // work out positions
                d = optSSEPosition[j].d + rpad * Math.floor(resPositions[sseID].count / 2.0) / (2.0 - resPositions[sseID].count % 2);
                for (let k = 0; k < r.length; k++) {
                    hnodes[r[k].id].fx = cx + d*dy[0] + LCM.link_distance.interaction*dx[0];
                    hnodes[r[k].id].fy = cy + d*dy[1] + LCM.link_distance.interaction*dx[1];
                        
                    // assign other positions
                    hnodes[r[k].id].x = hnodes[r[k].id].fx;
                    hnodes[r[k].id].y = hnodes[r[k].id].fy;
                    hnodes[r[k].id]._x = hnodes[r[k].id].fx;
                    hnodes[r[k].id]._y = hnodes[r[k].id].fy;
                    hnodes[r[k].id]._fx = hnodes[r[k].id].fx;
                    hnodes[r[k].id]._fy = hnodes[r[k].id].fy;
                    
                    // assign label positions
                    hlabels[r[k].id].fx = hnodes[r[k].id].fx + 10*dx[0];
                    hlabels[r[k].id].fy = hnodes[r[k].id].fy + 10*dx[1];
                    
                    hlabels[r[k].id].x = hlabels[r[k].id].fx;
                    hlabels[r[k].id].y = hlabels[r[k].id].fy;
                    hlabels[r[k].id]._x = hlabels[r[k].id].fx;
                    hlabels[r[k].id]._y = hlabels[r[k].id].fy;
                    hlabels[r[k].id]._fx = hlabels[r[k].id].fx;
                    hlabels[r[k].id]._fy = hlabels[r[k].id].fy;
                    
                    d -= rpad;
                }
            }
        }
        
        function partitionInteractions(node_set, rid, num) {
            let node = node_set.residue_nodes[rid];
            let imin = -9999;
            let sets = [];
            let i, j, nid, new_set;
            
            node.nuc_ind.sort(function(a,b) {return a-b;}); // sort node nucleotide index list
            node_set.res_ids.splice(node_set.res_ids.indexOf(rid), 1); // remove rid from node_set residue id list
            
            // loop through node nucleotide indices and partition when needed
            i = 0;
            while(i < node.nuc_ind.length) {
                if(node.nuc_ind[i]-imin < 5) {
                    nid = node_set.nuc_ids[node.nuc_ind[i]];
                    j = 0;
                    // move nid-rid interaction from node_set to new_set
                    while (j < node_set.interactions.length) {
                        if (node_set.interactions[j].data.nuc_id == nid && node_set.interactions[j].data.res_id == rid) {
                            node_set.interactions[j].res = PLOT_DATA.idMap[rid] + '_' + new_set.num;
                            new_set.interactions.push(node_set.interactions.splice(j,1)[0]);
                            break;
                        } else {
                            j++
                        }
                    }
                    new_set.residue_nodes[rid].x += LCM.graph_coordinates[nid].x;
                    new_set.residue_nodes[rid].y += LCM.graph_coordinates[nid].y;
                    new_set.residue_nodes[rid].count += 1.0;
                    new_set.residue_nodes[rid].nuc_ind.push(node.nuc_ind[i]);
                    new_set.nuc_ids.push(nid);
                    i++;
                } else {
                    // create a new set
                    if (new_set) {
                        sets.push(new_set);
                    }
                    imin = node.nuc_ind[i];
                    new_set = {
                        num: num + sets.length,
                        res_ids: [rid],
                        helical: false,
                        nuc_ids: [],
                        interactions: [],
                        residue_nodes: {}
                    };
                    new_set.residue_nodes[rid] = {
                        x: 0.0,
                        y: 0.0,
                        count: 0.0,
                        nuc_ind: []
                    };
                }
            }
            sets.push(new_set);
            return sets;
        }
        
        var nodes = [];
        var labels = [];
        var nid, rid, node, label;
        var rpad = LCM.residue_padding;
        
        /* Set up graph coordinates lookup */
        LCM.graph_coordinates = {}
        switch (LCM.layout_type) {
            case "radial":
                for (let i = 0; i < entity["nucleotides"].length; i++) {
                    nid = entity["nucleotides"][i];
                    LCM.graph_coordinates[nid] = {
                        x: NUCLEOTIDES[nid].graph_coordinates[mi].radial.x * scale + LCM.cx,
                        y: NUCLEOTIDES[nid].graph_coordinates[mi].radial.y * scale + LCM.cy
                    }
                }
                break;
            case "circular":
                for (let i = 0; i < entity["nucleotides"].length; i++) {
                    nid = entity["nucleotides"][i];
                    LCM.graph_coordinates[nid] = {
                        x: NUCLEOTIDES[nid].graph_coordinates[mi].circular.x * scale + LCM.cx,
                        y: NUCLEOTIDES[nid].graph_coordinates[mi].circular.y * scale + LCM.cy
                    }
                }
                break;
        }
        
        /* Add nucleotide nodes */
        LCM.node_lookup = {};
        for (let i = 0; i < entity.nucleotides.length; i++) {
            nid = entity.nucleotides[i];
            node = {
                id: PLOT_DATA.idMap[nid],
                charge: LCM.charge,
                size: LCM.glyph_size.nucleotide,
                fx: LCM.graph_coordinates[nid].x,
                fy: LCM.graph_coordinates[nid].y,
                x: LCM.graph_coordinates[nid].x,
                y: LCM.graph_coordinates[nid].y,
                type: "nucleotide",
                data: NUCLEOTIDES[nid]
            }
            node._fx = node.fx;
            node._fy = node.fy;
            nodes.push(node);
            LCM.node_lookup[nid] = node;
            LCM.node_lookup[PLOT_DATA.idMap[nid]] = node;
        }
        
        // add sets of residues nodes, which are dependent on the layout type
        var node_sets = [];
        switch (LCM.layout_type) {
            case "radial":
                // add one set per helix strand and one for all non-helices
                node_sets.push({
                    num: 0,
                    helical: false,
                    res_ids: [],
                    nuc_ids: [],
                    interactions: [],
                    residue_nodes: {}
                }); // list of lists - used to duplicate some nodes for helix interactions

                // one set for all non-helical nucleotides
                for (let i = 0; i < entity.nucleotides.length; i++) {
                    if (NUCLEOTIDES[entity.nucleotides[i]].secondary_structure[mi] != "helical") {
                        node_sets[0].nuc_ids.push(entity.nucleotides[i]);
                    }
                }

                // add sets for each helix strand
                for (let i = 0; i < entity.helical_segments.length; i++) {
                    node_sets.push({
                        num: 2 * i + 1,
                        res_ids: [],
                        helical: true,
                        nuc_ids: entity.helical_segments[i].ids1,
                        pair_ids: entity.helical_segments[i].ids2,
                        interactions: [],
                        residue_nodes: {}
                    });
                    node_sets.push({
                        num: 2 * i + 2,
                        res_ids: [],
                        helical: true,
                        nuc_ids: entity.helical_segments[i].ids2,
                        pair_ids: entity.helical_segments[i].ids1,
                        interactions: [],
                        residue_nodes: {}
                    });
                }
                break;
            case "circular":
                for (let i = 0; i < entity.strands.length; i++) {
                    node_sets.push({
                        num: i,
                        res_ids: [],
                        helical: false,
                        nuc_ids: entity.strands[i].ids,
                        interactions: [],
                        residue_nodes: {}
                    });
                }
                break;
        }
        
        /* Add residue nodes */
        var nuc_angle;
        for(let k = 0; k < interfaces.length; k++) {
            for (let i = 0; i < interfaces[k]["nucleotide-residue_interactions"].length; i++) {
                if (interfaces[k]["nucleotide-residue_interactions"][i].include) {
                    rid = interfaces[k]["nucleotide-residue_interactions"][i].res_id;
                    nid = interfaces[k]["nucleotide-residue_interactions"][i].nuc_id;
                    // loop over node_sets
                    for (let j = 0; j < node_sets.length; j++) {
                        if (node_sets[j].nuc_ids.includes(nid)) {
                            if (! node_sets[j].res_ids.includes(rid)) {
                                node_sets[j].res_ids.push(rid);
                                node_sets[j].residue_nodes[rid] = {
                                    x: 0.0,
                                    y: 0.0,
                                    count: 0.0,
                                    nuc_ind: []
                                };
                            }
                            node_sets[j].interactions.push({
                                nuc: PLOT_DATA.idMap[nid],
                                res: PLOT_DATA.idMap[rid] + '_' + node_sets[j].num,
                                data: interfaces[k]["nucleotide-residue_interactions"][i]
                            });
                            nuc_angle = getNucleotideAngle(LCM.node_lookup[nid]) * Math.PI / 180;
                            node_sets[j].residue_nodes[rid].x += LCM.graph_coordinates[nid].x - Math.cos(nuc_angle) * (LCM.link_distance.interaction) + 10*Math.random()-5;
                            node_sets[j].residue_nodes[rid].y += LCM.graph_coordinates[nid].y - Math.sin(nuc_angle) * (LCM.link_distance.interaction) + 10*Math.random()-5;
                            node_sets[j].residue_nodes[rid].count += 1.0;
                            node_sets[j].residue_nodes[rid].nuc_ind.push(node_sets[j].nuc_ids.indexOf(nid));
                        }
                    }
                }
            }
        }
        
        // check for any nodes sets we need to break up
        var new_sets = [];
        for (let i = 0; i < node_sets.length; i++) {
            for (let rid in node_sets[i].residue_nodes) {
                node = node_sets[i].residue_nodes[rid];
                if(Math.max(...node.nuc_ind) - Math.min(...node.nuc_ind) > 4) {
                    // this residue spans many nucleotides - divide it between sets
                    new_sets = new_sets.concat(partitionInteractions(node_sets[i], rid, node_sets.length+new_sets.length));
                }
            }
        }
        node_sets = node_sets.concat(new_sets);
        
        // create residue nodes and their labels
        var cx, cy, kdT, hnodes, hlabels, optResPosition, coords, point;
        for (let i = 0; i < node_sets.length; i++) {
            // check if this is a helix-strand
            if(node_sets[i].helical) {
                optResPosition = {};
                hnodes = {};
                hlabels = {};
                
                // define a coordinate system for this strand
                coords = makeCoordinateSystem(mi, scale, node_sets[i].nuc_ids, node_sets[i].pair_ids);
                cx = coords[0];
                cy = coords[1];
                kdT = coords[2];
            }
            
            // iterate over each residue node in set
            for (let j = 0; j < node_sets[i].res_ids.length; j++) {
                rid = node_sets[i].res_ids[j];
                // average initial residue position
                node_sets[i].residue_nodes[rid].x /= node_sets[i].residue_nodes[rid].count;
                node_sets[i].residue_nodes[rid].y /= node_sets[i].residue_nodes[rid].count;
                
                // residue node
                node = {
                    id: PLOT_DATA.idMap[rid] + '_' + node_sets[i].num,
                    charge: LCM.charge,
                    size: getMarkerSize(RESIDUES[rid], LCM.min_marker_size, "residue"),
                    type: "residue",
                    data: RESIDUES[rid],
                    x: node_sets[i].residue_nodes[rid].x,
                    y: node_sets[i].residue_nodes[rid].y,
                    fx: null,
                    fy: null,
                    count: 0.0,
                    com_id: rid,
                    total_interactions: 0,
                    active_interactions: 0,
                    angle: null
                };
                
                // label node
                label = {
                    res_id: rid,
                    label: PLOT_DATA.labels[rid]
                };
                
                if(node_sets[i].helical) {
                    point = kdT.nearest({x: node_sets[i].residue_nodes[rid].x, y: node_sets[i].residue_nodes[rid].y}, 1)[0][0];
                    
                    // get ideal position
                    node.fx = node.x + LCM.link_distance.interaction*point.dx[0];
                    node.fy = node.y + LCM.link_distance.interaction*point.dx[1];

                    if (!(SSE[mi][rid].id in optResPosition)) {
                        optResPosition[SSE[mi][rid].id] = {
                            count: 0.0,
                            res_pos: {}
                        };
                    }
                    optResPosition[SSE[mi][rid].id].count += 1;
                    optResPosition[SSE[mi][rid].id].res_pos[rid] = {
                        x: node.fx,
                        y: node.fy
                    };
                    
                    hnodes[rid] = node;
                    hlabels[rid] = label;
                }
                nodes.push(node);
                labels.push(label);
                LCM.node_lookup[node.id] = node;
            }
            
            // iterate over each nucleotide node in set 
            for (let j = 0; j < node_sets[i].nuc_ids.length; j++) {
                // set nucleotide angle
                LCM.node_lookup[node_sets[i].nuc_ids[j]].angle = getNucleotideAngle(LCM.node_lookup[node_sets[i].nuc_ids[j]]);
            }
            
            if(node_sets[i].helical) {
                optimizeSSEPositions(optResPosition, cx, cy, kdT, hnodes, hlabels);
            }
        }
        return [nodes, node_sets, labels];
    }

    function makeLegend(w, h) {
        var width = 225;
        var height = 180;
        var cx = 45;
        var cy = 25;
        
        var x2 = 4*width/7;
        
        var legend = LCM.svg.append("g")
            .attr("id", "lcm_legend")
            .attr("class", "legend")
            .attr("cursor", "move")
            .data([{
                x: 0.0,
                y: 0.0
             }])
            .call(d3.drag()
                .on("drag", function (d) {
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;
                    d3.select(this)
                        .attr("transform", "translate(" +
                            Math.max(0, Math.min(w - width, d.x)) +
                            ", " +
                            Math.max(0, Math.min(h - height, d.y)) +
                            ")"
                        )
                })
            );

        legend.append("rect")
            .attr("class", "border")
            .attr("width", width)
            .attr("height", height);

        /* nucleotide moiety */
        legend.append("circle")
            .attr("class", "wg shape")
            .attr("r", LCM.glyph_size.wg)
            .attr("cy", cy + LCM.glyph_size.rect_h)
            .attr("cx", cx)
            .attr("fill", PLOT_DATA.colors.wg);

        legend.append("circle")
            .attr("class", "sg shape")
            .attr("r", LCM.glyph_size.sg)
            .attr("cy", cy - LCM.glyph_size.rect_h)
            .attr("cx", cx)
            .attr("fill", PLOT_DATA.colors.sg);

        legend.append("circle")
            .attr("class", "pp shape")
            .attr("r", LCM.glyph_size.phosphate)
            .attr("cx", cx - LCM.glyph_size.phosphate_c)
            .attr("cy", cy)
            .attr("fill", PLOT_DATA.colors.pp);

        legend.append("polygon")
            .attr("class", "sr shape")
            .attr("points", LCM.pentagon_points)
            .attr("fill", PLOT_DATA.colors.sr)
            .attr("transform", `translate(${cx}, ${cy})`);

        legend.append("rect")
            .attr("width", 2 * LCM.glyph_size.rect_w)
            .attr("height", 2 * LCM.glyph_size.rect_h)
            .attr("class", "base shape")
            .attr("rx", 3)
            .attr("ry", 3)
            .attr("transform", `translate(${cx-LCM.glyph_size.rect_w}, ${cy-LCM.glyph_size.rect_h})`);

        legend.append("text")
            .attr("x", cx)
            .attr("y", cy)
            .attr("text-anchor", "middle")
            .style("dominant-baseline", "middle")
            .text("N");

        /* moiety labels */
        var lh = 15;
        var lw = 15;
        var lm = 10;
        var mty_data = d3.range(cy + 30, cy + 30 + 5 * 1.5 * lh, 1.5 * lh).map(function (d, i) {
            return {
                fill: PLOT_DATA.colors[PLOT_DATA.dna_moiety_keys[i]],
                label: PLOT_DATA.moiety_labels[PLOT_DATA.dna_moiety_keys[i]],
                y: d
            };
        });

        var dna_labels = legend.append("g")
            .selectAll("g")
            .data(mty_data)
            .enter()
            .append("g");

        dna_labels.append("rect")
            .attr("x", lm)
            .attr("y", function (d) {
                return d.y;
            })
            .attr("width", lw)
            .attr("height", lh)
            .attr("fill", function (d) {
                return d.fill
            });

        dna_labels.append("text")
            .attr("x", lm + lw + 5)
            .attr("y", function (d) {
                return d.y;
            })
            .text(function (d) {
                return d.label;
            });

        /* line labels */
        var ll = [
                "W.C. BP",
                "Hoog. BP",
                "Other BP",
                "Stacking",
                "Linkage"
            ];
        var lc = [
                "watson-crick",
                "hoogsteen",
                "other",
                "stack",
                "linkage"
            ];
        var end = cy - 10 + 1.5 * lc.length * lh;
        var line_data = d3.range(cy - 10, end, 1.5 * lh).map(function (d, i) {
            return {
                class: lc[i],
                label: ll[i],
                y: d
            };
        });

        var line_labels = legend.append("g")
            .attr("class", "lines")
            .selectAll("g")
            .data(line_data)
            .enter()
            .append("g");

        line_labels.append("line")
            .attr("class", function (d) {
                return d.class;
            })
            .attr("y1", function (d) {
                return d.y;
            })
            .attr("y2", function (d) {
                return d.y;
            })
            .attr("x1", x2)
            .attr("x2", x2 + lw);

        line_labels.append("text")
            .attr("x", x2 + lw + 5)
            .attr("y", function (d) {
                return d.y;
            })
            .style("dominant-baseline", "middle")
            .text(function (d) {
                return d.label;
            });
        
        // residue shape symbols
        var ssl = [
                "Helix",
                "Strand",
                "Loop"
            ];
        var shape = [
                d3.symbolCircle,
                d3.symbolTriangle,
                d3.symbolSquare
            ];

        var ss_data = d3.range(end + 5, end + 5 + 1.2*ssl.length * lh, 1.2*lh).map(function (d, i) {
            return {
                label: ssl[i],
                shape: shape[i],
                y: d
            };
        });

        var ss_labels = legend.append("g")
            .selectAll("g")
            .data(ss_data)
            .enter()
            .append("g");

        ss_labels.append("path")
            .attr("d", d3.symbol().size(75).type(function (d) {
                return d.shape;
            }))
            .attr("transform", function (d) {
                return `translate(${x2+lw/2}, ${d.y})`;
            });

        ss_labels.append("text")
            .attr("x", x2 + lw + 5)
            .attr("y", function (d) {
                return d.y;
            })
            .style("dominant-baseline", "middle")
            .text(function (d) {
                return d.label;
            });
        return legend;
    }
    
    /* function which updates links and base_nodes SVG elements */
    function ticked() {
        let x, y, c, d, gl, dl, dx, dy;
        for (let i = 0; i < node_data.length; i++) {
            d = node_data[i];
            if (isNaN(d.x) || isNaN(d.vx)) {
                d.x = d._fx;
                d.vx = 0;
            }
            if (isNaN(d.y) || isNaN(d.vy)) {
                d.y = d._fy;
                d.vy = 0;
            }
            if (d.type == "nucleotide") {
                d.angle = getNucleotideAngle(d);
                // wg postion
                x = d.x;
                y = d.y + LCM.glyph_size.rect_h;
                c = rotateAbout(d.x, d.y, x, y, d.angle);
                d.wg_x = c[0];
                d.wg_y = c[1];
                // sg position
                x = d.x;
                y = d.y - LCM.glyph_size.rect_h;
                c = rotateAbout(d.x, d.y, x, y, d.angle);
                d.sg_x = c[0];
                d.sg_y = c[1];
                // sugar position
                x = d.x - LCM.glyph_size.sugar_c;
                y = d.y
                c = rotateAbout(d.x, d.y, x, y, d.angle);
                d.sr_x = c[0];
                d.sr_y = c[1];
                // phosphate position
                x = d.x - LCM.glyph_size.phosphate_c;
                y = d.y
                c = rotateAbout(d.x, d.y, x, y, d.angle);
                d.pp_x = c[0];
                d.pp_y = c[1];
            }
            
            // update label positions
            if (d.type == "residue" && LCM.ended) {
                dx = d.x - d._x;
                dy = d.y - d._y;
                d.label_data.x += dx;
                d.label_data.y += dy;
                d._x = d.x;
                d._y = d.y;
            } else {
                d._x = d.x;
                d._y = d.y;
            }
        }

        // translate node group
        g_nodes.attr("transform", function (d) {
            if (d.type == "nucleotide") {
                return `translate(${d.x}, ${d.y}) rotate(${d.angle})`;
            } else {
                return `translate(${d.x}, ${d.y})`;
            }
        });

        // unrotate text
        g_nodes.selectAll("text")
            .attr("transform", transformTextLCM);
        
        g_labels.selectAll(".label")
            .attr("transform", transformTextLCM);
        
        // update lines
        g_lines.attr("x1", function (d) {
                switch (d.source_mty) {
                case "sr":
                    return d.source.sr_x;
                    break;
                case "wg":
                    return d.source.wg_x;
                    break;
                case "sg":
                    return d.source.sg_x;
                    break;
                case "pp":
                    return d.source.pp_x;
                    break;
                default:
                    return d.source.x;
                }
            })
            .attr("y1", function (d) {
                switch (d.source_mty) {
                case "sr":
                    return d.source.sr_y;
                    break;
                case "wg":
                    return d.source.wg_y;
                    break;
                case "sg":
                    return d.source.sg_y;
                    break;
                case "pp":
                    return d.source.pp_y;
                    break;
                default:
                    return d.source.y;
                }
            })
            .attr("x2", function (d) {
                switch (d.target_mty) {
                case "sr":
                    return d.target.sr_x;
                    break;
                case "wg":
                    return d.target.wg_x;
                    break;
                case "sg":
                    return d.target.sg_x;
                    break;
                case "pp":
                    return d.target.pp_x;
                    break;
                default:
                    return d.target.x;
                }
            })
            .attr("y2", function (d) {
                switch (d.target_mty) {
                case "sr":
                    return d.target.sr_y;
                    break;
                case "wg":
                    return d.target.wg_y;
                    break;
                case "sg":
                    return d.target.sg_y;
                    break;
                case "pp":
                    return d.target.pp_y;
                    break;
                default:
                    return d.target.y;
                }
            });
        
        // update label positions if residue is dragged
    }

    function dragstarted(d) {
        if (!d3.event.active && LCM.toggle == 'ON') LCM.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(d) {
        if(LCM.toggle == 'ON') {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
        } else {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
            d.x = d3.event.x;
            d.y = d3.event.y;
            ticked();
        }
    }

    function dragended(d) {
        if (!d3.event.active && LCM.toggle == 'ON') LCM.simulation.alphaTarget(0);
    }

    /* initialize some plotting parameters */
    LCM.glyph_size.sugar_c = LCM.glyph_size.rect_w + LCM.glyph_size.sugar * Math.tan(Math.PI / 5);
    LCM.glyph_size.phosphate_c = LCM.glyph_size.sugar_c + LCM.glyph_size.phosphate;
    var c1 = -LCM.glyph_size.sugar * (Math.sqrt(5) - 1) / 4 - LCM.glyph_size.sugar_c,
        c2 = -LCM.glyph_size.sugar * (Math.sqrt(5) + 1) / 4 + LCM.glyph_size.sugar_c,
        c3 = -LCM.glyph_size.sugar - LCM.glyph_size.sugar_c,
        s1 = LCM.glyph_size.sugar * Math.sqrt(10 + 2 * Math.sqrt(2)) / 4,
        s2 = LCM.glyph_size.sugar * Math.sqrt(10 - 2 * Math.sqrt(2)) / 4,
        s3 = 0;
    LCM.pentagon_points = `${c3},${s3} ${c1},${s1} ${-c2},${s2} ${-c2},${-s2} ${c1},${-s1}`;
    LCM.cx = LCM.width / 2;
    LCM.cy = LCM.height / 2;
    LCM.hidden_elements = [];
    
    /* simulation variables */
    var base_nodes,
        back_nodes,
        base_links,
        back_links,
        g_nodes,
        g_links;

    /* data structures */
    var entity = ENTITIES[mi][dna_entity_id];
    var scale;
    switch (LCM.layout_type) {
        case "radial":
            scale = LCM.link_distance.linkage / entity.visualization.radial.link_distance;
            break;
        case "circular":
            scale = LCM.link_distance.linkage / entity.visualization.circular.link_distance;
    }

    /* get the link and node data */
    var nd = makeNodes(entity, interfaces, mi, scale);
    var node_data = nd[0];
    var node_sets = nd[1];
    var node_labels = nd[2];
    var ld = makeLinks(entity, node_sets, node_data, mi);
    var link_data = ld[0];
    var line_data = ld[1];
    
    /* initialize line source/targets */
    for (let i = 0; i < line_data.length; i++) {
        line_data[i].source = LCM.node_lookup[line_data[i].source];
        line_data[i].target = LCM.node_lookup[line_data[i].target];
    }

    /* set up SVG Element */
    $("#lcm_plot").empty();
    var svg = d3.select("#lcm_plot")
        .append("svg")
        .attr("id", "lcm_svg")
        .attr("width", LCM.width)
        .attr("height", LCM.height)
        .attr("border", 1)
        .on("click", selectClick);
    LCM.svg = svg;
    
    // add x grid-lines
    var xScale = d3.scaleLinear().range([0, LCM.width])
        .domain([0, LCM.width]);
    var xgrid = d3.axisBottom(xScale)
        .ticks(Math.round(LCM.width/30))
        .tickSize(LCM.height)
        .tickFormat("");
    
    svg.append("g")
        .attr("class", "grid")
        .attr("id", "lcm_xgrid")
        .attr("visibility", "hidden")
        .call(xgrid);
    
    // add y grid-lines
    var yScale = d3.scaleLinear().range([0, LCM.height])
        .domain([0, LCM.height]);
    var ygrid = d3.axisLeft(yScale)
        .ticks(Math.round(LCM.height/30))
        .tickSize(LCM.width)
        .tickFormat("");
    
    svg.append("g")
        .attr("class", "grid")
        .attr("id", "lcm_ygrid")
        .attr("visibility", "hidden")
        .attr("transform", `translate(${LCM.width},0)`)
        .call(ygrid);
    
    // add legend
    var legend = makeLegend(LCM.width, LCM.height);

    // add container element for dragging/zooming
    var gt = svg.append("g")
        .attr("class", "pan_zoom");

    var gr = gt.append("g")
        .attr("class", "rotate");

    // add links
    g_lines = gr.append("g")
        .attr("class", "lines")
        .selectAll("line")
        .data(line_data)
        .enter()
        .append("line")
        .attr("class", function (d) {
            return d.class;
        })
        .attr("stroke-opacity", function(d) {
            return d.opacity;
        })
        .on('mouseover', toolTipIn)
        .on('mouseout', toolTipOut);

    // set up nodes
    g_nodes = gr.append("g")
        .attr("class", "nodes")
        .selectAll("g")
        .data(node_data)
        .enter()
        .append("g")
        .attr("class", function (d) {
            return d.type;
        })
        .attr("id", function (d) {
            return d.id;
        })
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );
    
    svg.selectAll(".nucleotide")
        .attr("data-com_id", function (d) {
            return d.id;
        })
        .on('click', selectClick);
    
    // add major groove markers
    svg.selectAll(".nucleotide")
        .append("circle")
        .attr("class", "wg")
        .attr("r", LCM.glyph_size.wg)
        .attr("cy", LCM.glyph_size.rect_h)
        .attr("fill", function (d) {
            if (d.data.interacts.wg) {
                return PLOT_DATA.colors.wg;
            } else {
                return "#fff";
            }
        })
        .each(function(d) {
            if (! (d.data.secondary_structure[mi] == "helical")) {
                this.setAttribute("visibility", "hidden");
            }
        });

    // add minor groove markers
    svg.selectAll(".nucleotide")
        .append("circle")
        .attr("class", "sg")
        .attr("r", LCM.glyph_size.sg)
        .attr("cy", -LCM.glyph_size.rect_h)
        .attr("fill", function (d) {
            if (d.data.interacts.sg) {
                return PLOT_DATA.colors.sg;
            } else {
                return "#fff";
            }
        })
        .each(function(d) {
            if (! (d.data.secondary_structure[mi] == "helical")) {
                this.setAttribute("visibility", "hidden");
            }
        });


    // add phosphate markers
    svg.selectAll(".nucleotide")
        .append("circle")
        .attr("class", "pp")
        .attr("r", LCM.glyph_size.phosphate)
        .attr("cx", -LCM.glyph_size.phosphate_c)
        .attr("fill", function (d) {
            if (d.data.interacts.pp) {
                return PLOT_DATA.colors.pp;
            } else {
                return "#fff";
            }
        })
        .each(function(d) {
            if (! d.data.phosphate_present) {
                this.setAttribute("visibility", "hidden");
            }
        });

    // add sugar markers
    svg.selectAll(".nucleotide")
        .append("polygon")
        .attr("class", "sr")
        .attr("points", LCM.pentagon_points)
        .attr("fill", function (d) {
            if (d.data.interacts.sr) {
                return PLOT_DATA.colors.sr;
            } else {
                return "#fff";
            }
        });

    // add base markers
    svg.selectAll(".nucleotide")
        .append("rect")
        .attr("width", 2 * LCM.glyph_size.rect_w)
        .attr("height", 2 * LCM.glyph_size.rect_h)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("transform", `translate(-${LCM.glyph_size.rect_w}, -${LCM.glyph_size.rect_h})`)
        .style("stroke-width", function (d) {
            if (d.data.interacts.bs) {
                return "2px";
            } else {
                return "1px";
            }
        })
        .on('mouseover', toolTipIn)
        .on('mouseout', toolTipOut);
    
    svg.selectAll(".nucleotide")
        .append("rect")
        .attr("width", 2 * LCM.glyph_size.rect_w)
        .attr("height", 2 * LCM.glyph_size.rect_h)
        .attr("rx", 3)
        .attr("ry", 3)
        .attr("transform", `translate(-${LCM.glyph_size.rect_w}, -${LCM.glyph_size.rect_h})`)
        .style("fill", "none")
        .style("stroke", PLOT_DATA.colors.bs)
        .style("stroke-width", "1px")
        .attr("stroke-opacity", function (d) {
            if (d.data.interacts.bs) {
                return 1.0;
            } else {
                return 0.0;
            }
        });
    
    // add nucleotide labels
    svg.selectAll(".nucleotide")
        .append("text")
        .attr("data-com_id", function (d) {
            return PLOT_DATA.idMap[d.res_id];
        })
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text(function (d) {
            return PLOT_DATA.labels[d.data.id];
        });

    // add residue markers
    svg.selectAll(".residue")
        .append("path")
        .attr("d", d3.symbol().size(function (d) {
                return d.size;
            })
            .type(function (d) {
                switch (d.data.secondary_structure[mi]) {
                    case "H":
                        return d3.symbolCircle;
                    case "S":
                        return d3.symbolTriangle;
                    case "L":
                        return d3.symbolSquare;
                }
            })
        )
        .attr("class", function (d) {
            return d.data.secondary_structure[mi];
        })
        .attr("data-com_id", function (d) {
            return PLOT_DATA.idMap[d.data.id];
        })
        .attr("data-chain", function (d) {
            return d.data.chain;
        })
        .style("fill", function(d) {
            if(d.data.chain in PLOT_DATA.active_colors[d.data.secondary_structure[mi]]) {
                return PLOT_DATA.active_colors[d.data.secondary_structure[mi]][d.data.chain];
            } else {
                return null;
            }
        })
        .on('mouseover', toolTipIn)
        .on('mouseout', toolTipOut)
        .on('click', selectClick);
    
    
    /* set up the Force Layout Simulation */
    var g_labels = gr.append("g")
        .attr("class", "labels");
    LCM.ended = false;
    LCM.simulation = d3.forceSimulation()
        .nodes(node_data)
        .on("tick", ticked)
        .on("end", function () {
            LCM.node_data = node_data;
            placeLabelsForce(node_data.filter(item => item.type == 'residue'), node_labels, LCM, g_labels, 
                {
                    callback: function(gl) {
                        gl.selectAll("g.label")
                            .attr("data-node_id", function (d) {
                                return d.node.id;
                            });
                    },
                    link_distance: 5,
                    label_destination: LCM.node_data
                }
            );
            LCM.ended = true;
            LCM.simulation.on("end", null);
        })
        .force("link", d3.forceLink(link_data)
            .id(function (d, index) {
                return d.id;
            })
            .distance(function (d, index) {
                return d.distance;
            })
            .strength(function (d, index) {
                return d.strength;
            })
        )
        .force("charge", d3.forceManyBody()
            .strength(function (d, index) {
                return d.charge;
            })
            .distanceMax(1.25 * LCM.link_distance.interaction)
        )
        /*
        .force("angle", forceAngle(link_data)
            .strength(200)
        )
        */
        .alphaDecay(0.06)
        .velocityDecay(0.2);
    
    // add zoom capabilities
    var zoom_handler = d3.zoom()
        .scaleExtent([1/4, 3])
        .wheelDelta(function(){
            return -Math.sign(d3.event.deltaY)*0.1;
        })
        .on("zoom", function () {
            gt.attr("transform", d3.event.transform);
        });
    zoom_handler(svg);
}

function makePCM(helix, mi, ent_id) {
    /* Generate the polar contact map */
    function range(start, count) {
        if (arguments.length == 1) {
            count = start;
            start = 0;
        }

        var foo = [];
        for (var i = 0; i < count; i++) {
            foo.push(start + i);
        }
        return foo;
    }

    function makeNodes(helix, mi, ent_id, radius) {
        
        function addNodes(nid) {
            var sse_id, mty, key;
            if (nid in NS_INTERACTIONS[mi][ent_id]) {
                // loop over sse-nucleotide interactions
                for (let i = 0; i < NS_INTERACTIONS[mi][ent_id][nid].length; i++) {
                    sse_id = NS_INTERACTIONS[mi][ent_id][nid][i].sse_id;
                    // check if include this SSE
                    if (! SSE[mi][sse_id].include) {
                        continue;
                    }
                    
                    // check which moieties it interacts with
                    for (let j = 0; j < PLOT_DATA.dna_moieties.length; j++) {
                        mty = PLOT_DATA.helical_moieties[j];
                        if (! SSE[mi][sse_id].interacts[mty]) {
                            continue;
                        }
                        // check if sse already in nodes
                        key = sse_id+mty;
                        if(key in nodes) {
                            continue;
                        }
                        
                        if(SSE_INTERFACE_DATA[mi][ent_id][sse_id].helicoidal_coordinates) {
                            nodes[key] = {
                                phi: SSE_INTERFACE_DATA[mi][ent_id][sse_id].helicoidal_coordinates.phi,
                                rho: SSE_INTERFACE_DATA[mi][ent_id][sse_id].helicoidal_coordinates.rho,
                                data: SSE[mi][sse_id],
                                x: null,
                                y: null,
                                type: "sse",
                                moiety: mty,
                                sse_id: sse_id,
                                label_id: sse_id,
                                com_id: sse_id,
                                size: getMarkerSize(SSE[mi][sse_id], PCM.min_marker_size, "sse", mty)
                            };
                            rho[mty].push(SSE_INTERFACE_DATA[mi][ent_id][sse_id].helicoidal_coordinates.rho);
                        }
                    }
                }
            }
        }
        
        var nodes = {};
        var rho = {};
        for (let i = 0; i < PLOT_DATA.helical_moieties.length; i++) {
            rho[PLOT_DATA.helical_moieties[i]] = [];
        }
        
        /* loop over each nucleotide in helix */
        for (let i = 0; i < helix.length; i++) {
            id1 = helix.ids1[i];
            id2 = helix.ids2[i];
            addNodes(id1);
            addNodes(id2);
        }
        
        /* scale rho values */
        var mty, rhomax, rhomin, rmin, rmax, scale;
        scale = {};
        for (let i = 0; i < PLOT_DATA.helical_moieties.length; i++) {
            mty = PLOT_DATA.helical_moieties[i];
            scale[mty] = {a: null, b: null};
            if (rho[mty].length == 0) {
                continue;
            }
            rhomax = Math.max(...rho[PLOT_DATA.helical_moieties[i]]);
            rhomin = Math.min(...rho[PLOT_DATA.helical_moieties[i]]);
            if (rhomax == rhomin) {
                scale[mty].a = ((i + 1.5) / rhomax);
                scale[mty].b = 0;
            } else {
                rmax = i + 1.6;
                rmin = i + 1.4;
                scale[mty].a = (rmax - rmin) / (rhomax - rhomin);
                scale[mty].b = ((rmax + rmin) - scale[mty].a * (rhomax + rhomin)) / 2;
            }
        }
        
        /* scale each node */
        nodes = Object.values(nodes);
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].rho = nodes[i].rho*scale[nodes[i].moiety].a + scale[nodes[i].moiety].b;
            nodes[i].x = nodes[i].rho*Math.cos(nodes[i].phi);
            nodes[i].y = nodes[i].rho*Math.sin(nodes[i].phi);
        }
        
        return nodes;     
    }
    
    function makeLegend(w, h) {
        var width = 145;
        var height = 75;

        var legend = PCM.svg.append("g")
            .attr("id", "pcm_legend")
            .attr("class", "legend")
            .attr("cursor", "move")
            .attr("transform", `translate(${w-width}, 0)`)
            .data([{
                x: w-width,
                y: 0.0
             }])
            .call(d3.drag()
                .on("drag", function (d) {
                    d.x += d3.event.dx;
                    d.y += d3.event.dy;
                    d3.select(this)
                        .attr("transform", "translate(" +
                            Math.max(0, Math.min(w - width, d.x)) +
                            ", " +
                            Math.max(0, Math.min(h - height, d.y)) +
                            ")"
                        )
                })
            );

        legend.append("rect")
            .attr("class", "border")
            .attr("width", width)
            .attr("height", height);
        
        // residue shape symbols
        var lh = 12;
        var lw = 15;
        var start = 15;
        var ssl = [
                "Helix SSE",
                "Strand SSE",
                "Loop SSE"
            ];
        
        var shape = [
                d3.symbolCircle,
                d3.symbolTriangle,
                d3.symbolSquare
            ];
        
        var ss_data = d3.range(start, start + 2 * ssl.length * lh, 2 * lh).map(function (d, i) {
            return {
                label: ssl[i],
                shape: shape[i],
                y: d
            };
        });

        var ss_labels = legend.append("g")
            .selectAll("g")
            .data(ss_data)
            .enter()
            .append("g");

        ss_labels.append("path")
            .attr("d", d3.symbol().size(75).type(function (d) {
                return d.shape;
            }))
            .attr("transform", function (d) {
                return `translate(${lw}, ${d.y})`;
            });

        ss_labels.append("text")
            .attr("x", 2*lw)
            .attr("y", function (d) {
                return d.y;
            })
            .style("dominant-baseline", "middle")
            .text(function (d) {
                return d.label;
            });
    }

    var data = d3.range(0, 2 * Math.PI, .01).map(function (t) {
        return [t, Math.sin(2 * t) * Math.cos(2 * t)];
    });

    var radius = Math.min(PCM.width, PCM.height) / 2 - PCM.padding;

    var r = d3.scaleLinear()
        .domain([0, PLOT_DATA.helical_moieties.length + 1])
        .range([0, radius]);
    
    /* Create the SVG */
    $("#pcm_plot").empty();
    PCM.svg = d3.select("#pcm_plot")
        .append("svg")
        .attr("id", "pcm_svg")
        .attr("width", PCM.width)
        .attr("height", PCM.height)
        .on("click", selectClick);
    
    PCM.cx = PCM.width / 2;
    PCM.cy = PCM.height / 2;
    
    /* Build the grid and tick labels */
    var g = PCM.svg.append("g")
        .attr("transform", "translate(" + PCM.cx + "," + PCM.cy + ")");
    
    var rticks = range(1, PLOT_DATA.helical_moieties.length + 1);
    rticks.forEach(function (item, index, array) {
        array[index] = r(item);
    });

    var gr = g.append("g")
        .attr("class", "pcm_axis")
        .selectAll("g")
        .data(rticks)
        .enter()
        .append("g");

    gr.append("circle")
        .attr("r", function (d) {
            return d;
        })
        .attr("fill", function (d, i) {
            return i == 0 ? "#777" : "none";
        });

    var tr = g.append("g")
        .attr("class", "pcm_axis")
        .selectAll("g")
        .data(rticks.slice(1))
        .enter()
        .append("g");
    
    tr.append("text")
        .attr("x", function (d) {
            return -d + r(0.5);
        })
        .attr("class", "sm")
        .style("text-anchor", "middle")
        .text(function (d, i) {
            return PLOT_DATA.moiety_labels[PLOT_DATA.helical_moieties[i]];
        });

    tr.append("text")
        .attr("x", function (d) {
            return d - r(0.5);
        })
        .attr("class", "sm")
        .style("text-anchor", "middle")
        .text(function (d, i) {
            return PLOT_DATA.moiety_labels[PLOT_DATA.helical_moieties[i]];
        });

    var ga = g.append("g")
        .attr("class", "pcm_axis")
        .selectAll("g")
        .data(d3.range(0, 360, 30))
        .enter()
        .append("g")
        .attr("transform", function (d) {
            return "rotate(" + -d + ")";
        });

    ga.append("line")
        .attr("x2", radius);

    ga.append("text")
        .attr("x", radius + 6)
        .attr("dy", ".35em")
        .style("text-anchor", function (d) {
            return d < 270 && d > 90 ? "end" : null;
        })
        .attr("transform", function (d) {
            return d < 270 && d > 90 ? "rotate(180 " + (radius + 6) + ",0)" : null;
        })
        .text(function (d) {
            return d + "°";
        });
    
    PCM.theta_grid = ga;
    PCM.moiety_labels = tr;
    
    /* make SSE nodes */
    var s = d3.scaleLinear()
        .range([-radius, radius])
        .domain([-PLOT_DATA.helical_moieties.length - 1, PLOT_DATA.helical_moieties.length + 1]);
    var node_data = makeNodes(helix, mi, ent_id, radius);
    var node_labels = []
    for (let i = 0; i < node_data.length; i++) {
        node_data[i].x = s(node_data[i].x);
        node_data[i].y = s(node_data[i].y);
        node_labels.push({
            label: PLOT_DATA.labels[mi][node_data[i].sse_id],
            fx: null,
            fy: null
        });
    }
    
    var gn = g.append("g")
        .attr("class", "nodes");
    gn.selectAll("g")
        .data(node_data)
        .enter()
        .append("g")
        .attr("class", function (d) {
            return d.type;
        })
        .attr("transform", function (d) {
            return `translate(${d.x}, ${d.y})`;
        });

    // add the sse nodes
    PCM.svg.selectAll(".sse")
        .append("path")
        .attr("d", d3.symbol()
            .size(function (d) {
                return d.size;
            })
            .type(function (d) {
                switch (d.data.secondary_structure) {
                    case "H":
                        return d3.symbolCircle;
                        break;
                    case "S":
                        return d3.symbolTriangle;
                        break;
                    case "L":
                        return d3.symbolSquare;
                        break;
                }
        }))
        .attr("class", function (d) {
            return d.data.secondary_structure;
        })
        .attr("data-com_id", function (d) {
            return PLOT_DATA.idMap[d.data.id];
        })
        .attr("data-chain", function (d) {
            return d.data.chain;
        })
        .style("fill", function(d) {
            if(d.data.chain in PLOT_DATA.active_colors[d.data.secondary_structure]) {
                return PLOT_DATA.active_colors[d.data.secondary_structure][d.data.chain];
            } else {
                return null;
            }
        })
        .on('mouseover', toolTipIn)
        .on('mouseout', toolTipOut)
        .on('click', selectClick);
    
    /* add sse labels */
    var gl = gn.append("g")
        .attr("class", "labels");
    placeLabelsForce(node_data, node_labels, PCM, gl);
    
    /* Make legend */
    makeLegend(PCM.width, PCM.height);
}

function initializeVisualizations() {
    /* handlebar tooltip templates */
    HB_TEMPLATES = {
        sse_tooltip: Handlebars.compile($("#sse_tooltip").html()),
        res_tooltip: Handlebars.compile($("#residue_tooltip").html()),
        nuc_tooltip: Handlebars.compile($("#nucleotide_tooltip").html()),
        res_int_tooltip: Handlebars.compile($("#residue_interaction_tooltip").html()),
        pro_chain_table_row: Handlebars.compile($("#protein_chain_table_row").html()),
        pro_entity_table_row: Handlebars.compile($("#protein_entity_table_row").html()),
        pro_segment_table_row: Handlebars.compile($("#protein_segment_table_row").html()),
        dna_entity_table_row: Handlebars.compile($("#dna_entity_table_row").html()),
        dna_strand_table_row: Handlebars.compile($("#dna_strand_table_row").html()),
        dna_helix_table_row: Handlebars.compile($("#dna_helix_table_row").html()),
        interface_table_row: Handlebars.compile($("#interface_table_row").html()),
        citation_table: Handlebars.compile($("#citation_table").html()),
        res_labels_row: Handlebars.compile($("#labels_res_format_row").html()),
        sse_labels_row: Handlebars.compile($("#labels_sse_format_row").html()),
        pro_color_row: Handlebars.compile($("#pro_color_input_row").html())
    };
    Handlebars.registerPartial('resFieldPartial', $("#labels_residue_format_input").html());
    Handlebars.registerPartial('sseFieldPartial', $("#labels_sse_format_input").html());
    Handlebars.registerPartial('colorPartial', $("#color_input_partial").html());
    
    /* ensure that JSON file is recognized as such */
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("application/json");
            }
        }
    });

    /* retrieve JSON file and get rolling */
    $.getJSON(JSON_URL, function (data) {
        DATA = data;
        var copy = JSON.parse(JSON.stringify(DATA));
        var i, j, mi, item, id, res;

        /* immutable lookup objects */
        NUCLEOTIDES = {};
        RESIDUES = {};

        /* list of lookup objects for each model */
        PAIRS = [];
        LINKS = [];
        STACKS = [];
        STRANDS = [];
        ENTITIES = [];
        INTERFACES = [];
        SSE = [];
        NR_INTERACTIONS = [];
        NS_INTERACTIONS = [];
        NUCLEOTIDE_INTERFACE_DATA = [];
        RESIDUE_INTERFACE_DATA = [];
        SSE_INTERFACE_DATA = [];

        // add nucleotide data
        for (i = 0; i < data.dna.nucleotides.length; i++) {
            NUCLEOTIDES[data.dna.nucleotides[i].id] = data.dna.nucleotides[i];
            escapeID(data.dna.nucleotides[i].id);
        }

        // add residue data
        for (i = 0; i < data.protein.residues.length; i++) {
            RESIDUES[data.protein.residues[i].id] = data.protein.residues[i];
            escapeID(data.protein.residues[i].id);
        }

        for (mi = 0; mi < data.num_models; mi++) {
            PAIRS.push({});
            STACKS.push({});
            LINKS.push({});
            STRANDS.push({});
            ENTITIES.push({});
            INTERFACES.push({});
            SSE.push({});
            NR_INTERACTIONS.push({});
            NS_INTERACTIONS.push({});
            NUCLEOTIDE_INTERFACE_DATA.push({});
            RESIDUE_INTERFACE_DATA.push({});
            SSE_INTERFACE_DATA.push({});
            PLOT_DATA.labels[mi] = {}; // store SSE labels

            // add pair data
            for (i = 0; i < data.dna.models[mi].pairs.length; i++) {
                item = data.dna.models[mi].pairs[i];
                PAIRS[mi][item.id] = item;
                if (!(item.id1 in PAIRS[mi])) {
                    PAIRS[mi][item.id1] = [];
                }
                if (!(item.id2 in PAIRS[mi])) {
                    PAIRS[mi][item.id2] = [];
                }
                PAIRS[mi][item.id1].push(item);
                PAIRS[mi][item.id2].push(item);
            }

            // add stack data
            for (i = 0; i < data.dna.models[mi].stacks.length; i++) {
                item = data.dna.models[mi].stacks[i];
                STACKS[mi][item.id] = item;
                if (!(item.id1 in STACKS[mi])) {
                    STACKS[mi][item.id1] = [];
                }
                if (!(item.id2 in STACKS[mi])) {
                    STACKS[mi][item.id2] = [];
                }
                STACKS[mi][item.id1].push(item);
                STACKS[mi][item.id2].push(item);
            }

            // add link data
            let p5, p3;
            for (i = 0; i < data.dna.models[mi].links.length; i++) {
                p5 = data.dna.models[mi].links[i]["5p_nuc_id"];
                p3 = data.dna.models[mi].links[i]["3p_nuc_id"];
                if (!(p5 in LINKS[mi])) {
                    LINKS[mi][p5] = {
                        p3: p3,
                        p5: null
                    };
                } else {
                    LINKS[mi][p5].p3 = p3;
                }
                if (!(p3 in LINKS[mi])) {
                    LINKS[mi][p3] = {
                        p3: null,
                        p5: p5
                    }
                } else {
                    LINKS[mi][p3].p5 = p5;
                }
            }

            // add DNA entitiy data
            for (i = 0; i < data.dna.models[mi].entities.length; i++) {
                item = data.dna.models[mi].entities[i];
                ENTITIES[mi][item.id] = item;
            }

            // add sse data 
            for (i = 0; i < data.protein.models[mi].secondary_structure_elements.length; i++) {
                item = data.protein.models[mi].secondary_structure_elements[i];
                SSE[mi][item.id] = item;
                escapeID(item.id);
                for (j = 0; j < item.residue_ids.length; j++) {
                    SSE[mi][item.residue_ids[j]] = item;
                }
            }

            /* 
                add nucleotide-residue interaction, nucleotide-sse interaction 
                and nucleotide interface data 
            */
            for (i = 0; i < data.interfaces.models[mi].length; i++) {
                id = data.interfaces.models[mi][i].dna_entity_id;
                if(! (id in INTERFACES[mi])) {
                    NR_INTERACTIONS[mi][id] = {};
                    NS_INTERACTIONS[mi][id] = {};
                    NUCLEOTIDE_INTERFACE_DATA[mi][id] = {};
                    RESIDUE_INTERFACE_DATA[mi][id] = {};
                    SSE_INTERFACE_DATA[mi][id] = {};
                    INTERFACES[mi][id] = [data.interfaces.models[mi][i]];
                } else {
                    INTERFACES[mi][id].push(data.interfaces.models[mi][i]);
                }

                for (j = 0; j < data.interfaces.models[mi][i]["nucleotide-residue_interactions"].length; j++) {
                    item = data.interfaces.models[mi][i]["nucleotide-residue_interactions"][j];
                    NR_INTERACTIONS[mi][id][getHash(item.nuc_id, item.res_id)] = item;
                    if (! (item.nuc_id in NR_INTERACTIONS[mi][id]) )  {
                        NR_INTERACTIONS[mi][id][item.nuc_id] = [];
                    }
                    NR_INTERACTIONS[mi][id][item.nuc_id].push(item);
                }

                for (j = 0; j < data.interfaces.models[mi][i]["nucleotide-sse_interactions"].length; j++) {
                    item = data.interfaces.models[mi][i]["nucleotide-sse_interactions"][j];
                    NS_INTERACTIONS[mi][id][getHash(item.nuc_id, item.sse_id)] = item;
                    if (! (item.nuc_id in NS_INTERACTIONS[mi][id]) )  {
                        NS_INTERACTIONS[mi][id][item.nuc_id] = [];
                    }
                    NS_INTERACTIONS[mi][id][item.nuc_id].push(item);
                }

                for (j = 0; j < data.interfaces.models[mi][i]["nucleotide_data"].length; j++) {
                    item = data.interfaces.models[mi][i]["nucleotide_data"][j];
                    NUCLEOTIDE_INTERFACE_DATA[mi][id][item.nuc_id] = item;
                }

                for (j = 0; j < data.interfaces.models[mi][i]["residue_data"].length; j++) {
                    item = data.interfaces.models[mi][i]["residue_data"][j];
                    RESIDUE_INTERFACE_DATA[mi][id][item.res_id] = item;
                }

                for (j = 0; j < data.interfaces.models[mi][i]["sse_data"].length; j++) {
                    item = data.interfaces.models[mi][i]["sse_data"][j];
                    SSE_INTERFACE_DATA[mi][id][item.sse_id] = item;
                }
            }
        }

        /* set up some form stuff */
        $('#exclude_nucleotide_select').SumoSelect({
            csvDispCount: 1,
            captionFormat: '{0} selected',
            captionFormatAllSelected: '{0} selected'
        });
        $('#exclude_residue_select').SumoSelect({
            csvDispCount: 1,
            captionFormat: '{0} selected',
            captionFormatAllSelected: '{0} selected'
        });
        $('#exclude_sse_select').SumoSelect({
            csvDispCount: 1,
            captionFormat: '{0} selected',
            captionFormatAllSelected: '{0} selected'
        });

        $('#protein_chains_select').SumoSelect({
            csvDispCount: 5,
            captionFormat: '{0} selected',
            captionFormatAllSelected: 'all chains selected',
        });
        item = "";
        for (i = 0; i < data.num_models; i++) {
            item += `<option value="${i}">${i}</option>`;
        }
        $('#model_select').append(item);
        $('#model_select').change(function () {
            entitySelectSetup(this.value);
        });
        entitySelectSetup(0);


        /* make plots */
        mi = 0;
        id = data.dna.models[mi].entities[0].id;
        makePlots(mi, id, $("#protein_chains_select").val());

        /* add data explorer */
        BigJsonViewerDom.fromObject(copy, {arrayNodesLimit: 25}).then(viewer => {
            const node = viewer.getRootElement();
            document.getElementById("json_data_explorer").appendChild(node);
            node.openAll(1);
        });

        /* make citation table */
        if(typeof(DATA.meta_data.citation_data) == "undefined") {
            PDB_STRUCTURE = false;
        }
        makeCitationTable();
    });
    
    /* Set up various UI events */
    $("#plot_button").click(function() {
        let mi = $("#model_select").val();
        let id = $("#entity_select").val();
        let pc = $("#protein_chains_select").val(); 
        makePlots(mi, id, pc);
    });

    $("#tooltip_on_button").change(function () { // bind a function to the change event
        if ($(this).is(":checked")) { // check if the radio is checked
            PLOT_DATA.tooltips = 'on';
        }
    });

    $("#tooltip_off_button").change(function () { // bind a function to the change event
        if ($(this).is(":checked")) { // check if the radio is checked
            PLOT_DATA.tooltips = 'off';
        }
    });

    $("#label_input_cancel_button").click(function () {
        d3.select("#label_input_div")
            .style("opacity", 0)
            .style("right", null)
            .style("top", null)
            .style("bottom", null)
            .style("left", null);
    });

    $("#label_input_submit_button").click(labelInputSubmit);

    $("#label_input").on('keyup', function (e) {
        if (e.keyCode == 13) {
            labelInputSubmit();
        }
    });

    $("#update_labels_button").click(applyLabelFormats);

    $("#update_colors_button").click(applyColorFormats);

    $('input[type=radio][name="all_chain_colors"]').change(function() {
        if (this.value == "off") {
            $("input[type=color][data-chain='_']").prop("disabled", true);
            $("#protein_color_rows input[type=color]").prop("disabled", false);
        } else {
            $("input[type=color][data-chain='_']").prop("disabled", false);
            $("#protein_color_rows input[type=color]").prop("disabled", true);
        }
    });

    $('input[type=radio][name="interaction_criteria"]').change(function() {
        if (this.value == "default") {
            $("#custom_interaction_inputs input").prop("disabled", true);
        } else {
            $("#custom_interaction_inputs input").prop("disabled", false);
        }
    });

    /* LCM Setup */
    // bind toggle button event
    $("#lcm_on_button").change(function () { // bind a function to the change event
        if ($(this).is(":checked")) { // check if the radio is checked
            LCM.toggle = 'ON';
        }
    });

    $("#lcm_off_button").change(function () { // bind a function to the change event
        if ($(this).is(":checked")) { // check if the radio is checked
            LCM.toggle = 'OFF'
        }
    });

    // bind hbond radio button event
    $('input[type=radio][name=show_hbonds]').change(function() {
        if (this.value == 'yes') {
            LCM.svg.selectAll(".background")
                .style("stroke", function(d) {
                    if(d.data.hbond_sum[d.source_mty].sc || d.data.hbond_sum[d.source_mty].mc) {
                        return "red";
                    } else {
                        return null;
                    }
            });
        }
        else if (this.value == 'no') {
            LCM.svg.selectAll(".background")
                .style("stroke", null);
        }
    });

    // reset DNA postions
    $("#lcm_reset_button").click(function () {
        LCM.simulation.stop();
        $.each(LCM.simulation.nodes(), function (i, d) {
            if (d.fx) d.fx = d._fx;
            if (d.fy) d.fy = d._fy;
            if (d._x) d.x = d._x;
            if (d._y) d.y = d._y;
        });
        LCM.simulation.alphaTarget(0.6).restart();
        $("#lcm_plot_rotation_slider").val(0).trigger("input");
        $("#lcm_label_rotation_slider").val(0).trigger("input");
        $("#lcm_label_scale_slider").val(1.0).trigger("input");
        $("input[type=radio][name=show_hbonds][value=no]").attr("checked", true).trigger("change");
    });

    // bind reflect x button event
    $("#lcm_reflectX_button").click(function () {
        LCM.simulation.stop();
        $.each(LCM.simulation.nodes(), function (i, d) {
            if (d.fx) d.fx += 2 * (LCM.cx - d.fx);
            if (d.label_data) d.label_data.x += 2 * (LCM.cx - d.label_data.x);
            d.x += 2 * (LCM.cx - d.x);
            d._x = d.x;
        });
        LCM.simulation.alphaTarget(0.6).restart();
    });

    // bind reflect y button event
    $("#lcm_reflectY_button").click(function () {
        LCM.simulation.stop();
        $.each(LCM.simulation.nodes(), function (i, d) {
            if (d.fy) d.fy += 2 * (LCM.cy - d.fy);
            if (d.label_data) d.label_data.y += 2 * (LCM.cy - d.label_data.y);
            d.y += 2 * (LCM.cy - d.y);
            d._y = d.y;
        });
        LCM.simulation.alphaTarget(0.6).restart();
    });

    // bind rotation range event
    $("#lcm_plot_rotation_slider").on('input', function () {
        if (!this.value) this.value = 0;
        LCM.theta = this.value;
        if(LCM.svg) {
            LCM.svg.select(".rotate")
                .attr("transform", `rotate(${LCM.theta}, ${LCM.cx}, ${LCM.cy})`);

            LCM.svg.selectAll(".nodes text")
                .attr("transform", transformTextLCM);
            LCM.svg.selectAll(".label")
                .attr("transform", transformTextLCM);
            LCM.svg.selectAll(".residue path")
                .attr("transform", `rotate(${-LCM.theta})`);
        }
    });

    // bind label rotation range event
    $("#lcm_label_rotation_slider").on('input', function () {
        if (!this.value) this.value = 0;
        LCM.label_theta = this.value;
        
        if(LCM.svg) {
            LCM.svg.selectAll(".nodes text")
                .attr("transform", transformTextLCM);
            LCM.svg.selectAll(".label")
                .attr("transform", transformTextLCM);
        }
    });

    // bind label scale range event
    $("#lcm_label_scale_slider").on('input', function () {
        if (!this.value) this.value = 0;
        LCM.label_scale = this.value;
        
        if(LCM.svg) {
            LCM.svg.selectAll(".nodes text")
                .attr("transform", transformTextLCM);
            LCM.svg.selectAll(".label")
                .attr("transform", transformTextLCM);
        }
    });

    // bind hide/show legend button event
    $("#lcm_legend_button").click(function () {
        var val = $(this).text();
        if (val == "hide legend") {
            $("#lcm_legend").attr("visibility", "hidden");
            $(this).text("show legend");
        } else {
            $("#lcm_legend").attr("visibility", "visible");
            $(this).text("hide legend");
        }
    });

    // bind hide/show residues button event 
    $("#lcm_residues_button").click(function () {
        var val = $(this).text();
        if (val == "hide residues") {
            LCM.svg.selectAll(".residue")
                .each(function() {
                    LCM.hidden_elements.push(this);
                });
            LCM.svg.selectAll(".label")
                .each(function() {
                    LCM.hidden_elements.push(this);
                });
            LCM.svg.selectAll("line.wg, line.sg, line.bs, line.sr, line.pp, line.background")
                .each(function() {
                    LCM.hidden_elements.push(this);
                });
            LCM.visifyComponents("hidden");
            $(this).text("show residues");
            $("#lcm_selected_button").prop("disabled", true);
        } else {
            $(this).text("hide residues");
            LCM.visifyComponents("visible");
            LCM.hidden_elements = [];
            $("#lcm_selected_button").prop("disabled", false);
        }
    });

    // bind hide/show selected button event 
    $("#lcm_selected_button").click(function () {
        var val = $(this).text();
        if (val == "hide selected components" && PLOT_DATA.selected.residue_ids.length > 0) {
            LCM.svg.selectAll(".highlighted")
                .each(function() {
                    LCM.hidden_elements.push(this.closest("g"));
                });
            LCM.svg.selectAll(".label")
                .each(function(d) {
                     if (PLOT_DATA.selected.residue_ids.includes(d.node.data.id)) {
                        LCM.hidden_elements.push(this);
                     }
                });
            LCM.svg.selectAll("g.lines > line")
                .each(function(d) {
                    let id1, id2;
                    if (d.type == "interaction" || d.type == "background") {
                        id1 = d.data.res_id;
                        id2 = d.data.nuc_id;
                    } else {
                        id1 = d.data.id1;
                        id2 = d.data.id2;
                    }
                    if (PLOT_DATA.selected.residue_ids.includes(id1) || PLOT_DATA.selected.residue_ids.includes(id2)) {
                        LCM.hidden_elements.push(this);
                        if (d.type == "interaction") {
                            //console.log(LCM.node_lookup);
                            //console.log(d);
                            LCM.node_lookup[d.target.id].active_interactions -= 1;
                        }
                    }
                });
            LCM.svg.selectAll(".residue")
                .each(function(d) {
                    if (d.active_interactions == 0) {
                        LCM.hidden_elements.push(this);
                        LCM.hidden_elements.push(
                            LCM.svg.select(`g.label[data-node_id=${d.id}]`).node()
                        );
                    } else {
                        d.active_interactions = d.total_interactions;
                    }
                });
            $(this).text("show hidden components");
            LCM.visifyComponents("hidden");
            $("#lcm_residues_button").prop("disabled", true);
        } else {
            $(this).text("hide selected components");
            LCM.visifyComponents("visible");
            LCM.hidden_elements = [];
            $("#lcm_residues_button").prop("disabled", false);
        }
    });

    // bind the save button event
    $("#lcm_save_button").click(function () {
        saveSvgAsPng(document.getElementById("lcm_svg"), "lcm.png", {scale: 2.0});
    });

    // bind hide/show grid event
    $("#lcm_grid_button").click(function () {
        var val = $(this).text();
        if (val == "hide grid") {
            $("#lcm_xgrid").attr("visibility", "hidden");
            $("#lcm_ygrid").attr("visibility", "hidden");
            $(this).text("show grid");
        } else {
            $("#lcm_xgrid").attr("visibility", "visible");
            $("#lcm_ygrid").attr("visibility", "visible");
            $(this).text("hide grid");
        }
    });

    // bind layout radio button event
    $('input[type=radio][name=layout_type]').change(function() {
        LCM.layout_type = this.value;
    });
    
    // bind layout change button event
    $("#lcm_layout_button").click(function(){
        let mi = PLOT_DATA.model;
        let dna_entity_id = PLOT_DATA.dna_entity_id;
        
        // reset UI elements
        LCM.svg = null;
        $("#lcm_grid_button").text("show grid");
        $("#lcm_legend_button").text("hide legend");
        $("#lcm_selected_button").text("hide selected components");
        $("#lcm_residues_button").text("hide residues");
        $("#lcm_residues_button").prop("disabled", false);
        $("#lcm_selected_button").prop("disabled", false);
        $('input[type=radio][name="show_hbonds"]').val(["no"]);
        $("#lcm_plot_rotation_slider").val(0).trigger("input");
        $("#lcm_label_rotation_slider").val(0).trigger("input");
        $("#lcm_label_scale_slider").val(1.0).trigger("input");
        
        // unselect all residues
        d3.selectAll(".highlighted")
            .classed("highlighted", false);
        PLOT_DATA.selected.residue_ids = [];
        addBallStick(PLOT_DATA.selected.residue_ids);
        
        // replot LCM
        makeLCM(mi, dna_entity_id, INTERFACES[mi][dna_entity_id]);
    });
    
    /* SOP Setup */
    //bind update button event
    $("#sop_plot_button").click(function (){
        let mi = $("#model_select").val();
        let entity_id = $("#entity_select").val();
        let shape_name = $("#shape_parameter_select").val();
        SOP.reverse = $("#reverse_strands_check").is(":checked");
        let hi = $("#sop_helix_select").val();
        $("#sop_grid_button").text("hide grid");
        
        // unselect all residues
        d3.selectAll(".highlighted")
            .classed("highlighted", false);
        PLOT_DATA.selected.residue_ids = [];
        addBallStick(PLOT_DATA.selected.residue_ids);
        
        makeShapeOverlay(ENTITIES[mi][entity_id].helical_segments[hi], shape_name, mi, entity_id);
    });

    // bind flip strands button event
    $("#flip_strands_button").click(function () {
        $("#sop_axis_x").find("text").each(function() {
            let t = $(this).text().split("").reverse().join("");
            $(this).text(t);
        });
    });

    // bind hide/show grid event
    $("#sop_grid_button").click(function () {
        var val = $(this).text();
        if (val == "hide grid") {
            $("#sop_grid").attr("visibility", "hidden");
            $(this).text("show grid");
        } else {
            $("#sop_grid").attr("visibility", "visible");
            $(this).text("hide grid");
        }
    });

    $("#sop_legend_button").click(function () {
        var val = $(this).text();
        if (val == "hide legend") {
            $("#sop_legend").attr("visibility", "hidden");
            $(this).text("show legend");
        } else {
            $("#sop_legend").attr("visibility", "visible");
            $(this).text("hide legend");
        }
    });

    // bind the save button event
    $("#sop_save_button").click(function () {
        saveSvgAsPng(document.getElementById("sop_svg"), "sop.png", {scale: 2.0});
    });

    // bind the label scale event
    $("#sop_label_scale_slider").on('input', function () {
        if (!this.value) this.value = 0;
        SOP.label_scale = this.value;

        SOP.svg.select(".labels")
            .selectAll("text")
            .attr("transform", function (d) {
                return `scale(${SOP.label_scale})`;
            });

        SOP.svg.select(".labels")
            .selectAll("rect.handle")
            .attr("transform", function (d) {
                return `scale(${SOP.label_scale}) translate(${-$(this).attr("width")/2}, ${-$(this).attr("height")/2})`;
            });
    });

    // bind hide/show residues button event 
    $("#sop_residues_button").click(function () {
        var val = $(this).text();
        if (val == "hide residues") {
            SOP.svg.selectAll(".residue")
                .attr("visibility", "hidden");
            SOP.svg.selectAll(".label")
                .attr("visibility", "hidden");
            $(this).text("show residues");
        } else {
            SOP.svg.selectAll(".residue")
                .attr("visibility", "visible");
            SOP.svg.selectAll(".label")
                .attr("visibility", "visible");
            $(this).text("hide residues");
        }
    });

    /* PCM Setup */
    $("#pcm_plot_button").click(function (){
        let mi = $("#model_select").val();
        let entity_id = $("#entity_select").val();
        let hi = $("#pcm_helix_select").val();
        $("#pcm_grid_button").text("hide grid");
        
        // unselect all residues
        d3.selectAll(".highlighted")
            .classed("highlighted", false);
        PLOT_DATA.selected.residue_ids = [];
        addBallStick(PLOT_DATA.selected.residue_ids);
        
        makePCM(ENTITIES[mi][entity_id].helical_segments[hi], mi, entity_id);
    });

    // bind hide/show grid event
    $("#pcm_grid_button").click(function () {
        var val = $(this).text();
        if (val == "hide grid") {
            PCM.moiety_labels.attr("visibility", "hidden");
            PCM.theta_grid.attr("visibility", "hidden");
            $(this).text("show grid");
        } else {
            PCM.moiety_labels.attr("visibility", "visible");
            PCM.theta_grid.attr("visibility", "visible");
            $(this).text("hide grid");
        }
    });

    $("#pcm_legend_button").click(function () {
        var val = $(this).text();
        if (val == "hide legend") {
            $("#pcm_legend").attr("visibility", "hidden");
            $(this).text("show legend");
        } else {
            $("#pcm_legend").attr("visibility", "visible");
            $(this).text("hide legend");
        }
    });

    // bind the save button event
    $("#pcm_save_button").click(function () {
        saveSvgAsPng(document.getElementById("pcm_svg"), "pcm.png", {scale: 2.0});
    });

    // bind rotation range event
    $("#pcm_rotation_slider").on('input', function () {
        if (!this.value) this.value = 0;
        PCM.theta = this.value;
        PCM.svg.select(".nodes")
            .attr("transform", `rotate(${PCM.theta})`);
        PCM.svg.selectAll(".sse path")
            .attr("transform", `rotate(${-PCM.theta})`);
        PCM.svg.select(".nodes")
            .selectAll("text")
            .attr("transform", function (d) {
                return `rotate(${-PCM.theta}) scale(${PCM.label_scale})`;
            });
        PCM.svg.select(".nodes")
            .selectAll("rect.handle")
            .attr("transform", function (d) {
                return `rotate(${-PCM.theta}) scale(${PCM.label_scale}) translate(${-$(this).attr("width")/2}, ${-$(this).attr("height")/2})`;
            });
    });

    // bind the label scale event
    $("#pcm_label_scale_slider").on('input', function () {
        if (!this.value) this.value = 0;
        PCM.label_scale = this.value;

        PCM.svg.select(".nodes")
            .selectAll("text")
            .attr("transform", function (d) {
                return `rotate(${-PCM.theta}) scale(${PCM.label_scale})`;
            });
        PCM.svg.select(".nodes")
            .selectAll("rect.handle")
            .attr("transform", function (d) {
                return `rotate(${-PCM.theta}) scale(${PCM.label_scale}) translate(${-$(this).attr("width")/2}, ${-$(this).attr("height")/2})`;
            });
    });
}