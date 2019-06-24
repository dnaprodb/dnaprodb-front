//Author: Nicholas Markarian
//Last updated: 6/5/2019 at 12:56 am
var stage_nm1;
var ballStick_list_nm1 = [] //list of index values for ballStick representations... used to dispose of them after use
var ballStick_list_nm1_index = 0; //dont need anymore, will delete later
var chain_set_nm1 = new Set();
var model_list_nm1 = []
var visible_residue_list_nm1 = [];
var visibility_list_nm1 = [];
var model_number_nm1 = 0;
var number_of_models_nm1 = 0;
var multi_nm1 = new Map();
var index_nm1 = 0;


//TODO 
// 1. actually delete with deleteLater in addMissingRepresentation


/*loadStructure() must be called first. takes in a string, loads file onto stage. Everything gets added as a representation to the component "init_component." For each
representation, there is an object in the array  "model_list_nm1". Each index has a repr_info object containing the color scheme
by secondary structure and the index that the representation is stored at in stage.compList[0].reprList[index]
access: via stage_nm1.getComponentsByName("my_structure").list[0].reprList[index]
repr_info objects also store whether the cartoonchain is nucleic and as a corresponding base representation
For each model, there are the following representations:
layer_0 cartoon (transparent, gray, always visible)
layer_0 base    (transparent, gray, always visible)
layer_0 heteroatom (transparent, gray, always visible)
layer 1 chains (colored, toggled on and off)
layer 2 ball+stick (not made in this function... made by addBallStick() )
In this function, "init_component" is the component that representations get added to*/
function selectModel(model_number_)
{
  selectResidues3D([]); //clear with empty list
  //turn off visibility of layer 0 for old model
  var old_cartoon_reprList_index = model_list_nm1[model_number_nm1].get("_layer_0_cartoon"+"/"+model_number_nm1).index;
  stage_nm1.getComponentsByName("my_structure").list[0].reprList[old_cartoon_reprList_index].setVisibility(0);
  var old_base_reprList_index = model_list_nm1[model_number_nm1].get("_layer_0_base"+"/"+model_number_nm1).index;
  stage_nm1.getComponentsByName("my_structure").list[0].reprList[old_base_reprList_index].setVisibility(0);
  var old_hetero_reprList_index = model_list_nm1[model_number_nm1].get("/"+model_number_nm1+"_hetero").index;
  stage_nm1.getComponentsByName("my_structure").list[0].reprList[old_hetero_reprList_index].setVisibility(0);
  
  //change model number
  model_number_nm1 = model_number_;

  //turn on visiblity of layer 0 for new model
  var new_cartoon_reprList_index = model_list_nm1[model_number_nm1].get("_layer_0_cartoon"+"/"+model_number_nm1).index;
  //console.log(stage_nm1.getComponentsByName("my_structure").list[0].reprList[new_cartoon_reprList_index])
  stage_nm1.getComponentsByName("my_structure").list[0].reprList[new_cartoon_reprList_index].setVisibility(1);
  var new_base_reprList_index = model_list_nm1[model_number_nm1].get("_layer_0_base"+"/"+model_number_nm1).index;
  //console.log(stage_nm1.getComponentsByName("my_structure").list[0].reprList[new_base_reprList_index])
  stage_nm1.getComponentsByName("my_structure").list[0].reprList[new_base_reprList_index].setVisibility(1);
  var new_hetero_reprList_index = model_list_nm1[model_number_nm1].get("/"+model_number_nm1+"_hetero").index;
  stage_nm1.getComponentsByName("my_structure").list[0].reprList[new_hetero_reprList_index].setVisibility(1);

  var principleAxes = stage_nm1.getComponentsByName("my_structure").list[0].structure.getPrincipalAxes();
  stage_nm1.animationControls.rotate(principleAxes.getRotationQuaternion(), 0);

}

