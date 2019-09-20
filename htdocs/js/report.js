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

/* 
Dependencies:
    jQuery - v3.3.1 
    d3.js - v5
    visualizations.js 
    ngl_viewer.js
*/

// function to create glossary window
function glossary(id) {
    var opts = 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,height=400,width=800';
    if (!glossary_window.closed) {
        glossary_window.close();
    }
    glossary_window = window.open(`/cgi-bin/glossary?id=${id}#${id}`, 'targetWindow', opts);
}

// functions to create data tables
function makeCitationTable() {
    // Add Citation Info
    if (PDB_STRUCTURE) {
        var doi;
        var pubmed;
        if (DATA["meta_data"]["citation_data"]["doi"] != '?') {
            doi = `<a href="https://dx.doi.org/${DATA["meta_data"]["citation_data"]["doi"]}">${DATA["meta_data"]["citation_data"]["doi"]}</a>`;
        } else {
            doi = "N/A";
        }
        if (DATA["meta_data"]["citation_data"]["pubmed_id"] != '?') {
            pubmed = `<a href="https://www.ncbi.nlm.nih.gov/pubmed/${DATA["meta_data"]["citation_data"]["pubmed_id"]}">${DATA["meta_data"]["citation_data"]["pubmed_id"]}</a>`
        } else {
            pubmed = "N/A";
        }

        var authors;
        if (DATA["meta_data"]["citation_data"]["authors"].constructor === Array) {
            authors = DATA["meta_data"]["citation_data"]["authors"].join('<br>');
        } else {
            authors = DATA["meta_data"]["citation_data"]["authors"];
        }
        $("#citation_table_wrapper").html(HB_TEMPLATES.citation_table({
            authors: authors,
            year: DATA["meta_data"]["citation_data"]["year"],
            title: DATA["meta_data"]["citation_data"]["citation_title"],
            doi: doi,
            pubmed: pubmed,
            pdbid: STRUCTURE_ID
        }));
    }
}

