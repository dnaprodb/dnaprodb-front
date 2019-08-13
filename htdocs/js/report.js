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

var glossary_window = {
    closed: true
};

function glossary(id) {
    var opts = 'toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,height=400,width=800';
    if (!glossary_window.closed) {
        glossary_window.close();
    }
    glossary_window = window.open(`/cgi-bin/glossary?id=${id}#${id}`, 'targetWindow', opts);
}

/* Function Definitions */
// Create a pymol script
/*
function exportPymol() {
    var commands = [
        `# This script is only guaranteed to work with the structure downloaded from the report page from which this script was generated (${STRUCTURE_ID}.pdb).`,
        '# To run this script enter the following commands into the Pymol terminal (don\'t include the \'>\' character)',
        '# > cd /dir/to/script/color_script.pym',
        '# > @color_script.pym',
        'color slate, (all)',
    ];
    // Define domain colors
    for (var ss in report.plottingOptions.domain_colors) {
        for (var i = 0; i < report.plottingOptions.domain_colors[ss].length; i++) {
            color = report.hexToRGB(report.plottingOptions.domain_colors[ss][i]);
            commands.push(`set_color ${ss}${i}=[${color.r}, ${color.g}, ${color.b}]`);
        }
    }

    // Add DNA color
    commands.push(`extract DNA, chain ${report.structureData.dna_chains.join('+')}`);
    commands.push('color grey, DNA');

    var sse_ids = [];
    var sse, cname, di, gi, rnums, color;

    for (var si in report.plottingOptions.interface_sse_ids) {
        for (var i = 0; i < report.plottingOptions.grv_selection.length; i++) {
            gi = report.plottingOptions.grv_selection[i];
            sse_ids = sse_ids.concat(report.plottingOptions.interface_sse_ids[si][gi]);
        }
    }
    sse_ids = sse_ids.unique();

    for (var i = 0; i < sse_ids.length; i++) {
        sse = report.structureData.sse[sse_ids[i]];
        cname = sse.chain;
        if (cname in report.plottingOptions.domain_map) {
            di = report.plottingOptions.domain_map[cname];
        } else {
            continue;
        }
        rnums = [];
        for (var j = 0; j < sse.res_ids.length; j++) {
            rnums.push(sse.res_ids[j].split('.')[1]);
        }
        color = sse.secondary_structure + di;

        commands.push(`create ${sse.label.replace(':', '_')}, ${STRUCTURE_ID}`);
        commands.push(`select hide, not (chain ${cname} and resi ${rnums.join('+')})`);
        commands.push(`cartoon skip, hide and ${sse.label.replace(':', '_')}`);
        commands.push(`cartoon skip, (not hide) and ${STRUCTURE_ID}`);
        commands.push(`color ${color}, ${sse.label.replace(':', '_')}`);
    }
    commands.push(`set cartoon_transparency, 0.75, ${STRUCTURE_ID}`);
    commands.push('show_as cartoon');
    commands.push('delete hide');
    commands.push('bg_color white');

    var text = commands.join("\n");
    var filename = "color_script.pym";
    var blob = new Blob([text], {
        type: "text/plain;charset=utf-8"
    });
    saveAs(blob, filename);
};
*/

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
                names: 'N/A',
                organism: 'N/A',
                uniprot: 'N/A',
                cath: 'N/A',
                go_function: 'N/A',
                go_process: 'N/A',
                go_component: 'N/A',
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

var resizeTimer;
$(document).ready(function () {
    $('#ngl_controls_button').click(function () {
        var val = $(this).text();
        if (val == "Show Controls") {
            $(this).text("Hide Controls");
        } else {
            $(this).text("Show Controls");
        }
    });

    $('#advanced_options_button').click(function () {
        var val = $(this).text();
        if (val == "show advanced options") {
            $(this).text("hide advanced options");
        } else {
            $(this).text("show advanced options");
        }
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

    $("#json_download_link").prop("href", JSON_URL).prop("download", `${STRUCTURE_ID}.json`);
    
    $("#download_pdb").prop("href", PDB_URL).prop("download", `${STRUCTURE_ID}.pdb`);
    
    $('#image_export').click(function (){
        saveViewerAsImage().then(function(blob) {
          saveAs(blob, `${STRUCTURE_ID}_3d.png`); 
        });
    });
    
    $("#lcm_link").click(function () {
        $("#lcm_console_link").tab("show");
    });
    
    $("#pcm_link").click(function () {
        $("#pcm_console_link").tab("show");
    });
    
    $("#sop_link").click(function () {
        $("#sop_console_link").tab("show");
    });
    
    loadStructure(PDB_URL).then(setTimeout(initializeVisualizations, 500));
});

$(window).resize(function () {
    if(resizeTimer){
        clearTimeout(resizeTimer);
    }
    resizeTimer = setTimeout(stage_nm1.handleResize(), 200);
});