// Register custom JQuery function
$.fn.serializeObject = function () {
    // takes a form and serializes input elements
    var o = {}; // name-value pairs
    var a = this.serializeArray(); // serialized array
    $.each(a, function () {
        // don't look at empty inputs
        if (this.value) {
            let name = this.name;
            // strip any trailing numerical characters
            if( $.isNumeric(name[name.length-1]) ) {
                name = name.slice(0, name.length-1);
            }
            // check if o already contains this key
            if (o[name] !== undefined) {
                // check if this is an array
                if (!o[name].push) {
                    o[name] = [o[name]];
                }
                o[name].push(this.value);
            } else {
                if (this.value) o[name] = this.value;
            }
        }
    });
    return o;
};

Handlebars.registerPartial('ss_ms_none',
    '<select name="{{name}}" multiple>' +
    '<option value="H">helix</option>' +
    '<option value="S">strand</option>' +
    '<option value="L">loop</option>' +
    '</select>');

Handlebars.registerPartial('resname_ms',
    '<select name="res_name" multiple>' +
    '<option value="ALA">ALA(A)</option>' +
    '<option value="ARG">ARG(R)</option>' +
    '<option value="ASN">ASN(N)</option>' +
    '<option value="ASP">ASP(D)</option>' +
    '<option value="CYS">CYS(C)</option>' +
    '<option value="GLN">GLN(Q)</option>' +
    '<option value="GLU">GLU(E)</option>' +
    '<option value="GLY">GLY(G)</option>' +
    '<option value="HIS">HIS(H)</option>' +
    '<option value="ILE">ILE(I)</option>' +
    '<option value="LEU">LEU(L)</option>' +
    '<option value="LYS">LYS(K)</option>' +
    '<option value="MET">MET(M)</option>' +
    '<option value="PHE">PHE(F)</option>' +
    '<option value="PRO">PRO(P)</option>' +
    '<option value="SER">SER(S)</option>' +
    '<option value="THR">THR(T)</option>' +
    '<option value="TRP">TRP(W)</option>' +
    '<option value="TYR">TYR(Y)</option>' +
    '<option value="VAL">VAL(V)</option>' +
    '</select>');

Handlebars.registerPartial('nucname_ms',
    '<select name="nuc_name" multiple>' +
    '<option value="DA">Adenine(A)</option>' +
    '<option value="DC">Cytosine(C)</option>' +
    '<option value="DG">Guanine(G)</option>' +
    '<option value="DT">Thymine(T)</option>' +
    '</select>');

Handlebars.registerPartial('dna_moiety_ms',
    '<select name="{{name}}" multiple>' +
    '<option value="wg">Major Groove</option>' +
    '<option value="sg">Minor Groove</option>' +
    '<option value="bs">Base</option>' +
    '<option value="sr">Sugar</option>' +
    '<option value="pp">Phosphate</option>' +
    '</select>');

/* Handlebars Templates */
var categoryTemplate = Handlebars.compile($('#category_select_template').html());
var dnaTemplate = Handlebars.compile($("#dna_properties_template").html());
var pdbidTemplate = Handlebars.compile($("#pdbid_template").html());
var proteinTemplate = Handlebars.compile($("#protein_properties_template").html());
var interactionTemplate = Handlebars.compile($("#interactions_template").html());

var criteriaNumberFragment = ['a', 'the second', 'the third', 'the fourth', 'the final'];

/* IUPAC DNA alphabet */
var DNAalphabet = {
    A: 'A',
    C: 'C',
    T: 'T',
    G: 'G',
    R: '[AG]',
    Y: '[CT]',
    S: '[CG]',
    W: '[AT]',
    K: '[GT]',
    M: '[AC]',
    B: '[CGT]',
    D: '[AGT]',
    H: '[ACT]',
    V: '[ACG]',
    N: '[ACGT]',
    ".": '[ACGT]*'
};

var aminoAcids = [
    'ALA',
    'ARG',
    'ASN',
    'ASP',
    'CYS',
    'GLN',
    'GLU',
    'GLY',
    'HIS',
    'ILE',
    'LEU',
    'LYS',
    'MET',
    'PHE',
    'PRO',
    'SER',
    'THR',
    'TRP',
    'TYR',
    'VAL'];

var spre = /[, ]+/;