function makeOverviewTable(mi) {
    /* Protein overview Tables */
    function makeSpans(html, ss_c, ss_p, res) {
        if (ss_c == ss_p) {
            // append current residue
            html += res;
            if (ss_c == "H") {
                hcount += 1;
            }
            if (ss_c == "S") {
                scount += 1;
            }
        } else {
            // close current span
            html += "</span>";

            // create new span
            switch (ss_c) {
            case 'H':
                hcount += 1;
                html += `<span style="color:red;">${res}`;
                break;
            case 'S':
                scount += 1;
                html += `<span style="color:green;">${res}`;
                break;
            case 'L':
                html += `<span style="color:blue;">${res}`;
                break;
            }
        }
        return html;
    }

    $("#protein_chain_table").empty();
    $("#protein_entity_table").empty();
    $("#protein_segment_table").empty();

    // Add Protein Chain Info
    var seq, ss, seq_html, span, hcount, scount;
    var chains = DATA['protein']['chains'];
    chains.sort(function (a, b) {
        return (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0);
    });

    // Get Segment info
    var segments = {};
    var segment, N, C, info;
    for (let i = 0; i < DATA['protein']['models'][mi]['segments'].length; i++) {
        segment = DATA['protein']['models'][mi]['segments'][i];
        if (!(segment["chain"] in segments)) {
            segments[segment["chain"]] = [];
        }
        if (segment.residue_ids[0] in RESIDUES) {
            N = RESIDUES[segment.residue_ids[0]];
        } else {
            N = {
                name: "",
                number: segment.residue_ids[0].split('.')[1],
                ins_code: segment.residue_ids[0].split('.')[2]
            };
        }
        if (segment.residue_ids[segment.residue_ids.length - 1] in RESIDUES) {
            C = RESIDUES[segment.residue_ids[segment.residue_ids.length - 1]];
        } else {
            C = {
                name: "",
                number: segment.residue_ids[segment.residue_ids.length - 1].split('.')[1],
                ins_code: segment.residue_ids[segment.residue_ids.length - 1].split('.')[2]
            };
        }
        info = {
            id: segment.id,
            length: segment.length,
            start: `${N.name} ${N.number}${N.ins_code}`,
            stop: `${C.name} ${C.number}${C.ins_code}`
        };
        segments[segment["chain"]].push(info);
        segments[segment.id] = info;
    }

    // Build Chain rows
    for (let i = 0; i < chains.length; i++) {
        seq = chains[i]["sequence"];
        ss = chains[i]["secondary_structure"][mi];
        seq_html = makeSpans("", ss[0], null, seq[0]);
        hcount = 0;
        scount = 0;
        for (let j = 1; j < ss.length; j++) {
            seq_html = makeSpans(seq_html, ss[j], ss[j - 1], seq[j]);
        }
        seq_html = makeSpans(seq_html, null, "", "");
        hcount = Math.round(100 * hcount / seq.length);
        scount = Math.round(100 * scount / seq.length);
        if (PDB_STRUCTURE) {
            $("#protein_chain_table").append(HB_TEMPLATES.pro_chain_table_row({
                chain_id: chains[i]["id"],
                au_id: chains[i]["au_chain_id"],
                names: chains[i]["uniprot_names"].join('<br>'),
                organism: chains[i]["organism"],
                sequence: seq_html,
                uniprot: `<a href='https://www.uniprot.org/uniprot/${chains[i]["uniprot_accession"][0]}'>${chains[i]["uniprot_accession"][0]}</a>`,
                cath: chains[i]["cath_homologous_superfamily"].map(
                    x => x == 'N/A' ? x : `<a href='http://www.cathdb.info/version/latest/superfamily/${x}'>${x}</a>`
                ).join('<br>'),
                go_function: chains[i]["GO_molecular_function"].map(x => x["description"]).join('<br>') || 'N/A',
                go_process: chains[i]["GO_biological_process"].map(x => x["description"]).join('<br>') || 'N/A',
                go_component: chains[i]["GO_cellular_component"].map(x => x["description"]).join('<br>') || 'N/A',
                ss: `${hcount}% Helix<br>${scount}% Strand`,
                length: seq.length,
                segments: segments[chains[i]["id"]].map(x => x["id"]).join(', ')
            }));
        } else {
            $("#protein_chain_table").append(HB_TEMPLATES.pro_chain_table_row({
                chain_id: chains[i]["id"],
                au_id: chains[i]["au_chain_id"],
                sequence: seq_html,
                ss: `${hcount}% Helix, ${scount}% Strand`,
                length: seq.length,
                segments: segments[chains[i]["id"]].map(x => x["id"]).join(', ')
            }));
        }
    }

    // Build Segment Rows
    for (let i = 0; i < DATA['protein']['models'][mi]['segments'].length; i++) {
        $("#protein_segment_table").append(HB_TEMPLATES.pro_segment_table_row(
            segments[DATA['protein']['models'][mi]['segments'][i]["id"]]
        ));
    }

    // Build entity Rows
    var entities = DATA["protein"]["models"][mi]["entities"];
    for (let i = 0; i < entities.length; i++) {
        $("#protein_entity_table").append(HB_TEMPLATES.pro_entity_table_row({
            entity_id: entities[i]["id"],
            res_count: entities[i]["number_of_residues"],
            seg_count: entities[i]["subunits"],
            segments: entities[i]["segments"].join(', ')
        }));
    }

    // Add click to show segments button
    $("button[name='show_segments']").click(function () {
        if ($(this).text() == "show") {
            $(this).text("hide");
        } else {
            $(this).text("show");
        }
    });


    // Add DNA entity info
    $("#dna_entity_table").empty();
    $("#dna_helix_table").empty();
    $("#dna_strand_table").empty();

    entities = DATA["dna"]["models"][mi]["entities"];
    var p5, p3;
    for (let i = 0; i < entities.length; i++) {
        $("#dna_entity_table").append(HB_TEMPLATES.dna_entity_table_row({
            entity_id: entities[i]["id"],
            entity_type: entities[i]["type"],
            num_nucleotides: entities[i]["nucleotides"].length,
            num_basepairs: entities[i]["pairs"].length,
            num_helices: entities[i]["helical_segments"].length,
            num_strands: entities[i]["strands"].length,
            num_segments: entities[i]["single-stranded_segments"].length
        }));

        // Add Strand info
        for (let j = 0; j < entities[i]["strands"].length; j++) {
            p5 = NUCLEOTIDES[entities[i]["strands"][j]["5p_end"]];
            p3 = NUCLEOTIDES[entities[i]["strands"][j]["3p_end"]];
            $("#dna_strand_table").append(HB_TEMPLATES.dna_strand_table_row({
                parent_id: entities[i]["id"],
                strand_id: entities[i]["strands"][j]["strand_id"],
                sequence: entities[i]["strands"][j]["sequence"],
                length: entities[i]["strands"][j]["length"],
                p5: `${p5['name']} ${p5['number']}`,
                p3: `${p3['name']} ${p3['number']}`,
                sequence: entities[i]["strands"][j]["sequence"],
                gc_content: entities[i]["strands"][j]["GC_content"],
                interacts: entities[i]["strands"][j]["interacts_with_protein"]
            }));
        }

        // Add DNA helix info
        for (let j = 0; j < entities[i]["helical_segments"].length; j++) {
            $("#dna_helix_table").append(HB_TEMPLATES.dna_helix_table_row({
                parent_id: entities[i]["id"],
                id: entities[i]["helical_segments"][j]["helix_id"],
                sequence: entities[i]["helical_segments"][j]["sequence1"] + '<br>' + entities[i]["helical_segments"][j]["sequence2"],
                length: entities[i]["helical_segments"][j]["length"],
                conformation: entities[i]["helical_segments"][j]["classification"],
                atracts: entities[i]["helical_segments"][j]["contains_A-tracts"] ? 'yes' : 'no',
                mismatches: entities[i]["helical_segments"][j]["contains_mismatches"] ? 'yes' : 'no',
                non_wc: entities[i]["helical_segments"][j]["contains_non-wc_pairs"] ? 'yes' : 'no',
                gc_content: entities[i]["helical_segments"][j]["GC_content"],
                radius: entities[i]["helical_segments"][j]["mean_radius"],
                curvature: entities[i]["helical_segments"][j]["helical_axis"]["axis_curvature"],
                axis_length: entities[i]["helical_segments"][j]["helical_axis"]["axis_length"]
            }));
        }
    }

    if ($("#dna_helix_table").children().length == 0) {
        $("#dna_helix_table_wrapper").css("display", "none");
    } else {
        $("#dna_helix_table_wrapper").css("display", "initial");
    }

    // Add DNA-protein interface info
    $("#interfaces_table").empty();
    var interface, features;
    for (let i = 0; i < DATA["interfaces"]["models"][mi].length; i++) {
        interface = DATA["interfaces"]["models"][mi][i];
        for (let j = 0; j < interface["interface_features"].length; j++) {
            features = interface["interface_features"][j];
            $("#interfaces_table").append(HB_TEMPLATES.interface_table_row({
                dna_entity_id: interface["dna_entity_id"],
                pro_chain_id: features["protein_chain_id"],
                pro_chain_segments: features["segment_ids"].join(', '),
                nuc_res_interactions: features["interaction_count"] - features["weak_interaction_count"],
                nuc_res_weak_interactions: features["weak_interaction_count"],
                basa: features["basa"]["total"],
                hbonds: features["hbond_sum"]["total"],
                vdw: features["vdw_sum"]["total"],
                ss_composition: features["secondary_structure_composition"],
                hydrophobicity: features["mean_hydrophobicity_score"]
            }));
        }
    }
}

// makes the DNA entity select
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

// makes the protein chains select
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

// functions for data explorer search
function checkID(id) {
    /*
    Checks if ID is in chain.number format and if so
    appends a blank insertion code
    */
    
    if(/^[A-Za-z0-9]\.[+-]?[0-9]+$/.test(id)) {
        id = id + '. ';
    }
    return id;
}