function loadStructure(structure_url) {
  console.log("6/5/2019 12:56 am")
  stage_nm1 = new NGL.Stage("viewport", {backgroundColor: "white", opacity: 0});

  var tooltip = document.createElement("div");
  Object.assign(tooltip.style, { //copied code from NGL gallery
    display: "none",
    position: "fixed",
    zIndex: 10,
    pointerEvents: "none",
    backgroundColor: "rgba( 0, 0, 0, 0.6 )",
    color: "lightgrey",
    padding: "8px",
    fontFamily: "sans-serif"
  });
  
  document.body.appendChild(tooltip);
  
  return stage_nm1.loadFile(structure_url, {name: "my_structure"}).then(function (init_component) 
  { 
    var mySstrucColors = NGL.ColormakerRegistry.addScheme(function (params) 
    {
      this.atomColor = function (atom) {
        //atom.residue.sstruc = "s"; //turn
        //atom.residue.sstruc = "e"; //sheet
        //atom.residue.sstruc = "h"; //helix
        if (atom.isNucleic()) {
          return 0xFFA500;  // orange
        } 
        else if (atom.isHelix()){
          return 0xFF0000;  // red
        }
        else if (atom.isTurn()){
          return 0x437FF9;  // blue
        }
        else if (atom.isSheet()){
          return 0x43F970;  // green
        }
        else{
          return 0xFFFFFF; //white
        }
      };
    });
    stage_nm1.animationControls.dispose();
    //init_component.addRepresentation("ball+stick", {sele: ":F", color: "red"})
    //init_component.addRepresentation("ball+stick", {sele: ":C", color: "blue"})
    //init_component.addRepresentation("ball+stick", {sele: ":E", color: "yellow"})
   // init_component.addRepresentation("cartoon", {sele: "188-301", color: "green"})
    //init_component.addRepresentation("ball+stick", {sele: ":A", color: "yellow"})
    //init_component.addRepresentation("cartoon", {sele: "all", color: "orange"})
    //init_component.addRepresentation("ball+stick", {sele: ":C", color: "yellow"})
    //init_component.addRepresentation("cartoon", {sele: "1:C", color: "blue"})
    //init_component.addRepresentation("ball+stick", {sele: ":D", color: "red"})
    //init_component.addRepresentation("cartoon", {sele: ":D", color: "green"})
    var deleteLater = new Set();

    init_component.structure.eachModel( function (modelProxy)
    {
      number_of_models_nm1++;
      model_list_nm1.push(new Map())
      var model_name = modelProxy.qualifiedName();
      var model_number = model_name.substring(1, model_name.length)
      var cart = init_component.addRepresentation("cartoon", {name: "_layer_0_cartoon"+ model_name, sele: model_name+"/", color: "lightgray", opacity: 0.2}) //layer 0: transparent baselayer
      var repr_info = {index: index_nm1, nucleic: 0, visibility: 0, DNA: 0xd3d3d3, RNA: 0xd3d3d3, helix: 0xd3d3d3, turn: 0xd3d3d3, sheet: 0xd3d3d3}
      model_list_nm1[model_number].set(cart.name, repr_info);
      cart.setVisibility(0);
      if (model_number == "0")
      {
        cart.setVisibility(1);
      }
      index_nm1++;
      ballStick_list_nm1_index++;
      var base = init_component.addRepresentation("base", {name: "_layer_0_base" + model_name , color: "lightgray", sele: model_name+"/", opacity: 0.2, cylinderOnly: 1}) //adds nucleotides as sticks
      var repr_info = {index: index_nm1, nucleic: 0, visibility: 0, DNA: 0xd3d3d3, RNA: 0xd3d3d3, helix: 0xd3d3d3, turn: 0xd3d3d3, sheet: 0xd3d3d3}
      model_list_nm1[model_number].set(base.name, repr_info);
      base.setVisibility(0);
      if (model_number == "0")
      {
        base.setVisibility(1);
      }
      index_nm1++;
      ballStick_list_nm1_index++;
      modelProxy.eachChain(function(chain) //layer 1, each chain is a different representation that can be turned on/off with setVisibility()
      {
        //console.log("chain:  "+chain.qualifiedName())
        var nucleic_ = 0;
        var hasPolymer = false;
        chain.eachPolymer( function(polymer)
        {
          hasPolymer = true;
          //console.log("polymer:  "+ polymer.qualifiedName())
          if (polymer.isNucleic())
          {
            nucleic_ = 1;
          }
          var polymerName = polymer.qualifiedName();
          var begin_starting_res_num = polymerName.indexOf("]");
          var end_starting_res_num = polymerName.indexOf(":");
          
          var begin_ending_res_num = polymerName.lastIndexOf("]");
          var end_ending_res_num = polymerName.lastIndexOf(":");
          var range_ = "("+polymerName.substring(begin_starting_res_num+1,end_starting_res_num)+"-"+polymerName.substring(begin_ending_res_num+1,end_ending_res_num)+")";
          
          
          var chainName = polymer.qualifiedName().substring(polymerName.indexOf(":"),polymerName.indexOf(" "));
          var chainName_noRange = polymer.qualifiedName().substring(polymerName.indexOf(":"),polymerName.indexOf(" "));
          //console.log(chainName)
          if (model_list_nm1[model_number].has(chainName))
          {
            var temp = model_list_nm1[model_number].get(chainName);
            var temp_name = chainName;
            model_list_nm1[model_number].set(temp_name+temp.range, temp);
            if (multi_nm1.has(chainName))
            {
              //{start,end} pair to indicate range
              multi_nm1.get(chainName).push({start: Number(polymerName.substring(begin_starting_res_num+1,end_starting_res_num)), end: Number(polymerName.substring(begin_ending_res_num+1,end_ending_res_num))})
            }
            else
            {
              //insert array with {start, end} pair
              multi_nm1.set(chainName, [{start: Number(polymerName.substring(begin_starting_res_num+1,end_starting_res_num)), end: Number(polymerName.substring(begin_ending_res_num+1,end_ending_res_num))}]);
              //add old one
              var prev_dash = temp.range.indexOf("-");
              var prev_start = Number(temp.range.substring(1,prev_dash));
              var prev_end = Number(temp.range.substring(prev_dash+1, temp.range.length -1))
              multi_nm1.get(chainName).push({start: prev_start, end: prev_end})
            }
            
            deleteLater.add(temp_name);
            
            chainName = chainName+range_;

            if (temp.nucleic)
            {
              var temp_base_name = temp_name+"_base";
              temp = model_list_nm1[model_number].get(temp_base_name);
              model_list_nm1[model_number].set(temp_name+temp.range+"_base", temp);
              deleteLater.add(temp_base_name);
            }
          }
          //console.log(chainName_noRange + " and " + range_)
          var new_rep = init_component.addRepresentation("cartoon", {name: chainName, sele: chainName_noRange + " and " + range_, color: mySstrucColors});
          new_rep.setVisibility(0); //sets the colored chains as invisible
          
          var repr_info = {index: index_nm1, name: chainName, range: range_, nucleic: nucleic_, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
          
          model_list_nm1[model_number].set(chainName, repr_info); //this causes the map entries to get overwritten
          index_nm1++; //increments anyways, since the heteroatoms get put into the real structure
          ballStick_list_nm1_index++;

          if (polymer.isNucleic())
          {
              //console.log(chainName)
              var base = init_component.addRepresentation("base", {name: chainName+"_base", sele: chainName_noRange + " and " + range_, color: "resname", cylinderOnly: 1});
             // console.log(chainName + " and " + range_)
              base.setVisibility(0);
              var base_info = {index: index_nm1, name:chainName+"_base", range: range_, cartoon_index: index_nm1-1, cartoon_name: chainName, visibility: 0}// modified_colors: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
              var base_name = chainName + "_base"
              model_list_nm1[model_number].set(base_name, base_info);
              model_list_nm1[model_number].get(chainName).nucleic = 1;
              index_nm1++;
              ballStick_list_nm1_index++;
          }
        });
        if (!hasPolymer)
        {
          /*if (chain.qualifiedName() == ":C/0")
          {
            console.log(":C/0 has no polymer")
          }*/
          var resProxy;
          var first = true;
          var start_ = -1;
          var end_ = -1;
          chain.eachResidue(function (residue)
          {
            if (first)
            {
              resProxy = residue;
              start_ = residue.resno;
            }
            first = false;
            end_ = residue.resno;
          })
          var range_ =  "" 
          //console.log(resProxy)
          var chainName = chain.qualifiedName();
          //console.log(resProxy.qualifiedName())
          //console.log(chainName+ "   " + range_)
         // ========================================//
         if(!resProxy.hetero)
         {
          if (model_list_nm1[model_number].has(chainName))
          {
            range_ = "("+start_+"-"+end_+")";
            /*if (chain.qualifiedName() == ":C/0")
              {
                console.log("model list has chain name")
                console.log(multi_nm1)
              }*/
            var temp = model_list_nm1[model_number].get(chainName);
            var temp_name = chainName;
            model_list_nm1[model_number].set(temp_name+temp.range, temp);
            if (multi_nm1.has(chainName))
            {
              /*if (chain.qualifiedName() == ":C/0")
              {
                console.log("multi has chain name")
                console.log(multi_nm1)
              }*/
              //{start,end} pair to indicate range
              multi_nm1.get(chainName).push({start: start_, end: end_})
            }
            else
            {
              /*if (chain.qualifiedName() == ":C/0")
              {
                console.log("multi does not have chain name")
                console.log(multi_nm1)
              }*/
              //insert array with {start, end} pair
              multi_nm1.set(chainName, [{start: start_, end: end_}]);
              //add old one
              var prev_dash = temp.range.indexOf("-");
              var prev_start = Number(temp.range.substring(1,prev_dash));
              var prev_end = Number(temp.range.substring(prev_dash+1, temp.range.length -1))
              multi_nm1.get(chainName).push({start: prev_start, end: prev_end})
            }
            
            deleteLater.add(temp_name);
            

            if (temp.nucleic)
            {
              var temp_base_name = temp_name+"_base";
              temp = model_list_nm1[model_number].get(temp_base_name);
              model_list_nm1[model_number].set(temp_name+temp.range+"_base", temp);
              deleteLater.add(temp_base_name);
            }
          }
          
          var new_rep = init_component.addRepresentation("cartoon", {name: chainName+range_, sele: chainName+ " and "+ range_, color: mySstrucColors});
          new_rep.setVisibility(0); //sets the colored chains as invisible
          
          var repr_info = {index: index_nm1, name: chainName+range_, range: range_, nucleic: nucleic_, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
          
          model_list_nm1[model_number].set(chainName+range_, repr_info); //this causes the map entries to get overwritten
          index_nm1++; //increments anyways, since the heteroatoms get put into the real structure
          ballStick_list_nm1_index++;

          if (resProxy.isNucleic())
          {
              //console.log(chainName)
              var base = init_component.addRepresentation("base", {name: chainName+range_+"_base", sele: chainName+ " and "+ range_, color: "resname", cylinderOnly: 1});
             // console.log(chainName + " and " + range_)
              base.setVisibility(0);
              var base_info = {index: index_nm1, name:chainName+range_+"_base", range: range_, cartoon_index: index_nm1-1, cartoon_name: chainName, visibility: 0}// modified_colors: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
              var base_name = chainName +range_+ "_base"
              model_list_nm1[model_number].set(base_name, base_info);
              model_list_nm1[model_number].get(chainName +range_).nucleic = 1;
              index_nm1++;
              ballStick_list_nm1_index++;
          }
         }
          //---------------------------------------//
          /*if (!resProxy.hetero)
          {
            var new_rep = init_component.addRepresentation("cartoon", {name: chainName, sele: chainName, color: mySstrucColors});
            new_rep.setVisibility(0);
            var repr_info = {index: index_nm1, name: chainName, nucleic: nucleic_, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
            model_list_nm1[model_number].set(chainName, repr_info); //this causes the map entries to get overwritten
            index_nm1++; //increments anyways, since the heteroatoms get put into the real structure
            ballStick_list_nm1_index++;
            if (resProxy.isNucleic())
            {
                //console.log(chainName)
                var base = init_component.addRepresentation("base", {name: chainName+"_base", sele: chainName, color: "resname", cylinderOnly: 1});
               // console.log(chainName + " and " + range_)
                base.setVisibility(0);
                var base_info = {index: index_nm1, name:chainName+"_base", cartoon_index: index_nm1-1, cartoon_name: chainName, visibility: 0}// modified_colors: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
                var base_name = chainName + "_base"
                model_list_nm1[model_number].set(base_name, base_info);
                model_list_nm1[model_number].get(chainName).nucleic = 1;
                index_nm1++;
                ballStick_list_nm1_index++;
            }
          }*/
        }
      });

      var hetero = init_component.addRepresentation("ball+stick", {name: model_name + "_hetero", sele: "(hetero or ion or ligand) and (not nucleic)"});
      hetero.setVisibility(0);
      if (model_number == "0")
      {
        hetero.setVisibility(1);
      }
      var repr_info = {index: index_nm1, nucleic: 0, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}; 
      model_list_nm1[model_number].set(model_name + "_hetero", repr_info);
      index_nm1++;
      ballStick_list_nm1_index++; 
    })
    //console.log(deleteLater)
    deleteLater.forEach( function(item)
    {
      var end_1 = item.indexOf("_");
      if (end_1 == -1)
      {
        end_1 = item.length;
      }
      var model_number = Number(item.substring(item.indexOf("/")+1,end_1));
      
      //console.log(item)
      //console.log(model_number)
      model_list_nm1[model_number].delete(item);
      model_list_nm1[model_number].delete(item);
    });
    stage_nm1.mouseControls.remove("hoverPick"); //copied code from NGL gallery
    /* stage_nm1.signals.hovered.add(function (pickingProxy) 
    {    //copied and modified code from NGL gallery
      if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) 
      {
        var atom = pickingProxy.atom || pickingProxy.closestBondAtom
        var mp = pickingProxy.mouse.position
        var full_atom_name = atom.qualifiedName()
        var end_res_name = full_atom_name.indexOf(":")
        tooltip.innerText = full_atom_name.substring(0, end_res_name) //displays just residue name and number
        tooltip.style.bottom = window.innerHeight - mp.y + 3 + "px"
        tooltip.style.left = mp.x + 3 + "px"
        tooltip.style.display = "block"
      } 
      else 
      {
          tooltip.style.display = "none"
      }
    }); */
          stage_nm1.handleResize()
          init_component.autoView()
          var principleAxes = stage_nm1.getComponentsByName("my_structure").list[0].structure.getPrincipalAxes();
          stage_nm1.animationControls.rotate(principleAxes.getRotationQuaternion(), 0);
    
  }); 
  
};

function log() {
  console.log("stage");
  console.log(stage_nm1);
  console.log("models")
  console.log(model_list_nm1)
  console.log("multi map")
  console.log(multi_nm1)
}

function saveViewerAsImage() //returns a promise that resolves to an image blob
{
  return stage_nm1.makeImage({trim: false, scale: 2, antialias: true, transparent: true});
}

/*residue_specification must contain a chain_list array with color info.
var chains_list = [":A", ":B"];
var sstructs = new Map();
sstructs.set("166:A", "sheet")
sstructs.set("167:A", "sheet")
sstructs.set("167:A", "sheet")
sstructs.set("150:B", "helix")
var res_specification = {chain_list, sstructs};

has issues with changing the rendering, but the secondary structure does changes in the registry because the coloring changes
*/
function updateSecondaryStruc3D(residue_specification)
{ 
  stage_nm1.getComponentsByName("my_structure").list[0].structure.eachResidue(function (residue)
  {
    var full_res_name = residue.qualifiedName()
    var end_res_name = full_res_name.indexOf("/")
    var start_res_name = full_res_name.indexOf("]") + 1;
    var res_name = full_res_name.substring(start_res_name, end_res_name)
    if (residue_specification.sstructs.get(res_name) != undefined)
      {
        var sstruc_full = residue_specification.sstructs.get(res_name);
        /*if (sstruc_full == "DNA") 
        {
         residue.sstruc = ???;  
        } 
        else if (sstruc_full == "RNA") 
        {
         residue.sstruc = ???;  
        } */
        if (sstruc_full == "helix") 
        {
         residue.sstruc = "h";  
        } 
        else if (sstruc_full == "turn") 
        {
         residue.sstruc = "s";  
        } 
        else if (sstruc_full == "sheet") 
        {
         residue.sstruc = "e";  
        }
        else {}
      }

  })
  var model_num = 0;
  while (model_num < number_of_models_nm1)
  {
    var reprList_index = model_list_nm1[model_num].get("_layer_0_cartoon"+ "/"+model_num ).index; //update ss on layer 0
    stage_nm1.getComponentsByName("my_structure").list[0].rebuildRepresentations(stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index]); //may cause compatability issues with selectResidues3D() 
    residue_specification.chain_list.forEach(function(chain)
    {
      reprList_index = model_list_nm1[model_num].get(chain+"/"+model_num).index; //update ss on layer 1
      stage_nm1.getComponentsByName("my_structure").list[0].rebuildRepresentations(stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index]); //may cause compatability issues with selectResidues3D() 
    });
    model_num++;
  }
}