$(document).ready(function () {
    var context = {
        selection_click: "categorySelection(this);",
        remove_click: "removeCategory(this);",
        determiner: 'a',
        num: 1,
        button: true
    }
    $('#search_form').prepend(categoryTemplate(context));
    
    $.validator.setDefaults({
        errorElement: 'div',
        errorPlacement: function (error, element) {
            error.addClass('invalid-feedback');
            //error.addClass('mx-1');
            element.closest('.validated').append(error);
        },
        highlight: function (element, errorClass, validClass) {
            $(element).addClass('is-invalid');
        },
        unhighlight: function (element, errorClass, validClass) {
            $(element).removeClass('is-invalid');
        }
    });
    
    $('#search_form').validate({
        submitHandler: function (form) {
            submitSearch();
        },
        invalidHandler: function (form, validator) {
            if (!validator.numberOfInvalids())
                return;
            var offset = $(validator.errorList[0].element).closest("div.feature-group").outerHeight();
            $('html, body').animate({
                scrollTop: $(validator.errorList[0].element).offset().top - offset
            }, 500);

        }
    });
});

$('#btnClr').prop('disabled', true);
$('#btnAdd').prop('disabled', true);

$('#btnAdd').click(function () {
    // Get the number of different categories we have
    var num = $('.feature-group').length + 1;

    // Set up the template
    var context = {
        selection_click: "categorySelection(this);",
        remove_click: "removeCategory(this);",
        determiner: 'a',
        num: num,
        button: true
    }

    // Add new criteria after the last selection group
    $('#add-clear-div').before(categoryTemplate(context));

    // enable the "remove" button and disable the add button
    if (num > 1) {
        $('#btnClr').prop('disabled', false);
    } else {
        $('#btnClr').prop('disabled', true);
    }
    $('#btnAdd').prop('disabled', true);
});

$('#btnClr').click(function () {
    // Number of Feature Groups
    var num = $('.feature-group').length;

    // Remove all but the first group
    for (var i = 2; i <= num; i++) {
        $(`.feature-group[data-number=${i}]`).remove();
    }

    // Enable the "add" button
    $('#btnAdd').prop('disabled', false);

    // Disable the "clear" button
    $('#btnClr').prop('disabled', true);

    // Reset all the controls
    $('.feature-input[data-number=1]').empty();
    $('.feature-input[data-number=1]').removeClass('menu-header');
    $('.feature-group[data-number=1] input[name=search_criteria]:checked').prop('checked', false);
    $('#btnClr').prop('disabled', true);
    $('#btnAdd').prop('disabled', true);
});

function removeCategory(element) {
    var parent = $(element).closest("div.feature-group");
    var num = $(parent).data("number");
    var N = $('.feature-group').length;
    $(parent).remove();

    for (var i = num + 1; i <= N; i++) {
        $(`[data-number=${i}]`).each(function(n, e) {
            $(e).attr("data-number", i-1);
            if( $(this)[0].hasAttribute("name") ) {
                let name = $(e).attr("name");
                $(e).attr("name", `${name.slice(0, -1)}${i-1}`);
            }
        });
    }

    if (num == 1) {
        $('#btnAdd').prop('disabled', false);
        $('#btnClr').prop('disabled', true);
    }
}

function categorySelection(element) {
    var val = $(element).val();
    var num = $(element).data("number");

    switch (val) {
    case "pdbid":
        pdbidMenu(num);
        break;
    case "meta_data":
        metaDataMenu(num);
        break;
    case "protein":
        proteinMenu(num);
        break;
    case "dna":
        dnaMenu(num);
        break;
    case "interactions":
        interactionMenu(num);
        break;
    default:
        return;
    }

    // Add maximum of five categories
    if (num <= 5) {
        $('#btnAdd').prop('disabled', false);
    }
}

function pdbidMenu(num) {
    var selector = `.feature-input[data-number=${num}]`;
    $(selector).empty();
    $(selector).addClass("menu-header");
    $(selector).append(pdbidTemplate({
        num: num
    }));

    $(`${selector} textarea`).rules("add", {
        required: true,
        maxlength: 5000,
        pattern: '([1-9][a-zA-Z0-9]{3}[, \n]*)+',
        messages: {
            required: "enter at least one PDB Identifier",
            maxlength: "maximum number of IDs exceeded",
            pattern: "invalid PDB identifier found"
        }
    });
}