function dataItemUpdate(val) {
    /* 
    Updates the UI inputs when the data item select
    is changed in the data explorer section
    */
    $("#data_item_search_group").empty();
    $("#data_item_label").empty();
    $('#data_item_search_button').prop("disabled", false);
    $("#data_search_error").text("");
    switch(val) {
        case "nuc":
            $("#data_item_search_group").html(HB_TEMPLATES.data_search_template({
                ph1: "nucleotide ID",
                name1: "nid",
                style1: "width:110px;",
            }));
            $("#data_item_label").html('enter nucleotide ID using: <code>chain</code>.<code>number</code> OR <code>chain</code>.<code>number</code>.<code>ins_code</code>');
            break;
        case "res":
            $("#data_item_search_group").html(HB_TEMPLATES.data_search_template({
                ph1: "residue ID",
                name1: "rid",
                style1: "width:100px;",
            }));
            $("#data_item_label").html('enter residue ID using: <code>chain</code>.<code>number</code> OR <code>chain</code>.<code>number</code>.<code>ins_code</code>');
            break;
        case "int":
            $("#data_item_search_group").html(HB_TEMPLATES.data_search_template({
                models: JSON_VIEWER.models_array,
                ph1: "nucleotide ID",
                name1: "nid",
                style1: "width:110px;",
                ph2: "residue ID",
                name2: "rid",
                style2: "width:100px;",
            }));
            $("#data_item_label").html('choose model then enter nuc/res ID using: <code>chain</code>.<code>number</code> OR <code>chain</code>.<code>number</code>.<code>ins_code</code>');
            // preset values
            $("#data_item_search_group select[name='data_item_model']").val(SELECTION.model);
            break;
        case "ent":
            $("#data_item_search_group").html(HB_TEMPLATES.data_search_template({
                models: JSON_VIEWER.models_array,
                ph1: "DNA entity ID",
                name1: "entity_id"
            }));
            $("#data_item_label").html('choose a model then enter a DNA entity ID');
            // preset values
            $("#data_item_search_group select[name='data_item_model']").val(SELECTION.model);
            $("#data_item_search_group input[name='entity_id']").val(SELECTION.dna_entity_id);
            break;
        case "helix":
            $("#data_item_search_group").html(HB_TEMPLATES.data_search_template({
                models: JSON_VIEWER.models_array,
                ph1: "helix ID",
                name1: "helix_id"
            }));
            $("#data_item_label").html('choose a model then enter a helix ID');
            // preset values
            $("#data_item_search_group select[name='data_item_model']").val(SELECTION.model);
            if(DNA_ENTITIES[SELECTION.model][SELECTION.dna_entity_id]['helical_segments'].length > 0) {
                $("#data_item_search_group input[name='helix_id']").val(DNA_ENTITIES[SELECTION.model][SELECTION.dna_entity_id]['helical_segments'][0]['helix_id']);
            }
            break;
        case "pro_chain":
            $("#data_item_search_group").html(HB_TEMPLATES.data_search_template({
                ph1: "chain ID",
                name1: "chain_id",
                style1: "width:80px;",
                max1: 1
            }));
            $("#data_item_label").html('enter protein chain ID (single character)');
            break;
        default:
            $("#data_item_label").html('to search for a data item use the inputs below');
            $('#data_item_search_button').prop("disabled", true);
            break;
    }
}

function dataItemSearch() {
    /* 
    Searches the DATA data structure for a specified item and 
    opens this path if found
    */
    let val = $("#data_item_select").val();
    let path, index, nid, rid, mi, ind1, ind2;
    switch(val) {
        case "nuc":
            nid = $("#data_item_search_group input[name='nid']").val();
            nid = checkID(nid);
            // loop over nucleotides to find a match
            for(let i = 0; i < DATA['dna']['nucleotides'].length; i++) {
                if(DATA['dna']['nucleotides'][i]['id'] == nid) {
                    index = i;
                    break;
                }
            }
            // generate the path if we found a match
            if(typeof(index) != 'undefined') {
                path = ['dna', 'nucleotides', index+''];
            }
            break;
        case "res":
            rid = $("#data_item_search_group input[name='rid']").val();
            rid = checkID(rid);
            // loop over residues to find a match
            for(let i = 0; i < DATA['protein']['residues'].length; i++) {
                if(DATA['protein']['residues'][i]['id'] == rid) {
                    index = i;
                    break;
                }
            }
            // generate the path if we found a match
            if(typeof(index) != 'undefined') {
                path = ['protein', 'residues', index+''];
            }
            break;
        case "int":
            nid = $("#data_item_search_group input[name='nid']").val();
            rid = $("#data_item_search_group input[name='rid']").val();
            nid = checkID(nid);
            rid = checkID(rid);
            mi = Number($("#data_item_search_group select[name='data_item_model']").val());
            let int;

            for (let i = 0; i < DATA['interfaces']['models'][mi].length; i++) {
                for (let j = 0; j < DATA['interfaces']['models'][mi][i]['nucleotide-residue_interactions'].length; j++) {
                    int = DATA['interfaces']['models'][mi][i]['nucleotide-residue_interactions'][j];
                    if(int['nuc_id'] == nid && int['res_id'] == rid) {
                        ind1 = i;
                        ind2 = j;
                        break;
                    }
                }
                if(typeof(ind1) != "undefined" && typeof(ind2) != "undefined") {
                    break;
                }
            }
            if(typeof(ind1) != "undefined" && typeof(ind2) != "undefined") {
                path = ['interfaces', 'models', mi+'', ind1+'', 'nucleotide-residue_interactions', ind2+''];
            }
            break;
        case "ent":
            let eid = $("#data_item_search_group input[name='entity_id']").val();
            mi = Number($("#data_item_search_group select[name='data_item_model']").val());
            
            for (let i = 0; i < DATA['dna']['models'][mi]['entities'].length; i++) {
                if(DATA['dna']['models'][mi]['entities'][i]['id'] == eid) {
                    index = i;
                    break;
                }
            }
            if(typeof(index) != "undefined") {
                path = ['dna', 'models', mi+'', 'entities', index+''];
            }
            break;
        case "helix":
            let hid = $("#data_item_search_group input[name='helix_id']").val();
            mi = Number($("#data_item_search_group select[name='data_item_model']").val());

            for (let i = 0; i < DATA['dna']['models'][mi]['entities'].length; i++) {
                for (let j = 0; j < DATA['dna']['models'][mi]['entities'][i]['helical_segments'].length; j++) {
                    if(DATA['dna']['models'][mi]['entities'][i]['helical_segments'][j]['helix_id'] == hid) {
                        ind1 = i;
                        ind2 = j;
                        break;
                    }
                }
                if(typeof(ind1) != "undefined" && typeof(ind2) != "undefined") {
                    break;
                }
            }
            if(typeof(ind1) != "undefined" && typeof(ind2) != "undefined") {
                path = ['dna', 'models', mi+'', 'entities', ind1+'', 'helical_segments', ind2+''];
            }
            break;
        case "pro_chain":
            let cid = $("#data_item_search_group input[name='chain_id']").val();
            
            // loop over chains to find a match
            for(let i = 0; i < DATA['protein']['chains'].length; i++) {
                if(DATA['protein']['chains'][i]['id'] == cid) {
                    index = i;
                    break;
                }
            }
            // generate the path if we found a match
            if(typeof(index) != 'undefined') {
                path = ['protein', 'chains', index+''];
            }
            break;
    }
    
    // open the path if defined
    if(typeof(path) != "undefined") {
        JSON_VIEWER.root.closeNode();
        JSON_VIEWER.root.openPath(path);
    } else {
        $("#data_search_error").text("no matching item found");
    }
}