/*residue_specification must contain a chains array with color info. This will NOT make the chain visible or implement the changes.
Just updates the stored color scheme in model_list_nm1. Use selectResidues3D() afterwards to reflect changes or toggle visibility.

var A = {chain_name: ":A", DNA: 0x008000, RNA: 0x008000, helix: 0xB19CD9, turn: 0x008000, sheet: 0x000000};
var B = {chain_name: ":B", DNA: 0x00FFA0, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970};
var chains = [A, B];
var res_specification = {chains};
*/
function  changeColorScheme3D(residue_specification) 
{
  if (residue_specification.chains != undefined)
    residue_specification.chains.forEach(function(chain)
    {
      var chain_name = chain.chain_name+"/"+model_number_nm1;
      var range_ = ""
      if(!model_list_nm1[model_number_nm1].has(chain_name))
      {//console.log("multi")
        var repr_info = {index: 3, colorDummy: true, range: "(2147483645-2147483646)", nucleic: 0, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
        model_list_nm1[model_number_nm1].set(chain_name+"(2147483645-2147483646)",repr_info) //colorDummy
        if (!multi_nm1.has(chain_name))
        {
          multi_nm1.set(chain_name, [{start:  2147483645, end:  2147483646}])
        }
        else
        {
          multi_nm1.get(chain_name).push({start: 2147483645, end: 2147483646})
        }
        multi_nm1.get(chain_name).forEach( function(item) //will change color bank for all parts of the chain if it is broken
        {
          range_ = "("+item.start+"-"+item.end+")";
          if (chain.DNA != undefined)
            model_list_nm1[model_number_nm1].get(chain_name+range_).DNA = chain.DNA;
          if (chain.RNA != undefined)
            model_list_nm1[model_number_nm1].get(chain_name+range_).RNA = chain.RNA;
          if (chain.helix != undefined)
            model_list_nm1[model_number_nm1].get(chain_name+range_).helix = chain.helix;
          if (chain.sheet != undefined)
            model_list_nm1[model_number_nm1].get(chain_name+range_).sheet = chain.sheet;
          if (chain.turn != undefined)
            model_list_nm1[model_number_nm1].get(chain_name+range_).turn = chain.turn;
        });
      }
      else
      {//console.log("regular")
        if (chain.DNA != undefined)
          model_list_nm1[model_number_nm1].get(chain_name).DNA = chain.DNA;
        if (chain.RNA != undefined)
          model_list_nm1[model_number_nm1].get(chain_name).RNA = chain.RNA;
        if (chain.helix != undefined)
          model_list_nm1[model_number_nm1].get(chain_name).helix = chain.helix;
        if (chain.sheet != undefined)
          model_list_nm1[model_number_nm1].get(chain_name).sheet = chain.sheet;
        if (chain.turn != undefined)
          model_list_nm1[model_number_nm1].get(chain_name).turn = chain.turn;
      }
    });
      
}

/*residue_list should be of format["B.346.accessioncode",  "B.347.", "B.348."]
accession code optional (and get ignored) in residue_list array, but periods are required
residues in residue_list MUST be valid. Otherwise will create a ball+stick representation for entire structure

adds ball+stick model and colors the selected residues yellow in the cartoon representation. 
Passing an empty array clears the ball+stick represntation and unhiglights residues.
*/
function addBallStick(residue_list)
{
  var count = ballStick_list_nm1_index;
  //console.log(ballStick_list_nm1)
  
  for (var i = ballStick_list_nm1_index; i<ballStick_list_nm1.length + ballStick_list_nm1_index;) //iterate through list of prev selections, popping them from the list afterwards
  { 
    var prev_selection_index = ballStick_list_nm1.pop()
    //console.log(ballStick_list_nm1.length+" items after pop")
    //stage_nm1.getComponentsByName("my_structure").removeRepresentation(prev_selection)
    //console.log(prev_selection_index)
    if (ballStick_list_nm1 ==  undefined) {}
    else
    {
      stage_nm1.getComponentsByName("my_structure").list[0].reprList[prev_selection_index].disposeRepresentation();
    }
    count++;
  }
  ballStick_list_nm1_index = count;
  if (Array.isArray(residue_list)) //process arrays only
  { 
    //console.log("sending for processing")
    processed_residue_list = process_residue_list(residue_list);
  }
  else //don't process a (hopefully pre-processed) string
  { 
    processed_residue_list = " ".concat(residue_list)
    processed_residue_list = processed_residue_list.concat(" ")
    console.log("Potential error. String passed into selectResidues3D... causes issue with clearing previous selection")
  }
  var valid = false;
  if (processed_residue_list.length > 2) //2 spaces are concatenated already, prevents empty list from being used for selection (will make entire structure ball+stick)
  {
    //console.log("valid")
    valid = true;
  }

  //console.log(processed_residue_list)
  if (valid == true)
  {
    var ballstick_Rep = stage_nm1.getComponentsByName("my_structure").addRepresentation("ball+stick", {name: residue_list[0], sele: "("+processed_residue_list +") and /"+ model_number_nm1})
    ballStick_list_nm1.push(index_nm1);
    index_nm1++;
    //console.log(ballstick_Rep)
    //console.log(ballStick_list_nm1)
  }
  

  var chain_colors = NGL.ColormakerRegistry.addScheme(function (params) 
  {
    this.atomColor = function (atom) 
    {
      var full_atom_name = atom.qualifiedName()
      var start_res_name = full_atom_name.indexOf("]")
      var end_res_name = full_atom_name.indexOf(".")
      var res_name = full_atom_name.substring(start_res_name + 1, end_res_name)
      var spaced_res_name = (" ".concat(res_name)).concat(" ") //put spaces in front and behind, fixes bug where selecting 17:A would color 17:A and 7:A
      if (visible_residue_list_nm1.search(spaced_res_name) != -1) //currently visible
      {
        if(processed_residue_list.search(spaced_res_name) != -1) //highlighted
        {
          return 0xFCFF19; //yellow
        }
        else 
        {
          var chain_name = ":" + atom.chainname+"/"+model_number_nm1;
          var range_ = ""
          if(!model_list_nm1[model_number_nm1].has(chain_name))
          {
            var number = atom.resno;
            multi_nm1.get(chain_name).forEach( function(item)
            {
              if( (number >= item.start && number <= item.end) || (number <= item.start && number >= item.end) ) //some PDB files may cause start/end to be reversed
              {
                range_ = "("+item.start+"-"+item.end+")";
              }
            });
            chain_name = chain_name+range_;
            //console.log(chain_name+" "+ atom.resno)
          }
          if (atom.isNucleic()) 
          {
            return model_list_nm1[model_number_nm1].get(chain_name).DNA;  
          } 
          else if (atom.isHelix())
          {
            return model_list_nm1[model_number_nm1].get(chain_name).helix;
          }
          else if (atom.isTurn())
          {
            return model_list_nm1[model_number_nm1].get(chain_name).turn; 
          }
          else if (atom.isSheet())
          {
            return model_list_nm1[model_number_nm1].get(chain_name).sheet;  
          }
          else
          {
            return 0xFFFFFF; //white if error
          }
        }
      }
      else
      {
        return 0xF1F1F1;
      }
      
    };
  });
    
  
  for (let item of chain_set_nm1) //need to iterate through everything in chain_set (both old and new) to properly set colors
  {
    var reprList_index = model_list_nm1[model_number_nm1].get(item).index;
    stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index].setColor(chain_colors)
  }

  
} 