function metaDataMenu(num) {
    var id = `#feature-input${num}`;
    $(id).empty();
}

function proteinMenu(num) {
    /* Add Protein Features Menu */
    var selector = `.feature-input[data-number=${num}]`;
    $(selector).empty();
    $(selector).addClass("menu-header");
    $(selector).append(proteinTemplate({
        num: num
    }));

    /* Add Validation Rules */
    // PDB ID Input
    $(`${selector} input[name=pdb_id]`).rules("add", {
        required: function (element) {
            if ($(element).siblings('input[name=chain_id]').val()) {
                return true;
            } else {
                return false;
            }
        },
        pattern: "[1-9][a-zA-Z0-9]{3}",
        messages: {
            required: "PDB ID required",
            pattern: "invalid PDB ID"
        }
    });

    // Chain ID Input
    $(`${selector} input[name=chain_id]`).rules("add", {
        required: function (element) {
            if ($(element).siblings('input[name=pdb_id]').val()) {
                return true;
            } else {
                return false;
            }
        },
        pattern: "[0-9a-zA-Z]",
        messages: {
            required: "chain ID required",
            pattern: "invalid chain ID"
        }
    });

    // CATH Input
    $(`${selector} input[name=cath_id]`).rules("add", {
        pattern: "((?:[0-9]+(?:\.(?=[0-9]))?){1,4}[, ]*)+",
        messages: {
            pattern: "invalid CATH identifier"
        }
    });
    
    // GO Input
    $(`${selector} input[name=go_terms]`).rules("add", {
        pattern: "((GO:)?[0-9]+[, ]*)+",
        messages: {
            pattern: "invalid GO term format"
        }
    });
    
    // Chain length inputs
    $(`${selector} input[name=min_chain_length]`).rules("add", {
        pattern: '[0-9]+',
        messages: {
            pattern: "min must be a valid integer",
        }
    });

    $(`${selector} input[name=max_chain_length]`).rules("add", {
        pattern: '[0-9]+',
        messages: {
            pattern: "max must be a valid integer",
        }
    });
    /* Add a remote validation to check that the pdbid/chain combination are valid */
}

function dnaMenu(num) {
    var selector = `.feature-input[data-number=${num}]`;
    $(selector).empty();
    $(selector).addClass("menu-header");
    $(selector).append(dnaTemplate({
        num: num
    }));
    
    var ms_opts = {
        csvDispCount: 2,
        captionFormat: '{0} selected',
        captionFormatAllSelected: 'all selected',
        placeholder: "Any"
    };
    $(`${selector} select[name="entity_type"]`).SumoSelect(ms_opts);
    $(`${selector} select[name="dna_form"]`).SumoSelect(ms_opts);
    
    $('[data-toggle="popover"]').popover({
        container: 'body'
    });

    $(`${selector} input[name=min_seq_length]`).rules("add", {
        pattern: '[0-9]+',
        range: [2, 300],
        messages: {
            pattern: "min must be a valid integer",
            range: "min should be in the range [2, 300]"
        }
    });

    $(`${selector} input[name=max_seq_length]`).rules("add", {
        pattern: '[0-9]+',
        range: [2, 300],
        messages: {
            pattern: "max must be a valid integer",
            range: "max should be in the range [2, 300]"
        }
    });

    $(`${selector} input[name=seq_motif]`).rules("add", {
        pattern: "[ACTGRYSWKMBDHVN]+",
        maxlength: 300,
        messages: {
            pattern: "Invalid motif",
            maxlength: "Motif too long"
        }
    });

    $(`${selector} input[name=min_gc_content]`).rules("add", {
        pattern: '([0-9]*\.[0-9]+|[0-9]+)',
        range: [0, 1],
        messages: {
            pattern: "min must be a valid float",
            range: "min should be in the range [0, 1]"
        }
    });

    $(`${selector} input[name=max_gc_content]`).rules("add", {
        pattern: '([0-9]*\.[0-9]+|[0-9]+)',
        range: [0, 1],
        messages: {
            pattern: "max must be a valid float",
            range: "max should be in the range [0, 1]"
        }
    });
    
    $(`${selector} input[name=min_entity_count]`).rules("add", {
        pattern: '[0-9]+',
        min: 1,
        messages: {
            pattern: "min must be a valid integer",
            min: "min should be >= 1"
        }
    });

    $(`${selector} input[name=max_entity_count]`).rules("add", {
        pattern: '[0-9]+',
        min: 1,
        messages: {
            pattern: "max must be a valid integer",
            min: "max should be >= 1"
        }
    });
    
    $(`${selector} input[name=min_helix_count]`).rules("add", {
        pattern: '[0-9]+',
        messages: {
            pattern: "min must be a valid integer",
        }
    });

    $(`${selector} input[name=max_helix_count]`).rules("add", {
        pattern: '[0-9]+',
        messages: {
            pattern: "max must be a valid integer",
        }
    });
}