// functions for updating protein colors
function updateProteinColors() {
    /* 
    This function updates protein color scheme based on values in
    the color inputs and stores these colors in a more convienient 
    data structure and calls the NGL_VIEWER color update function
    */
    let pro_chains = SELECTION.protein_chains;
    if($('input[name="all_chain_colors"]:checked').val() == "on") {
        $("#protein_all_color_row input[type=color]").each(function(n) {
            let val = $(this).val();
            let sst = $(this).attr("name");
            for(let i = 0; i < pro_chains.length; i++) {
                PROTEIN_COLORS[sst][pro_chains[i]] = val;
            };
        });
    } else {
        for (let i = 0; i < pro_chains.length; i++) {
            $(`#protein_color_rows input[data-chain=${pro_chains[i]}]`).each(function(n) {
                let val = $(this).val();
                let sst = $(this).attr("name");
                let chain = $(this).attr("data-chain");
                PROTEIN_COLORS[sst][chain] = val;
            });
        }
    }
    
    let color_specs = {};
    for(let sst in PROTEIN_COLORS) {
        for (let chain in PROTEIN_COLORS[sst]) {
            if (! (chain in color_specs) ) {
                color_specs[chain] = {chain_name: ':'+chain}; 
            }
            switch (sst) {
                case 'H':
                    color_specs[chain]['helix'] = parseInt(PROTEIN_COLORS[sst][chain].substring(1), 16);
                    break;
                case 'S':
                    color_specs[chain]['sheet'] = parseInt(PROTEIN_COLORS[sst][chain].substring(1), 16);
                    break;
                case 'L':
                    color_specs[chain]['turn'] = parseInt(PROTEIN_COLORS[sst][chain].substring(1), 16);
                    break;
            }
        }
    }
    changeColorScheme3D({chains: Object.values(color_specs)});
}

function applyProteinColors(){
    /* 
    This function applies the colors stored in PROTEIN_COLORS to
    existing SVG elements and updates the NGL residue selection
    */
    for(let sst in PROTEIN_COLORS) {
        for(let chain in PROTEIN_COLORS[sst]) {
            $(`path.${sst}[data-chain=${chain}]`).css("fill", PROTEIN_COLORS[sst][chain]);
        }
    }
    selectResidues3D(SELECTION.included_component_ids);
    
    // update legends
    makePCMLegend();
    makeSOPLegend();
    makeLCMLegend();
}

function makeColorFormatInputs(dna_chains, pro_chains) {
    $("#dna_color_rows").empty();
    $("#protein_color_rows").empty();
    
    /* add chain color inputs */
    for (let i = 0; i < pro_chains.length; i++) {
        $("#protein_color_rows").append(HB_TEMPLATES.pro_color_row({
            colors: [
                {
                    color: PROTEIN_COLORS.default['H'],
                    name: 'H',
                    chain: pro_chains[i]
                },
                {
                    color: PROTEIN_COLORS.default['S'],
                    name: 'S',
                    chain: pro_chains[i]
                },
                {
                    color: PROTEIN_COLORS.default['L'],
                    name: 'L',
                    chain: pro_chains[i]
                },
            ],
            text: `Chain ${pro_chains[i]} colors:`,
        }));
    }
    
}

// functions for dealing with label formats
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

function updateNGLViewerSelection(){
    // Set the NGL model
    selectModel(SELECTION.model);
    
    // Set the colored residues
    let component_ids = new Set();
    let sse_ids = new Set();
    let chain_ids = new Set();
    let rid;
    for(let i = 0; i < SELECTION.included_component_ids.length; i++) {
        // add the ID to the set
        component_ids.add(SELECTION.included_component_ids[i]);
        
        // check if residue
        if (SELECTION.included_component_ids[i] in RESIDUES) {
            rid = SELECTION.included_component_ids[i];
            sse_ids.add(SSE[SELECTION.model][rid]['id']);
            chain_ids.add(RESIDUES[rid]['chain']);
        }
    }
    
    // get value of NGL color option input
    let opt = $("input[type=radio][name=ngl_color_option]:checked").val();
    if(opt == 'sse') {
        for (let id of sse_ids) {
            for(let i = 0; i < SSE[SELECTION.model][id]['residue_ids'].length; i++) {
                component_ids.add(SSE[SELECTION.model][id]['residue_ids'][i]);
            }
        }
    }
    else if(opt == 'chain') {
        for (let id of chain_ids) {
            for(let i = 0; i < PROTEIN_CHAINS[id]['residue_ids'].length; i++) {
                component_ids.add(PROTEIN_CHAINS[id]['residue_ids'][i]);
            }
        }
    }
    selectResidues3D(Array.from(component_ids));
}