/*
residue_list MUST be of format["B.346.accessioncode",  "B.347.", "B.348."]
Accession code optional (and get ignored) in residue_list array, but periods are required
residues in residue_list MUST be valid.

Makes layer 1 chain containing selected residues visible. Selected residues are colored according color scheme in model_list_nm1
All other residues on that chain are gray, other layer_1 chains become/stay invisible. Use changeColorScheme to change colors.
*/
function selectResidues3D(residue_list) 
{
  
  while (visibility_list_nm1.length > 0)
  {
    visibility_list_nm1.pop();
  }
  var temp_chain_set_nm1 = new Set();
  
  var empty_list = [];
  addBallStick(empty_list);
  if (Array.isArray(residue_list)) //process arrays only
  {
    processed_residue_list = process_residue_list(residue_list, temp_chain_set_nm1, chain_set_nm1)
    visible_residue_list_nm1 = processed_residue_list;
  }
  else //don't process a (hopefully pre-processed) string
  { 
    processed_residue_list = " ".concat(residue_list)
    processed_residue_list = processed_residue_list.concat(" ")
    console.log("Potential error. String passed into selectResidues3D... causes issue with clearing previous selection")
  }
  var valid = false;
  if (processed_residue_list.length > 2) //2 spaces are concatenated already, prevents empty list from being used for selection (will make entire structure ball+stick)
  {
    valid = true;
  }

  //console.log(processed_residue_list)
  
  var chain_colors = NGL.ColormakerRegistry.addScheme(function (params) 
  {
    this.atomColor = function (atom) 
    {
      var full_atom_name = atom.qualifiedName()
      var start_res_name = full_atom_name.indexOf("]")
      var end_res_name = full_atom_name.indexOf(".")
      var res_name = full_atom_name.substring(start_res_name + 1, end_res_name)
      var spaced_res_name = (" ".concat(res_name)).concat(" ") //put spaces in front and behind, fixes bug where selecting 17:A would color 17:A and 7:A
      if (processed_residue_list.search(spaced_res_name) != -1)
      {
        var chain_name = ":" + atom.chainname+"/"+model_number_nm1;
        var range_ = ""
        if(!model_list_nm1[model_number_nm1].has(chain_name))
        {
          var number = atom.resno;
          multi_nm1.get(chain_name).forEach( function(item)
          {
            if( (number >= item.start && number <= item.end) || (number <= item.start && number >= item.end) ) //some PDB files may cause start/end to be reversed
            {
              range_ = "("+item.start+"-"+item.end+")";
            }
          });
          chain_name = chain_name+range_;
        }
        if (atom.isNucleic()) 
        {
          return model_list_nm1[model_number_nm1].get(chain_name).DNA;  
        } 
        else if (atom.isHelix())
        {
          return model_list_nm1[model_number_nm1].get(chain_name).helix;
        }
        else if (atom.isTurn())
        {
          return model_list_nm1[model_number_nm1].get(chain_name).turn; 
        }
        else if (atom.isSheet())
        {
          return model_list_nm1[model_number_nm1].get(chain_name).sheet;  
        }
        else
        {
          return 0xFFFFFF; //white if error
        }
      }
      else
      {
        return 0xF1F1F1;
      } 
    };
  });
    
    //console.log(chain_set_nm1)
    for (let item of chain_set_nm1) //need to iterate through everything in chain_set_nm1 (both old and new) to properly set colors
    {
      //console.log(item)
      var reprList_index = model_list_nm1[model_number_nm1].get(item).index;
      stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index].setColor(chain_colors)
      
    }
    //console.log(chain_set_nm1)
    for (let item of chain_set_nm1) //need the chain set to store which chains have selection-modified colors
    {
      if (!temp_chain_set_nm1.has(item))
      {
        chain_set_nm1.delete(item); //no need to store the chains that were previously modified but got reset to default color scheme
        var reprList_index = model_list_nm1[model_number_nm1].get(item).index;
        model_list_nm1[model_number_nm1].get(item).visibility = 0;
        stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index].setVisibility(0)
        if (model_list_nm1[model_number_nm1].get(item).nucleic)
        {
          var base_index = model_list_nm1[model_number_nm1].get(item+ "_base").index;
          stage_nm1.getComponentsByName("my_structure").list[0].reprList[base_index].setVisibility(0) 
          model_list_nm1[model_number_nm1].get(item+ "_base").visibility = 0;
        }
        
      }
      else
      {
        var reprList_index = model_list_nm1[model_number_nm1].get(item).index;
        stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index].setVisibility(1);
        model_list_nm1[model_number_nm1].get(item).visibility = 1;
        visibility_list_nm1.push(item);
        if (model_list_nm1[model_number_nm1].get(item).nucleic)
        {
          var base_index = model_list_nm1[model_number_nm1].get(item+ "_base").index;
          stage_nm1.getComponentsByName("my_structure").list[0].reprList[base_index].setVisibility(1);
          //console.log(base_index);
          model_list_nm1[model_number_nm1].get(item+ "_base").visibility = 1;
          visibility_list_nm1.push(item+ "_base");
        }
      }
    }

    //console.log(visibility_list_nm1)
    //NGL.ColormakerRegistry.removeScheme(chain_colors)
 
  
        
}
function cartoonInvisible()
{
  //console.log(visibility_list_nm1)
  visibility_list_nm1.forEach(function (item)
  {
    var reprList_index = model_list_nm1[model_number_nm1].get(item).index;
    stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index].setVisibility(0)
    if (model_list_nm1[model_number_nm1].get(item).nucleic)
        {
          var base_index = model_list_nm1[model_number_nm1].get(item+"_base").index;
          stage_nm1.getComponentsByName("my_structure").list[0].reprList[base_index].setVisibility(0)
        }
  })
}
function cartoonVisible()
{
  visibility_list_nm1.forEach(function (item)
  {
    var reprList_index = model_list_nm1[model_number_nm1].get(item).index;
    stage_nm1.getComponentsByName("my_structure").list[0].reprList[reprList_index].setVisibility(1)
    if (model_list_nm1[model_number_nm1].get(item).nucleic)
        {
          var base_index = model_list_nm1[model_number_nm1].get(item+ "_base").index;
          stage_nm1.getComponentsByName("my_structure").list[0].reprList[base_index].setVisibility(1)
        }
  })
}
// converts format from ["B.346.accessioncode",  "B.347.", "B.348."] to "150:A or 151:A or 152:A or 153:A"
// accession code optional in residue_list array, but periods are required
// residues in residue_list MUST be valid. Otherwise will create a ball+stick representation for entire structure
//"(150-153) and :A" is also ok to use directly for selections, but do not pass that into process_residue_list
function process_residue_list(residue_list, temp_chain_set_nm1, chain_set_nm1) 
{ 
  var deleteLater = new Set();
  var processed_list = " "
  for (var i = 0; i < residue_list.length; i++)
  {
    var start_res_number = residue_list[i].indexOf(".");
    var end_res_number = residue_list[i].lastIndexOf(".");
    var res_number = residue_list[i].substring(start_res_number+1, end_res_number);
    processed_list = processed_list.concat(res_number)

    //concatenate chain name
    processed_list = processed_list.concat(":")
    processed_list = processed_list.concat(residue_list[i].substring(0, start_res_number))
    var range_ = "";
    var chainName = ":" + residue_list[i].substring(0, start_res_number)+"/"+model_number_nm1;   // ex. :A/0
    //check to see if there are multiple polymers (normal) or representation is missing (bc highly broken up chains mess up the NGL iterators)
    if (!model_list_nm1[model_number_nm1].has(chainName))
    { 
      var multi = multi_nm1.get(chainName)
      if (multi == undefined) //not normal... iterators messed up, need to add a representation for the residue
      {
        var new_rep_name = residue_list[i].substring(start_res_number+1, end_res_number) + chainName;
        var temp_range = "("+res_number+"-"+res_number+")";
        //console.log("multi undefined for: " + temp_range)
        addMissingRepresentation(temp_range, res_number, chainName, deleteLater);
        range_ = temp_range;
        /*console.log(new_rep_name)
        var new_rep = stage_nm1.getComponentsByName("my_structure").list[0].addRepresentation("base", {name: chainName, sele: chainName + " and " + res_number, color: "red"});

        var repr_info = {index: index_nm1, name: chainName, range: range_, nucleic: nucleic_, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
          
        model_list_nm1[model_number].set(chainName_withRange, repr_info); //this causes the map entries to get overwritten
        index_nm1++;
        ballStick_list_nm1_index++;*/

      }
      else
      {
        multi.forEach( function(item) //chain segmented into polymers, need to use multi_nm1 to map residue to polymer
        {
          var number = Number(residue_list[i].substring(start_res_number+1, end_res_number));
          if( (number >= item.start && number <= item.end) || (number <= item.start && number >= item.end) ) //some PDB files may cause start/end to be reversed
          {
            range_ = "("+item.start+"-"+item.end+")";
          }
        });
        if (range_ == "") //not normal, chain was highly broken up, iterators messed up. need to add representation and a new entry for multi_nm1
        {
          var temp_range = "("+res_number+"-"+res_number+")";
          //console.log("multi defined, no range found for: " + temp_range)
          var chainName_withRange = chainName + temp_range;
          var new_rep_name = residue_list[i].substring(start_res_number+1, end_res_number) + chainName;
          addMissingRepresentation(temp_range, res_number, chainName, deleteLater);  
          range_ = temp_range;     
        }
      }
    }
    if (temp_chain_set_nm1 != undefined)
    {
      temp_chain_set_nm1.add(chainName+range_)
    }
    if (chain_set_nm1 != undefined)
    {
      chain_set_nm1.add(chainName+range_)
    }
    
    if (i < residue_list.length - 1) 
    {
      processed_list = processed_list.concat(" or ")
    }
    else
    {
      processed_list = processed_list.concat(" ")
    }
  }
 /*console.log("chain set")
  console.log(chain_set_nm1)
  console.log("temp chain set")
  console.log(temp_chain_set_nm1)*/
  //console.log(processed_list)
  return processed_list;


}