function interactionMenu(num) {
    var selector = `.feature-input[data-number=${num}]`;
    $(selector).empty();
    $(selector).addClass("menu-header");
    var context = {
        contact_items: [
            {
                name: 'wg_contacts',
                label: 'Major Groove',
                glossary_id: 'major_groove_contacts',
                grv: 'wg',
                num: num
            },
            {
                name: 'sg_contacts',
                label: 'Minor Groove',
                glossary_id: 'minor_groove_contacts',
                grv: 'sg',
                num: num
            },
            {
                name: 'sr_contacts',
                label: 'Sugar',
                glossary_id: 'sugar_contacts',
                grv: 'sr',
                num: num
            },
            {
                name: 'pp_contacts',
                label: 'Phosphate',
                glossary_id: 'phosphate_contacts',
                grv: 'pp',
                num: num
            },
            {
                name: 'bs_contacts',
                label: 'Base',
                glossary_id: 'base_contacts',
                grv: 'bs',
                num: num
            }
        ],
        amino_acids: aminoAcids,
        num: num,
        int_groove_ms: "interaction_dna_moiety",
        hb_ms: "hbond_dna_moiety",
        res_ss_ms: "res_secondary_structure"
    };
    $(selector).append(interactionTemplate(context));

    // Set up groove contact multiselects
    var ms_opts = {
        csvDispCount: 2,
        captionFormat: '{0} selected',
        captionFormatAllSelected: 'all selected',
        placeholder: "Any"
    };
    for (var i = 0; i < context.contact_items.length; i++) {
        $(selector + ` [name=${context.contact_items[i].name}]`).SumoSelect(ms_opts);
    }

    /* Set up other multiselects */
    $(selector + " [name=res_name]").SumoSelect(ms_opts);
    $(selector + " [name=nuc_name]").SumoSelect(ms_opts);
    $(selector + " [name=ss_composition]").SumoSelect(ms_opts);
    $(selector + " [name=interaction_dna_moiety]").SumoSelect(ms_opts);
    $(selector + " [name=hbond_dna_moiety]").SumoSelect(ms_opts);
    $(selector + " [name=res_secondary_structure]").SumoSelect(ms_opts);
    
    $('[data-toggle="popover"]').popover({
        container: 'body'
    });
}

function _eq(x) {
    if(Array.isArray(x)) {
        if(x.length == 1) {
            return x[0];
        }
        return {'$in': x};
    } else {
        return x;
    }
}

function _neq(x) {
    if(Array.isArray(x)) {
        if(x.length == 1) {
            return {'$ne': x[0]};
        }
        return {'$nin': x};
    } else {
        return {'$ne': x};
    }
}

function _and(x){
    if(x.length == 1) {
        return x[0];
    }
    return {'$and': x};
}

function _or(x){
    if(x.length == 1) {
        return x[0];
    }
    return {'$or': x};
}

function _nor(x){
    if(x.length == 1) {
        return x[0];
    }
    return {'$nor': x};
}

function _lt(x) {
    return {'$lt': x};
}

function _gt(x) {
    return {'$gt': x};
}

function _gte(x) {
    return {'$gte': x};
}