function makeExcludeSelects() {
    let pc = SELECTION.protein_chains;
    let dc = SELECTION.dna_chains;
    let dna_id = SELECTION.dna_entity_id;
    let mi = SELECTION.model;
    
    let nuc_list = [];
    let res_list = [];
    let sse_list = [];
    
    let nuc, res, sse;
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

function setExcludes() {
    let res_list = $('#exclude_residue_select').val();
    let nuc_list = $('#exclude_nucleotide_select').val();
    let sse_list = $('#exclude_sse_select').val();
    let mi = SELECTION.model;
    
    let excluded_component_ids = new Set(res_list.concat(nuc_list));
    
    for (let i = 0; i < sse_list.length; i++) {
        for (let j = 0; j < SSE[mi][sse_list[i]].residue_ids.length; j ++) {
            excluded_component_ids.add(SSE[mi][sse_list[i]].residue_ids[j]);
        }
    }
    SELECTION.excluded_component_ids = excluded_component_ids;
}

function setIncludes() {
    let nr, ns, mty, id, interface, geo, field, val, criteria, passed, exclude_weak, match_all;
    
    let mi = SELECTION.model;
    let dna_ent_id = SELECTION.dna_entity_id;
    let pro_chains = SELECTION.protein_chains;
    
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
    let included_component_ids = [];
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
            if (! SELECTION.protein_sst_selection.includes(RESIDUES[nr.res_id]['secondary_structure'][mi]) ) {
                continue;
            }
            
            // check for excluded residue
            if(SELECTION.excluded_component_ids.has(nr.res_id) || SELECTION.excluded_component_ids.has(nr.nuc_id)){
                continue;
            }
            
            // get interactiing moieties
            mty = nr.nucleotide_interaction_moieties.filter(n => SELECTION.dna_moieties_selection.includes(n));
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
                if(geo.length > 0 && geo.length < 3) {
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
            included_component_ids.push(nr.res_id);
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
    
    for (let i = 0; i < DNA_ENTITIES[mi][dna_ent_id].nucleotides.length; i++) {
        included_component_ids.push(DNA_ENTITIES[mi][dna_ent_id].nucleotides[i]);
    }
    SELECTION.included_component_ids = included_component_ids.unique();
    
}

function updateSelection(mi, dna_id, pro_chains) {
    // update overview table
    if  (mi != SELECTION.model) {
        makeOverviewTable(mi)
    }
    // update selection variables
    SELECTION.model = mi;
    SELECTION.dna_entity_id = dna_id;
    SELECTION.protein_chains = pro_chains;
    
    // get DNA chains corresponding to the selected entity
    SELECTION.dna_chains = [];
    for(let i = 0; i < DNA_ENTITIES[mi][dna_id].strands.length; i++) {
        SELECTION.dna_chains.push(DNA_ENTITIES[mi][dna_id].strands[i].chain_id);
    }
    SELECTION.dna_chains = SELECTION.dna_chains.unique();
    
    // get selected DNA moieties
    SELECTION.dna_moieties_selection = $("input[type=checkbox][name=dna_moiety_selection]:checked")
        .map( function() {
           return this.value;
        })
        .toArray();
    
    // get selected SST
    SELECTION.protein_sst_selection = $("input[type=checkbox][name=sst_selection]:checked")
        .map( function() {
           return this.value;
        })
        .toArray();
    
    
    /* Decide whether to rebuild any necessary UI components or simply apply updates */
    let ifs = getInterfaceString();
    if (ifs != SELECTION.interface_string) {
        SELECTION.interface_string = ifs;
        // we are visualizing a new interface, start from scratch
        makeExcludeSelects();
        makeLabelFormatInputs(SELECTION.dna_chains, SELECTION.protein_chains);
        makeColorFormatInputs(SELECTION.dna_chains, SELECTION.protein_chains);
        resetLabels();
    }
    
    // update colors
    updateProteinColors();
    
    // set included and excluded components
    setExcludes();
    setIncludes();
    
    // make 2D visualizations
    makePlots(SELECTION, PROTEIN_COLORS);
    
    // update NGL viewer with selection
    updateNGLViewerSelection();
    
    // reset various UI elements
    $("#cartoon_toggle_button").text("Hide Cartoon");
    $("#label_input_div").css("visibility", "hidden");
    
    /* Show current selection */
    $("#current_model").text(SELECTION.model);
    $("#current_model2").text(SELECTION.model);
    $("#current_dna_entity").text(SELECTION.dna_entity_id);
    if(pro_chains.length > 0) {
        $("#current_protein_chains").text(SELECTION.protein_chains.join(','));
    } else {
        $("#current_protein_chains").text("none selected");
    }
}

function getInterfaceString(chains) {
    if(chains === undefined) {
        return SELECTION.model + SELECTION.dna_entity_id + SELECTION.protein_chains.sort().join();
    } else {
        return SELECTION.model + SELECTION.dna_entity_id + chains.sort().join();
    }
}

function labelOptionClick(e) {
    let button = $(e).parent().siblings('button');
    button.attr("data-value", $(e).attr("data-value"));
    button.text($(e).attr("data-placeholder"));
}

// Useful extentions to builtin prototypes
Array.prototype.unique = function () {
    var n = {},
        r = [];
    for (var i = 0; i < this.length; i++) {
        if (!n[this[i]]) {
            n[this[i]] = true;
            r.push(this[i]);
        }
    }
    return r;
};

// Used for displaying glossary
var glossary_window = {
    closed: true
};

// Stores the current user selection
var SELECTION = {
    model: null,
    dna_entity_id: null,
    protein_chains: null,
    dna_chains: null,
    included_component_ids: null,
    excluded_component_ids: null,
    protein_sst_selection: null,
    dna_moieties_selection: null,
    interface_string: null
}

// Store colors of each current protein chain by SST
var PROTEIN_COLORS = {
    H: {},
    S: {},
    L: {},
    default:{
        H: "#ff0000",
        S: "#49e20e",
        L: "#003eff"
    }
}


// Data structures for accessing DNAproDB data
var DATA,
    NUCLEOTIDES,
    RESIDUES,
    PAIRS,
    STACKS,
    LINKS,
    STRANDS,
    SSE,
    DNA_ENTITIES,
    PROTEIN_CHAINS,
    INTERFACES,
    NR_INTERACTIONS,
    NS_INTERACTIONS,
    NUCLEOTIDE_INTERFACE_DATA,
    RESIDUE_INTERFACE_DATA,
    SSE_INTERFACE_DATA;

var HB_TEMPLATES; // stores handblebars templates

// Store data for the Data Explorer viewe
var JSON_VIEWER = {
    viewer: null,
    root: null,
    models_array: null,
}

// Resize NGL viewer whenever window is resized
var RESIZE_TIMER;
$(window).resize(function () {
    if(RESIZE_TIMER){
        clearTimeout(RESIZE_TIMER);
    }
    RESIZE_TIMER = setTimeout(stage_nm1.handleResize(), 200);
});

// Begin when page is ready
$(document).ready(function(){
    /* Load and compile handlebars templates */
    HB_TEMPLATES = {
        sse_tooltip: Handlebars.compile($("#sse_tooltip").html()),
        res_tooltip: Handlebars.compile($("#residue_tooltip").html()),
        nuc_tooltip: Handlebars.compile($("#nucleotide_tooltip").html()),
        res_int_tooltip: Handlebars.compile($("#residue_interaction_tooltip").html()),
        pro_entity_table_row: Handlebars.compile($("#protein_entity_table_row").html()),
        pro_segment_table_row: Handlebars.compile($("#protein_segment_table_row").html()),
        dna_entity_table_row: Handlebars.compile($("#dna_entity_table_row").html()),
        dna_strand_table_row: Handlebars.compile($("#dna_strand_table_row").html()),
        dna_helix_table_row: Handlebars.compile($("#dna_helix_table_row").html()),
        interface_table_row: Handlebars.compile($("#interface_table_row").html()),
        citation_table: Handlebars.compile($("#citation_table").html()),
        res_labels_row: Handlebars.compile($("#labels_res_format_row").html()),
        sse_labels_row: Handlebars.compile($("#labels_sse_format_row").html()),
        pro_color_row: Handlebars.compile($("#pro_color_input_row").html()),
        data_search_template: Handlebars.compile($("#data_fields_template").html())
    };
    if(PDB_STRUCTURE) {
        HB_TEMPLATES.pro_chain_table_row = Handlebars.compile($("#protein_chain_table_pdb").html());
    } else {
        HB_TEMPLATES.pro_chain_table_row = Handlebars.compile($("#protein_chain_table_upload").html());
    }
    Handlebars.registerPartial('resFieldPartial', $("#labels_residue_format_input").html());
    Handlebars.registerPartial('sseFieldPartial', $("#labels_sse_format_input").html());
    Handlebars.registerPartial('colorPartial', $("#color_input_partial").html());
    
    /* Set up and bind various UI elements to functions */
    /** sumo_select inits **/
    $('#exclude_nucleotide_select').SumoSelect({
        csvDispCount: 1,
        captionFormat: '{0} selected',
        captionFormatAllSelected: '{0} selected',
        selectAll: true
    });
    
    $('#exclude_residue_select').SumoSelect({
        csvDispCount: 1,
        captionFormat: '{0} selected',
        captionFormatAllSelected: '{0} selected',
        selectAll: true
    });
    
    $('#exclude_sse_select').SumoSelect({
        csvDispCount: 1,
        captionFormat: '{0} selected',
        captionFormatAllSelected: '{0} selected',
        selectAll: true
    });

    $('#protein_chains_select').SumoSelect({
        csvDispCount: 5,
        captionFormat: '{0} selected',
        captionFormatAllSelected: 'all chains selected',
    });
    
    /** NGL viewer inputs **/
    $('input[type=radio][name="ngl_color_option"]').change(function() {
         updateNGLViewerSelection();
    });
    
    $("#cartoon_toggle_button").click(function () {
        var val = $(this).text();
        if (val == "Hide Cartoon") {
            $(this).text("Show Cartoon");
            cartoonInvisible();
        } else {
            $(this).text("Hide Cartoon");
            cartoonVisible();
        }
    });
    
    $("#hydrogen_toggle_button").click(function () {
        var val = $(this).text();
        if (val == "Hide Hydrogens") {
            $(this).text("Show Hydrogens");
            hydrogen_toggle();
        } else {
            $(this).text("Hide Hydrogens");
            hydrogen_toggle();
        }
    });

    $("#download_pdb").prop("href", PDB_URL).prop("download", `${STRUCTURE_ID}.pdb`);
    
    $('#image_export').click(function (){
        saveViewerAsImage().then(function(blob) {
          saveAs(blob, `${STRUCTURE_ID}_3d.png`); 
        });
    });
        
    /** Data Explorer UI setup */
    $("#json_download_link").prop("href", JSON_URL).prop("download", `${STRUCTURE_ID}.json`);
    
    $('#data_item_select').change(function () {
        dataItemUpdate(this.value);
    });
    
    $('#data_item_search_button').click(dataItemSearch);
    
    /*** reset UI elements ***/
    $('#data_item_select').val("");
    $('#data_item_search_button').prop("disabled", true);
    $("#data_item_label").html('to search for a data item use the inputs below');
    $("#data_search_error").text("");
    
    /* Set up interface select controls */
    $('#advanced_options_button').click(function () {
        var val = $(this).text();
        if (val == "show advanced options") {
            $(this).text("hide advanced options");
        } else {
            $(this).text("show advanced options");
        }
    });
    
    $("#plot_button").click(function() {
        let mi = $("#model_select").val();
        let id = $("#entity_select").val();
        let pc = $("#protein_chains_select").val(); 
        updateSelection(mi, id, pc);
    });

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

    /* Set up chart controls */
    $("#lcm_link").click(function () {
        $("#lcm_console_link").tab("show");
    });
    
    $("#pcm_link").click(function () {
        $("#pcm_console_link").tab("show");
    });
    
    $("#sop_link").click(function () {
        $("#sop_console_link").tab("show");
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
        $("#label_input_div").css("visibility", "hidden");

    });

    $("#label_input_submit_button").click(submitLabelInput);

    $("#label_input").on('keyup', function (e) {
        if (e.keyCode == 13) {
            submitLabelInput();
        }
    });

    $("#update_labels_button").click(applyLabelFormats);

    $("#update_colors_button").click(function(){
        updateProteinColors(SELECTION.protein_chains);
        applyProteinColors();
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
        LCM.reflectX *= -1;
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
        LCM.reflectY *= -1;
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
                .attr("transform", updateLabelTransform);
            LCM.svg.selectAll(".label")
                .each(function (d) {
                    d.angle = LCM.label_theta-LCM.theta;
                })
                .attr("transform", updateLabelTransform);
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
                .attr("transform", updateLabelTransform);
            
            let selection = LCM.svg.selectAll(".label")
                .each(function(d) {
                    d.angle = LCM.label_theta-LCM.theta;
                });
            offsetLabelText(selection);
            selection.attr("transform", updateLabelTransform);
        }
    });

    // bind label scale range event
    $("#lcm_label_scale_slider").on('input', function () {
        if (!this.value) this.value = 0;
        LCM.label_scale = this.value;
        for(let i = 0; i < LCM.node_data.length; i++) {
            LCM.node_data[i].scale = this.value;
        }
        
        let selection = LCM.svg.selectAll(".label")
            .each(function(d) {
                d.scale = LCM.label_scale;
            });
        offsetLabelText(selection);
        selection.attr("transform", updateLabelTransform);
        LCM.svg.selectAll(".nodes text").attr("transform", updateLabelTransform);
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
        
        makeSOP(DNA_ENTITIES[mi][entity_id].helical_segments[hi], shape_name, mi, entity_id);
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
        for(let i = 0; i < SOP.node_data.length; i++) {
            SOP.node_data[i].scale = this.value;
        }
        let selection = SOP.svg.selectAll(".label")
            .each(function(d) {
                d.scale = SOP.label_scale;
            });
        
        offsetLabelText(selection);
        selection.attr("transform", updateLabelTransform);
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
        
        makePCM(DNA_ENTITIES[mi][entity_id].helical_segments[hi], mi, entity_id);
    });

    // bind hide/show grid event
    $("#pcm_grid_button").click(function () {
        var val = $(this).text();
        if (val == "hide grid") {
            PCM.dna_moiety_labels.attr("visibility", "hidden");
            PCM.theta_grid.attr("visibility", "hidden");
            $(this).text("show grid");
        } else {
            PCM.dna_moiety_labels.attr("visibility", "visible");
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
        let selection = PCM.svg.selectAll(".label")
            .each(function(d) {
                d.angle = -PCM.theta;
            });
        offsetLabelText(selection);
        selection.attr("transform", updateLabelTransform);
    });

    // bind the label scale event
    $("#pcm_label_scale_slider").on('input', function () {
        if (!this.value) this.value = 0;
        PCM.label_scale = this.value;
        for(let i = 0; i < PCM.node_data.length; i++) {
            PCM.node_data[i].scale = this.value;
        }
        let selection = PCM.svg.selectAll(".label")
            .each(function(d) {
                d.scale = PCM.label_scale;
            });
        
        offsetLabelText(selection);
        selection.attr("transform", updateLabelTransform);

    });
    
    /* Asynchronously request DNAproDB data */
    $.ajaxSetup({
        beforeSend: function (xhr) {
            if (xhr.overrideMimeType) {
                xhr.overrideMimeType("application/json");
            }
        }
    });

    // retrieve JSON file and get rolling
    $.getJSON(JSON_URL)
        .done(function (data) {
            /* set up global data structures */
            DATA = data;
            let item, id;

            // immutable lookup objects
            NUCLEOTIDES = {};
            RESIDUES = {};
            PROTEIN_CHAINS = {};

            // list of lookup objects for each model */
            PAIRS = [];
            LINKS = [];
            STACKS = [];
            STRANDS = [];
            DNA_ENTITIES = [];
            INTERFACES = [];
            SSE = [];
            NR_INTERACTIONS = [];
            NS_INTERACTIONS = [];
            NUCLEOTIDE_INTERFACE_DATA = [];
            RESIDUE_INTERFACE_DATA = [];
            SSE_INTERFACE_DATA = [];

            // Add nucleotide data
            for (let i = 0; i < data.dna.nucleotides.length; i++) {
                NUCLEOTIDES[data.dna.nucleotides[i].id] = data.dna.nucleotides[i];
            }

            // Add residue data
            for (let i = 0; i < data.protein.residues.length; i++) {
                RESIDUES[data.protein.residues[i].id] = data.protein.residues[i];
            }
        
            // Add protein chains
            for (let i = 0; i < data.protein.chains.length; i++) {
                PROTEIN_CHAINS[data.protein.chains[i].id] = data.protein.chains[i];
            }

            // Model-level data structures
            for (let mi = 0; mi < data.num_models; mi++) {
                PAIRS.push({});
                STACKS.push({});
                LINKS.push({});
                STRANDS.push({});
                DNA_ENTITIES.push({});
                INTERFACES.push({});
                SSE.push({});
                NR_INTERACTIONS.push({});
                NS_INTERACTIONS.push({});
                NUCLEOTIDE_INTERFACE_DATA.push({});
                RESIDUE_INTERFACE_DATA.push({});
                SSE_INTERFACE_DATA.push({});
                PLOT_DATA.labels[mi] = {}; // store SSE labels

                // add pair data
                for (let i = 0; i < data.dna.models[mi].pairs.length; i++) {
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
                for (let i = 0; i < data.dna.models[mi].stacks.length; i++) {
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
                for (let i = 0; i < data.dna.models[mi].links.length; i++) {
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
                for (let i = 0; i < data.dna.models[mi].entities.length; i++) {
                    item = data.dna.models[mi].entities[i];
                    DNA_ENTITIES[mi][item.id] = item;
                }

                // add sse data 
                for (let i = 0; i < data.protein.models[mi].secondary_structure_elements.length; i++) {
                    item = data.protein.models[mi].secondary_structure_elements[i];
                    SSE[mi][item.id] = item;
                    //escapeID(item.id);
                    for (let j = 0; j < item.residue_ids.length; j++) {
                        SSE[mi][item.residue_ids[j]] = item;
                    }
                }

                // add nucleotide-residue interaction, nucleotide-sse interaction and nucleotide interface data 
                for (let i = 0; i < data.interfaces.models[mi].length; i++) {
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

                    for (let j = 0; j < data.interfaces.models[mi][i]["nucleotide-residue_interactions"].length; j++) {
                        item = data.interfaces.models[mi][i]["nucleotide-residue_interactions"][j];
                        NR_INTERACTIONS[mi][id][getHash(item.nuc_id, item.res_id)] = item;
                        if (! (item.nuc_id in NR_INTERACTIONS[mi][id]) )  {
                            NR_INTERACTIONS[mi][id][item.nuc_id] = [];
                        }
                        NR_INTERACTIONS[mi][id][item.nuc_id].push(item);
                    }

                    for (let j = 0; j < data.interfaces.models[mi][i]["nucleotide-sse_interactions"].length; j++) {
                        item = data.interfaces.models[mi][i]["nucleotide-sse_interactions"][j];
                        NS_INTERACTIONS[mi][id][getHash(item.nuc_id, item.sse_id)] = item;
                        if (! (item.nuc_id in NS_INTERACTIONS[mi][id]) )  {
                            NS_INTERACTIONS[mi][id][item.nuc_id] = [];
                        }
                        NS_INTERACTIONS[mi][id][item.nuc_id].push(item);
                    }

                    for (let j = 0; j < data.interfaces.models[mi][i]["nucleotide_data"].length; j++) {
                        item = data.interfaces.models[mi][i]["nucleotide_data"][j];
                        NUCLEOTIDE_INTERFACE_DATA[mi][id][item.nuc_id] = item;
                    }

                    for (let j = 0; j < data.interfaces.models[mi][i]["residue_data"].length; j++) {
                        item = data.interfaces.models[mi][i]["residue_data"][j];
                        RESIDUE_INTERFACE_DATA[mi][id][item.res_id] = item;
                    }

                    for (let j = 0; j < data.interfaces.models[mi][i]["sse_data"].length; j++) {
                        item = data.interfaces.models[mi][i]["sse_data"][j];
                        SSE_INTERFACE_DATA[mi][id][item.sse_id] = item;
                    }
                }
            }
        })
        .done(function (data) {
            /* initialized some required UI/data structures */
            
            // build the model select 
            let opts = "";
            for (let i = 0; i < DATA.num_models; i++) {
                 opts += `<option value="${i}">${i}</option>`;
            }
            $('#model_select').append(opts);
            $('#model_select').change(function () {
                entitySelectSetup(this.value);
            });
        
            // call entitySelectSetup with default model (0)
            entitySelectSetup(0);

            // map all component IDs to an HTML friendly form
            let id_re = /\s|\./g;
            let id1, id2;
            // add nucleotide ids
            for (let i = 0; i < DATA.dna.nucleotides.length; i++) {
                id1 = DATA.dna.nucleotides[i].id;
                id2 = id1.replace(id_re, '');
                PLOT_DATA.idMap[id1] = id2;
                PLOT_DATA.idMap[id2] = id1;
            }

            // add residue ids
            for (let i = 0; i < DATA.protein.residues.length; i++) {
                id1 = DATA.protein.residues[i].id;
                id2 = id1.replace(id_re, '');
                PLOT_DATA.idMap[id1] = id2;
                PLOT_DATA.idMap[id2] = id1;
            }

            // add sse ids
            for (let mi = 0; mi < DATA.num_models; mi++) {
                for (let i = 0; i < DATA.protein.models[mi].secondary_structure_elements.length; i++) {
                    id1 = DATA.protein.models[mi].secondary_structure_elements[i].id;
                    id2 = id1.replace(id_re, '');
                    PLOT_DATA.idMap[id1] = id2;
                    PLOT_DATA.idMap[id2] = id1;
                }
            }
        
            // make the citation table (this is only called once)
            if(typeof(DATA.meta_data.citation_data) == "undefined") {
                PDB_STRUCTURE = false;
            }
            makeCitationTable();
    })
        .done(function (data) {
            /* load the NGL viewer */ 
            loadStructure(PDB_URL).then(function () {
                // make 2D visualizations with default selection
                let id = DATA.dna.models[0].entities[0].id;
                updateSelection(0, id, $("#protein_chains_select").val());
            }); // add error handling here
        })
        .done(function (data) {
            /* add data explorer */
            BigJsonViewerDom.fromObject(JSON.parse(JSON.stringify(data)), {arrayNodesLimit: 25}).then(viewer => {
                const node = viewer.getRootElement();
                document.getElementById("json_data_explorer").appendChild(node);
                node.openAll(1);
                JSON_VIEWER.root = node;
                JSON_VIEWER.viewer = viewer;
            });
            
            // used to create model selects
            JSON_VIEWER.models_array = [];
            for (let i = 0; i < data.num_models; i++) {
                JSON_VIEWER.models_array.push(i);
            }
        });
});