function addMissingRepresentation(range_, res_number, chainName, deleteLater)
{
  console.log("making new representation for: " + range_ +"" +chainName)
  nucleic_ = true; //not always the case, but it shoudnt cause problems besides wasted memory
  if (model_list_nm1[model_number_nm1].has(chainName))
  {
    var temp = model_list_nm1[model_number_nm1].get(chainName);
    var temp_name = chainName;
    model_list_nm1[model_number_nm1].set(temp_name+temp.range, temp);
    if (multi_nm1.has(chainName))
    {
      //console.log("multi has it, pushing "+ chainName+ " range: "+ res_number)
      //{start,end} pair to indicate range
      multi_nm1.get(chainName).push({start: Number(res_number), end: Number(res_number)})
    }
    else
    {
      //console.log("multi missing it, pushing "+ chainName+ " range: "+ res_number)
      //insert array with {start, end} pair
      multi_nm1.set(chainName, [{start: Number(res_number), end: Number(res_number)}]);
      //add old one
      var prev_dash = temp.range.indexOf("-");
      var prev_start = Number(temp.range.substring(1,prev_dash));
      var prev_end = Number(temp.range.substring(prev_dash+1, temp.range.length -1))
      multi_nm1.get(chainName).push({start: prev_start, end: prev_end})
    }
    deleteLater.add(temp_name);
    

    if (temp.nucleic)
    {
      var temp_base_name = temp_name+"_base";
      temp = model_list_nm1[model_number_nm1].get(temp_base_name);
      model_list_nm1[model_number_nm1].set(temp_name+temp.range+"_base", temp);
      deleteLater.add(temp_base_name);
    }
  }
  else
  {
    //console.log(chainName+ " range: "+ res_number)
    if (multi_nm1.has(chainName))
    {
      //console.log("multi has it, pushing "+ chainName+ " range: "+ res_number)
      multi_nm1.get(chainName).push({start: Number(res_number), end: Number(res_number)})
    }
    else
    {
      //console.log("multi missing it, pushing "+ chainName+ " range: "+ res_number)
      //insert array with {start, end} pair
      multi_nm1.set(chainName, [{start: Number(res_number), end: Number(res_number)}]);
      //add old one
      //possible spot for an error
    }
  }
  //chainName+"(2147483645-2147483646)"
  var mySstrucColors = NGL.ColormakerRegistry.addScheme(function (params) 
  {
    this.atomColor = function (atom) {
      if (atom.isNucleic()) {
        return 0xFFA500;  // orange
      } 
      else if (atom.isHelix()){
        return 0xFF0000;  // red
      }
      else if (atom.isTurn()){
        return 0x437FF9;  // blue
      }
      else if (atom.isSheet()){
        return 0x43F970;  // green
      }
      else{
        return 0xFFFFFF; //white
      }
    };
  });
  if (model_list_nm1[model_number_nm1].has(chainName+"(2147483645-2147483646)"))
  {
    mySstrucColors = NGL.ColormakerRegistry.addScheme(function (params) 
    {
      this.atomColor = function (atom) {
        if (atom.isNucleic()) 
        {
          return model_list_nm1[model_number_nm1].get(chainName+"(2147483645-2147483646)").DNA;  
        } 
        else if (atom.isHelix())
        {
          return model_list_nm1[model_number_nm1].get(chainName+"(2147483645-2147483646)").helix;
        }
        else if (atom.isTurn())
        {
          return model_list_nm1[model_number_nm1].get(chainName+"(2147483645-2147483646)").turn; 
        }
        else if (atom.isSheet())
        {
          return model_list_nm1[model_number_nm1].get(chainName+"(2147483645-2147483646)").sheet;  
        }
        else
        {
          return 0xFFFFFF; //white if error
        }
      };
    });
  }
  var new_rep = stage_nm1.getComponentsByName("my_structure").list[0].addRepresentation("cartoon", {name: chainName+range_, sele: chainName+ " and "+ range_, color: mySstrucColors});
  new_rep.setVisibility(0); //sets the colored chains as invisible
  
  var repr_info = {index: index_nm1, name: chainName+range_, range: range_, nucleic: nucleic_, visibility: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
  
  model_list_nm1[model_number_nm1].set(chainName+range_, repr_info); //this causes the map entries to get overwritten
  index_nm1++; //increments anyways, since the heteroatoms get put into the real structure
  ballStick_list_nm1_index++;

  if (nucleic_)
  {
    var base = stage_nm1.getComponentsByName("my_structure").list[0].addRepresentation("base", {name: chainName+range_+"_base", sele: chainName+ " and "+ range_, color: "resname", cylinderOnly: 1});
    base.setVisibility(0);
    var base_info = {index: index_nm1, name:chainName+range_+"_base", range: range_, cartoon_index: index_nm1-1, cartoon_name: chainName, visibility: 0}// modified_colors: 0, DNA: 0xFFA500, RNA: 0xFFA500, helix: 0xFF0000, turn: 0x437FF9, sheet: 0x43F970}
    var base_name = chainName +range_+ "_base"
    model_list_nm1[model_number_nm1].set(base_name, base_info);
    model_list_nm1[model_number_nm1].get(chainName +range_).nucleic = 1;
    index_nm1++;
    ballStick_list_nm1_index++;
  } 
}