function submitSearch() {
    var searchItems = [];
    var fieldset_id, fieldset_data, category, searchTerms;
    var op;
    
    for (let i = 1; i <= $('.feature-group').length; i++) {
        category = $(`.feature-group[data-number=${i}] input[name=search_criteria${i}]:checked`).val();
        fieldset = `.feature-input[data-number=${i}]`;
        fieldset_data = $(fieldset).last().serializeObject();
        //console.log(fieldset_data);

        /* Set up the search terms for current feature-group */
        let logic_op
        if (fieldset_data['logic'] == 'any') {
            logic_op = _or;
        } else {
            logic_op = _and;
        }
        searchTerms = [];
        
        switch (category) {
        case "pdbid":
            // Get PDBIDs
            if (fieldset_data['pdb_ids']) {
                searchItems.push({structure_id: {'$in': fieldset_data['pdb_ids'].toLowerCase().split(/[\s,]+/)}});
            }
            break;
        case "meta_data":
            break;
        case "dna":
            searchTerms = {'dna.models': {'$elemMatch': {}}};
            var entity_ops = {'$elemMatch': []};
                
            /* Strand Features */
            var strand_ops = [];
            // Sequence Length
            if (fieldset_data['min_seq_length'] || fieldset_data['max_seq_length']) {
                let op = {"length": {}};
                if (fieldset_data['min_seq_length']) {
                    op['length']["$gte"] = Number(fieldset_data['min_seq_length']);
                }
                if (fieldset_data['max_seq_length']) {
                    op['length']["$lte"] = Number(fieldset_data['max_seq_length']);
                }
                strand_ops.push(op);
            }
            
            // Sequence Motif
            if(fieldset_data['seq_motif']) {
                let op = {"sequence": {}};
                // build the regular expression
                let re = '';
                for (let j = 0; j < fieldset_data['seq_motif'].length; j++) {
                    re += DNAalphabet[fieldset_data['seq_motif'][j]];
                }
                if(fieldset_data['reverse_seq_motif']) {
                    re += '|' + re.split().reverse().join();
                }
                re = '/' + re + '/';
                
                // Apply negation if selected
                if (fieldset_data['negate_seq_motif']) {
                    op['sequence']['$not'] = re;
                } else {
                    op['sequence']['$regex'] = re;
                }
                strand_ops.push(op);
            }
            
            // GC-content
            if (fieldset_data['min_gc_content'] || fieldset_data['max_gc_content']) {
                let op = {'GC_content': {}};
                if (fieldset_data['min_gc_content']) {
                    op['GC_content']["$gte"] = Number(fieldset_data['min_gc_content']);
                }
                if (fieldset_data['max_gc_content']) {
                    op['GC_content']["$lte"] = Number(fieldset_data['max_gc_content']);
                }
                strand_ops.push(op);
            }
            
            // Number of strands
            if (fieldset_data['min_strand_count'] || fieldset_data['max_strand_count']) {
                let op = {'num_strands': {}};
                if (fieldset_data['min_strand_count']) {
                    op['num_strands']["$gte"] = Number(fieldset_data['min_strand_count']);
                }
                if (fieldset_data['max_strand_count']) {
                    op['num_strands']["$lte"] = Number(fieldset_data['max_strand_count']);
                }
                entity_ops['$elemMatch'].push(op);
            }
            
            // Verify if binding site
            if(fieldset_data['binding_site']) {
                strand_ops.push({'interacts_with_protein': true});
            }
            
            /* Structural Features */
            // Number of entities
            if (fieldset_data['min_entity_count'] || fieldset_data['max_entity_count']) {
                let op = {};
                if (fieldset_data['min_entity_count']) {
                    op["$gte"] = Number(fieldset_data['min_entity_count']);
                }
                if (fieldset_data['max_entity_count']) {
                    op["$lte"] = Number(fieldset_data['max_entity_count']);
                }
                searchTerms['dna.models']['$elemMatch']['num_entities'] = op;
            }
            
            // Entity types
            if (fieldset_data['entity_type']) {
                let op = {'type': null};
                op['type'] = _eq(fieldset_data['entity_type']);
                entity_ops['$elemMatch'].push(op);
            }
            
            // Entity Chemical Modifications 
            if (fieldset_data['entity_chemical_modification']) {
                let fields = [];
                let op = _or;
                let bool = true;
                if (fieldset_data['negate_entity_chemical_modification']) {
                    op = _and;
                    bool = false;
                }
                if(fieldset_data['entity_chemical_modification'].constructor !== Array) {
                    fieldset_data['entity_chemical_modification'] = [fieldset_data['entity_chemical_modification']];
                }
                for (let j = 0; j < fieldset_data['entity_chemical_modification'].length; j++) {
                    fields.push({})
                    fields[fields.length - 1][`chemical_modifications.${fieldset_data['entity_chemical_modification'][j]}`] = bool
                }
                entity_ops['$elemMatch'].push(op(fields));
            }
            
            /* Helix Features */
            var helix_ops = [];
            // Axis Curvature
            if (fieldset_data['axis_curvature']) {
                let op = {'helical_axis.axis_curvature': null};
                op ['helical_axis.axis_curvature'] = _eq(fieldset_data['axis_curvature']);
                helix_ops.push(op);
            }
            
            // DNA-Form
            if (fieldset_data['dna_form']) {
                let op = {'classification': null};
                op ['classification'] = _eq(fieldset_data['dna_form']);
                helix_ops.push(op);
            }
            
            // Base-Pairing
            if (fieldset_data['base_pairing']) {
                let fields = [];
                let op = _or;
                let bool = true;
                if (fieldset_data['negate_base_pairing']) {
                    op = _and;
                    bool = false;
                }
                if(fieldset_data['base_pairing'].constructor !== Array) {
                    fieldset_data['base_pairing'] = [fieldset_data['base_pairing']];
                }
                for (let j = 0; j < fieldset_data['base_pairing'].length; j++) {
                    fields.push({})
                    fields[fields.length - 1][`${fieldset_data['base_pairing'][j]}`] = bool
                }
                helix_ops.push(op(fields));
            }
            
            // Number of Helices
            if (fieldset_data['min_helix_count'] || fieldset_data['max_helix_count']) {
                let op = {'num_helical_segments': {}};
                if (fieldset_data['min_helix_count']) {
                    op['num_helical_segments']["$gte"] = Number(fieldset_data['min_helix_count']);
                }
                if (fieldset_data['max_helix_count']) {
                    op['num_helical_segments']["$lte"] = Number(fieldset_data['max_helix_count']);
                }
                entity_ops['$elemMatch'].push(op);
            }
            
            if(strand_ops.length > 0) {
                let op = {'strands': {'$elemMatch': null}};
                op['strands']['$elemMatch'] = logic_op(strand_ops);
                entity_ops['$elemMatch'].push(op);
            }
            
            if(helix_ops.length > 0) {
                let op = {'helical_segments': {'$elemMatch': null}};
                op['helical_segments']['$elemMatch'] = logic_op(helix_ops);
                entity_ops['$elemMatch'].push(op);
            }
            
            if(entity_ops['$elemMatch'].length > 0) {
                entity_ops['$elemMatch'] = logic_op(entity_ops['$elemMatch']);
                searchTerms['dna.models']['$elemMatch']['entities'] = entity_ops;
            }
            searchItems.push(searchTerms);
            break;
        case "protein":
            /* Sequence Similarity */
            if (fieldset_data['chain_id'] && fieldset_data['pdb_id']) {
                var cluster = fieldset_data['sequence_similarity'];
                var pdbid = fieldset_data['pdb_id'];
                var chain = fieldset_data['chain_id'].toUpperCase();

                $.ajax({
                    type: "GET",
                    data: {
                        structureId: `${pdbid}.${chain}`,
                        cluster: cluster
                    },
                    dataType: "xml",
                    async: false,
                    success: function (xml) {
                        let op = {};
                        if ($(xml).find('pdbChain')) {
                            if (fieldset_data['negate_sequence_similarity']) {
                                op[`sequence_clusters.${cluster}`] = {
                                    "$ne": $(xml).find('pdbChain').attr('name')
                                };
                            } else {
                                op[`sequence_clusters.${cluster}`] = $(xml).find('pdbChain').attr('name');
                            }
                            searchTerms.push(op);
                        }
                    },
                    url: "http://www.rcsb.org/pdb/rest/representatives"
                });
            }

            /* UniProt Identifier */
            if (fieldset_data['uniprot_id']) {
                let op;
                let data = fieldset_data['uniprot_id'];
                data = data.split(spre);
                if(data.length == 1) {
                    data = data[0];
                }
                op = {};
                if(fieldset_data['negate_uniprot_id']) {
                    op['uniprot_accesion'] = _neq(data);

                } else {
                    op['uniprot_accession'] = _eq(data);
                }
                searchTerms.push(op)
            /*
            searchTerms['protein.chains']['$elemMatch'][logic].push({
                "$and": [{
                    "$text": {
                        "$search": fieldset_data['protein_name'],
                        "$language": "none"
                    }
                }, {
                    "uniprot_accession": {
                        "$ne": fieldset_data['protein_name']
                    }
                }]
            });
            */
            }

            /* CATH Domain ID */
            if (fieldset_data['cath_id']) {
                let op1, op2;
                let fields = [
                    'cath_class',
                    'cath_architecture',
                    'cath_topology',
                    'cath_homologous_superfamily'
                ];
                let field_data = [
                    [],
                    [],
                    [],
                    []
                ];
                // split multiple data items
                let data = fieldset_data['cath_id'];
                data = data.split(spre);
                
                // place data items with correct field so we don't have to query all fields
                for(let j = 0; j < data.length; j++) {
                    field_data[data[j].split('.').length-1].push(data[j]);
                }
                
                // choose operators
                if(fieldset_data['negate_cath_id']) {
                    op2 = _neq;
                    op1 = _and;
                } else {
                    op2 = _eq;
                    op1 = _or;
                }
                let field_ops = [];
                for(let j = 0; j < fields.length; j++) {
                    if(field_data[j].length > 0) {
                        let op = {}
                        op[fields[j]] = op2(field_data[j]);
                        field_ops.push(op);
                    }
                }
                searchTerms.push(op1(field_ops));
            }
            
            /* GO Terms */
            if(fieldset_data['go_terms']) {
                let op1, op2, f;
                let fields = [
                    'GO_molecular_function.GO_ID',
                    'GO_cellular_component.GO_ID',
                    'GO_biological_process.GO_ID',
                ];
                let data = fieldset_data['go_terms'];
                data = data.split(spre);
                if(data.length == 1) {
                    data = data[0];
                }
                if(fieldset_data['negate_go_term']) {
                    op2 = _neq;
                    op1 = _and;
                } else {
                    op2 = _eq;
                    op1 = _or;
                }
                
                for(let j = 0; j < fields.length; j++) {
                    f = fields[j];
                    fields[j] = {};
                    fields[j][f] = op2(data);
                }
                searchTerms.push(op1(fields));
            }
            
            /* Chain Length */
            if (fieldset_data['min_chain_length'] || fieldset_data['max_chain_length']) {
                let op = {"length": {}};
                if (fieldset_data['min_chain_length']) {
                    op['length']["$gte"] = Number(fieldset_data['min_chain_length']);
                }
                if (fieldset_data['max_chain_length']) {
                    op['length']["$lte"] = Number(fieldset_data['max_chain_length']);
                }
                searchTerms.push(op);
            }
            
            /* DNA Interaction Checkbox */
            if (fieldset_data['interacts']) {
                searchTerms.push({"interacts_with_dna": true});
            }
            
            /* Add search terms to query */
            op = {'protein.chains':{}};
            op['protein.chains']['$elemMatch'] = logic_op(searchTerms);
            searchItems.push(op);
            break;
        case "interactions":
            let grvs = ['wg', 'sg', 'bs', 'sr', 'pp'];
            let key, op1, op2, contact_items, item;
            
            var interface_ops = [];
            /* Interface Features */
            // Groove Contacts
            for (let j = 0; j < grvs.length; j++) {
                key = `${grvs[j]}_contacts`;
                if (fieldset_data[key]) {
                    // Convert to array if only a single value
                    if (fieldset_data[key].constructor !== Array) {
                        fieldset_data[key] = [fieldset_data[key]];
                    }

                    // Check for negation and search logic
                    if (fieldset_data[`negate_${grvs[j]}_selection`]) {
                        if (fieldset_data[`${grvs[j]}_logic`] == 'all') {
                            op1 = _or;
                        } else {
                            op1 = _and;
                        }
                        op2 = _lt;
                    } else {
                        if (fieldset_data[`${grvs[j]}_logic`] == 'all') {
                            op1 = _and;
                        } else {
                            op1 = _or;
                        }
                        op2 = _gte;
                    }
                    
                    // Loop over options
                    contact_items = [];
                    for (let k = 0; k < fieldset_data[key].length; k++) {
                        item = {};
                        item[`interaction_moiety_summary.${grvs[j]}.${fieldset_data[key][k]}`] = op2(1);
                        contact_items.push(item);
                    }
                    interface_ops.push(op1(contact_items));
                }
            }

            // SS Composition
            if (fieldset_data['ss_composition']) {
                item = {};
                item['secondary_structure_composition'] = _eq(fieldset_data['ss_composition']);
                interface_ops.push(item);
            }

            // Residue Propensity
            for (let j = 0; j < aminoAcids.length; j++) {
                if (fieldset_data[`${aminoAcids[j]}_propensity`] == 'enhanced') {
                    item = {};
                    item[`interface_features.residue_propensities.${aminoAcids[j]}`] = _gt(0.0);
                    interface_ops.push(item);
                } else if (fieldset_data[`${aminoAcids[j]}_propensity`] == 'depleted') {
                    item = {};
                    item[`interface_features.residue_propensities.${aminoAcids[j]}`] = _lt(0.0);
                    interface_ops.push(item);
                }
            }

            /* Residue-Nucleotide Interaction Features */
            let nuc_res_ops = [];
            let fields = [
                'nuc_name',
                'res_name',
                'res_secondary_structure',
                'geometry'
            ]
            for(let j = 0; j < fields.length; j++) {
                if (fieldset_data[fields[j]]) {
                    item = {};
                    item[fields[j]] = _eq(fieldset_data[fields[j]]);
                    nuc_res_ops.push(item);
                }
            }
          
            // Groove
            if (fieldset_data['interaction_dna_moiety']) {
                if (fieldset_data['negate_groove']) {
                    op = _neq;
                } else {
                    op = _eq;
                }
                item = {};
                item['nucleotide_interaction_moieties'] = op(fieldset_data['interaction_dna_moiety']);
                nuc_res_ops.push(item);
            }

            // Hbonds
            if (fieldset_data['hbond_dna_moiety']) {
                if (fieldset_data['negate_hbonds']) {
                    if (fieldset_data['hbond_logic'] == 'all') {
                        op1 = _or;
                        
                    } else {
                        op1 = _and;
                    }
                    op2 = "$eq";
                } else {
                    if (fieldset_data['hbond_logic'] == 'all') {
                        op1 = _and;
                    } else {
                        op1 = _or;
                    }
                    op2 = "$gt";
                }
                 contact_items = [];
                if (fieldset_data['hbond_dna_moiety'].constructor === Array) {
                    for (var j = 0; j < fieldset_data['hbond_dna_moiety'].length; j++) {
                        item = {};
                        item[`hbond_sum.${fieldset_data['hbond_dna_moiety'][j]}.total`] = {};
                        item[`hbond_sum.${fieldset_data['hbond_dna_moiety'][j]}.total`][op2] = 0;
                        contact_items.push(item);
                    }
                } else {
                    item = {};
                    item[`hbond_sum.${fieldset_data['hbond_dna_moiety']}.total`] = {};
                    item[`hbond_sum.${fieldset_data['hbond_dna_moiety']}.total`][op2] = 0;
                    contact_items.push(item);
                }
                nuc_res_ops.push(op1(contact_items));
            }

            if(interface_ops.length > 0) {
                searchTerms.push({
                    "interface_features": {
                        $elemMatch: logic_op(interface_ops)
                    }
                });
            }
            
            if (nuc_res_ops.length > 0) {
                searchTerms.push({
                    "nucleotide-residue_interactions": {
                        $elemMatch: logic_op(nuc_res_ops)
                    }
                });
            }
            
            op = {'interfaces.models': {'$elemMatch': {'$elemMatch': null}}};
            op['interfaces.models']['$elemMatch']['$elemMatch'] = logic_op(searchTerms);
            searchItems.push(op);
            break;
        default:
            return;
        }
    }
    /* Combine Search Terms */
    var matchOpt = $('#search_form input[name=matchOpt]:checked').val();
    var query;
    if (matchOpt == 0) {
        query = _and(searchItems);
    } else if (matchOpt == 1) {
        query = _or(searchItems);
    } else if (matchOpt == 2) {
        query = _nor(searchItems);
    }
    console.log(JSON.stringify(query));
    window.open("/cgi-bin/query-results?query=" + JSON.stringify(query));
}