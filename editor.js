const defaultToolbox = [
    // simcir
    {type: "In"},
    {type: "Out"},
    {type: "Joint"},

    // simcir-basicset
    {type: "DC"},
    {type: "LED"},
    {type: "PushOff"},
    {type: "PushOn"},
    {type: "Toggle"},
    {type: "BUF"},
    {type: "NOT"},
    {type: "AND"},
    {type: "NAND"},
    {type: "OR"},
    {type: "NOR"},
    {type: "XOR"},
    {type: "XNOR"},
    {type: "OSC"},
    //{type: "7seg"},
    //{type: "16seg"},
    {type: "4bit7seg"},
    //{type: "RotaryEncoder"},
    //{type: "BusIn"},
    //{type: "BusOut"},

    // simcir-extras
    {type: "Rotary Encoder"},
    //{type: "Memory 16-bit"},
    //{type: "Serial Interface"},
];

const dropdown = (function(){
    window.addEventListener("click", (event)=>{
        var dpd = document.querySelector(".dropdown.active");
        if(dpd == null){ return; }

        if(event.clientX < dpd.clientLeft ||
        event.clientX > dpd.clientLeft+dpd.clientWidth ||
        event.clientY < dpd.clientTop ||
        event.clientY > dpd.clientTop+dpd.clientHeight
        ){
            dpd.classList.remove("active");
        }
    });

    function adddropdownevents(element){
        element.querySelector("button:not(.dropdown-content>button)").addEventListener("click", (event)=>{
            event.stopPropagation();

            var wason = event.currentTarget.parentElement.classList.contains("active");

            document.querySelectorAll(".dropdown").forEach((dpd)=>{
                dpd.classList.remove("active");
            });

            if(wason){
                event.currentTarget.parentElement.classList.remove("active");
            }else{
                event.currentTarget.parentElement.classList.add("active");
            }
        });

        element.querySelectorAll(".dropdown-content button").forEach((btn)=>{
            btn.addEventListener("mouseup", ()=>{
                element.classList.remove("active");
            })
        });
    }

    document.querySelectorAll(".dropdown").forEach((el)=>{
        adddropdownevents(el);
    });

    return {
        addEvents: adddropdownevents,
    };
})();

const editor = (function(){
    const editbox = (function(selector){
        const element = document.querySelector(selector);
        var placeholder = simcir.$(element);

        function refresh(){
            var tmp = data();
            open({});
            var toolbox = data().toolbox;

            for(var a of toolbox){
                var has = false;

                for(var b of tmp.toolbox){
                    if(a.type == b.type){
                        has = true;
                    }
                }

                if(!has){
                    tmp.toolbox.push(a);
                }
            }

            open(tmp);
        }

        function open(data){
            if(data == null){
                data = {};
            }
            
            data.width = element.clientWidth;
            data.height = element.clientHeight;

            if(element.childNodes.length != 0){
                simcir.clearSimcir(placeholder);
                placeholder = simcir.$(element);
            }

            simcir.setupSimcir(placeholder, data);
        }

        function close(){
            simcir.clearSimcir(placeholder);
        }

        function data(){
            try{
                var ws = simcir.$(element.querySelector(".simcir-workspace"));

                return simcir.controller(ws).data();
            }catch(err){
                return {};
            }
        }

        function register(name, data){
            simcir.registerDevice(name, data);
        }

        return {
            open,
            close,
            data,
            register,
            refresh,
        };
    })("#editor");

    const project = (function(){
        const defaultProject = {
            name: "new 1",
            engine: {
                library: "simcir",
                version: null,
            },
            devices: [],
            circuit: {
                layout: null,
                devices: [],
                connectors: [],
            },
        };
        var project = JSON.parse(JSON.stringify(defaultProject));

        function flush(){
            project = JSON.parse(JSON.stringify(defaultProject));
        }

        function getRenderData(name){
            var circuit = {
                toolbox: JSON.parse(JSON.stringify(defaultToolbox)),
                extra: [],
                devices: [],
                connectors: [],
            };
            
            // Get Circuit Data
            if(project.name == name){
                if(project.circuit.layout != null){
                    circuit.layout = JSON.parse(JSON.stringify(project.circuit.layout));
                }
                circuit.devices = JSON.parse(JSON.stringify(project.circuit.devices));
                circuit.connectors = JSON.parse(JSON.stringify(project.circuit.connectors));
            }else{
                for(var device of project.devices){
                    if(device.name == name){
                        if(device.circuit.layout != null){
                            circuit.layout = JSON.parse(JSON.stringify(device.circuit.layout));
                        }
                        circuit.devices = JSON.parse(JSON.stringify(device.circuit.devices));
                        circuit.connectors = JSON.parse(JSON.stringify(device.circuit.connectors));
                        break;
                    }
                }
            }

            // Fill the Extras
            function containsDependency(device, name){
                for(var cdev of device.circuit.devices){
                    if(cdev.type == name){
                        return true;
                    }else{
                        for(var pdev of project.devices){
                            if(pdev.name == cdev.type){
                                if(containsDependency(pdev, name)){
                                    return true;
                                }
                            }
                        }
                    }
                }
            }

            for(var device of project.devices){
                if(!containsDependency(device, name) && device.name != name){
                    var tmp = JSON.parse(JSON.stringify(device));
                    var tmp_circuit = {};
    
                    if(tmp.circuit.layout != null){
                        tmp_circuit.layout = tmp.circuit.layout;
                    }
                    tmp_circuit.devices = tmp.circuit.devices;
                    tmp_circuit.connectors = tmp.circuit.connectors;

                    circuit.extra.push({
                        name: tmp.name,
                        circuit: tmp_circuit,
                    });

                    circuit.toolbox.push({type: device.name});
                }
            }

            return circuit;
        }

        function importProject(data){
            for(var device of data.devices){
                if(!hasDevice(device.name)){
                    project.devices.push(device);
                }else{
                    for(var i=0; i<project.devices.length; i++){
                        if(project.devices[i].name == device.name){
                            project.devices[i].circuit = device.circuit;
                        }
                    }
                }
            }

            if(!hasDevice(data.name)){
                project.devices.push({
                    name: data.name,
                    circuit: data.circuit,
                });
            }else{
                for(var i=0; i<project.devices.length; i++){
                    if(project.devices[i].name == data.name){
                        project.devices[i].circuit = data.circuit;
                    }
                }
            }
        }

        function data(value){
            if(value != null){
                project = JSON.parse(JSON.stringify(value));
            }
            return JSON.parse(JSON.stringify(project));
        }

        function saveCircuit(name, data){
            if(project.name == name){
                project.circuit.devices = data.devices;
                project.circuit.connectors = data.connectors;
            }else{
                for(var i=0; i<project.devices.length; i++){
                    if(project.devices[i].name == name){
                        project.devices[i].circuit.devices = data.devices;
                        project.devices[i].circuit.connectors = data.connectors;
                        break;
                    }
                }
            }
        }

        function saveLayout(name, layout){
            if(project.name == name){
                project.circuit.layout = layout;
            }else{
                for(var i=0; i<project.devices.length; i++){
                    if(project.devices[i].name == name){
                        project.devices[i].circuit.layout = layout;
                        break;
                    }
                }
            }
        }

        function rename(old_name, new_name){
            for(var device of defaultToolbox){
                if(device.type == old_name){
                    return false;
                }
            }

            if(project.name == old_name){
                project.name = new_name;
            }else{
                for(var i=0; i<project.devices.length; i++){
                    if(project.devices[i].name == old_name){
                        project.devices[i].name = new_name;
                        break;
                    }else{
                        for(var j=0; j<project.devices[i].circuit.devices.length; j++){
                            if(project.devices[i].circuit.devices[j].type == old_name){
                                project.devices[i].circuit.devices[j].type = new_name;
                            }

                            if(project.devices[i].circuit.devices[j].label == old_name){
                                project.devices[i].circuit.devices[j].label = new_name;
                            }
                        }
                    }
                }

                for(var i=0; i<project.circuit.devices.length; i++){
                    if(project.circuit.devices[i].type == old_name){
                        project.circuit.devices[i].type = new_name;
                    }

                    if(project.circuit.devices[i].label == old_name){
                        project.circuit.devices[i].label = new_name;
                    }
                }
            }

            return true;
        }

        function createDevice(name){
            project.devices.push({
                name: name,
                circuit: {
                    layout: null,
                    devices: [],
                    connectors: [],
                }
            });
        }

        function hasDevice(name){
            if(project.name == name){
                return true;
            }else{
                for(var device of defaultToolbox){
                    if(device.type == name){
                        return true;
                    }
                }

                for(var device of project.devices){
                    if(device.name == name){
                        return true;
                    }
                }
            }

            return false;
        }

        return {
            flush,
            getRenderData,
            importProject,
            data,
            saveCircuit,
            saveLayout,
            rename,
            hasDevice,
            createDevice,
        }
    })();

    var observer = new MutationObserver((mutations)=>{
        for(var mutation of mutations){
            for(var node of mutation.addedNodes){
                try{
                    if(node.classList.contains("simcir-dialog")){
                        if(node.querySelector("input.simcir-label-editor") != null){ return; }

                        var name = node.querySelector(".simcir-dialog-title").innerText;
                        
                        node.querySelector(".simcir-dialog-close-button").dispatchEvent(new Event('mousedown'));

                        openTab(name);
                    }
                }catch(err){}
            }
        }
    });
    observer.observe(document.body, {childList: true});

    async function ask4file(){
        return new Promise((resolve)=>{
            var input = document.createElement("input");
            input.type = "file";
            input.multiple = false;
            input.accept = "application/json";

            input.addEventListener("change", async (event)=>{
                resolve(input.files[0]);
            });

            input.click();
            input.remove();
        });
    }
    
    async function ask4files(){
        return new Promise((resolve)=>{
            var input = document.createElement("input");
            input.type = "file";
            input.multiple = true;
            input.accept = "application/json";

            input.addEventListener("change", async (event)=>{
                resolve(input.files);
            });

            input.click();
            input.remove();
        });
    }

    async function ask2save(sugestedName, data){
        var blob = new Blob([data], {
            type: "application/json",
        });

        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = sugestedName;
        a.click();
        a.remove();
    }

    function createCloseButton(){
        var div = document.createElement('div');
        div.innerHTML = '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="btn-close simcir-dialog-close-button" style="float: right;"><rect x="0" y="0" width="16" height="16"></rect><path d=" M 4 4 L 12 12" class="simcir-dialog-close-button-symbol"></path><path d=" M 12 4 L 4 12" class="simcir-dialog-close-button-symbol"></path></svg>';
        return div.firstChild;
    }

    function openTab(name){
        function handleClose(event){
            event.stopPropagation();

            if(event.currentTarget.parentElement.classList.contains("active")){
                sync();
            }

            openTab(event.currentTarget.parentElement.previousSibling.querySelector("span").innerText);

            event.currentTarget.parentElement.remove();
        }
        function handleRename(event){
            sync();
            
            var old_name = event.currentTarget.innerText;
            var new_name = prompt("Rename", old_name);

            // Check for colisions
            if(
                new_name == null ||
                new_name == "" ||
                new_name == old_name ||
                project.hasDevice(new_name)
            ){ return; }

            project.rename(old_name, new_name);

            event.currentTarget.innerText = new_name;

            render();
        }
        function handleOpen(event){
            openTab(event.currentTarget.querySelector("span").innerText);
        }

        function createTab(name){
            var tab = document.createElement("button");
            tab.addEventListener("click", handleOpen);
            
            var label = document.createElement("span");
            label.innerText = name;
            label.addEventListener("dblclick", handleRename);
            tab.append(label);

            if(name != project.data().name){
                var btn_close = createCloseButton();
                btn_close.addEventListener("click", handleClose);
                tab.appendChild(btn_close);
            }

            document.getElementById("tabs").append(tab);
            return tab;
        }

        function getTabByName(name){
            var tab = null;
            document.querySelectorAll("#tabs>button").forEach((el)=>{
                if(el.querySelector("span").innerText == name){
                    tab = el;
                }
            });

            return tab;
        }

        (function(){
            // Close Layout Panel if open
            layouteditor?.close();

            // Save
            sync();

            // Find or Create Tab
            var tab = getTabByName(name);
            if(tab == null){
                tab = createTab(name);
            }

            // Make Tab the Active one
            document.querySelectorAll("#tabs>button").forEach((el)=>{
                el.classList.remove("active");
            });
            tab.classList.add("active");

            // Draw
            render();
        })();
    }
    function closeAllTabs(){
        document.querySelectorAll("#tabs>button").forEach((el)=>{
            el.remove();
        });
    }
    function getOpenTabName(){
        var tab = document.querySelector("#tabs>.active>span");

        if(tab == null){ return null; }
        return tab.innerText;
    }
    
    function sync(){
        var name = getOpenTabName();
        if(name == null){ return; }

        project.saveCircuit(name, editbox.data());

        window.localStorage.setItem("project", JSON.stringify(project.data(), null, 4));
    }
    function render(){
        var name = getOpenTabName();
        if(name == null){ return; }

        var data = project.getRenderData(name);

        for(var device of data.extra){
            editbox.register(device.name, device.circuit);
        }

        editbox.open({
            toolbox: data.toolbox,
            devices: data.devices,
            connectors: data.connectors,
        });
    }

    function restore(){
        try{
            var data = JSON.parse(window.localStorage.getItem("project"));
            if(data == null){throw "no Data"}
            
            closeAllTabs();
            project.data(data);
            openTab(project.data().name);
        }catch(err){
            newProject();
        }
    }

    window.addEventListener("beforeunload", sync);
    window.addEventListener("resize", render);


    // Project
    function newProject(){
        closeAllTabs();
        project.flush();
        openTab(project.data().name);
        sync();
    }
    async function save(){
        sync();
        ask2save(`${project.data().name}.json`, JSON.stringify(project.data(), null, 4));
    }
    async function open(){
        try{
            var file = await ask4file();
            var tmp = JSON.parse(await file.text());

            if(tmp.engine.library != "simcir"){
                throw "Invalid Engine";
            }

            closeAllTabs();
            project.data(tmp);
            openTab(project.data().name);
            sync();
        }catch(err){}
    }
    
    // Device
    function newDevice(){
        var cnt = 0;
        var tmp_name = "new 1";

        while(project.hasDevice(tmp_name)){
            tmp_name = `new ${++cnt}`;
        }

        project.createDevice(tmp_name);
        openTab(tmp_name);
    }
    async function importDevices(){
        var tmp_import = [];

        try{
            var files = await ask4files();
            for(var file of files){
                var tmp = JSON.parse(await file.text());

                if(tmp.engine.library != "simcir"){
                    throw "Invalid Engine";
                }

                tmp_import.push(tmp);
            }
        }catch(err){
            tmp_import = [];
        }

        for(var tmp of tmp_import){
            project.importProject(tmp);
        }

        render();
    }

    var layouteditor = null;
    function editLayout(){
        var enabled = false;
        var layout = project.getRenderData(getOpenTabName())?.layout;
        var interval = null;
        var layoutbox = null;
        var updating = false;

        if(layout == null){
            enabled = false;
            layout = {
                rows: 5,
                cols: 7,
                hideLabelOnWorkspace: false,
                nodes: {},
            };
        }else{
            enabled = true;
        }

        function apply(){
            var name = getOpenTabName();

            if(enabled){
                project.saveLayout(name, layout);
            }else{
                project.saveLayout(name, null);
            }

            sync();
        }

        function handleEditingStart(event){
            updating = true;
        }
        function handleToggleChange(event){
            enabled = event.currentTarget.checked;
            apply();
            if(enabled){
                layoutbox.classList.remove("disabled");
            }else{
                layoutbox.classList.add("disabled");
            }

            updating = false;
        }
        function handleRowsChange(event){
            layout.rows = event.currentTarget.value;
            apply();
            
            updating = false;
        }
        function handleColsChange(event){
            layout.cols = event.currentTarget.value;
            apply();
            
            updating = false;
        }

        function handlePinSideChange(event){
            var pin_name = event.currentTarget.parentElement.getAttribute("name");

            layout.nodes[pin_name] = `${event.currentTarget.value}0`;
            
            updating = false;
        }
        function handlePinPositionChange(event){
            var pin_name = event.currentTarget.parentElement.getAttribute("name");

            layout.nodes[pin_name] = `${layout.nodes[pin_name].charAt(0)}${event.currentTarget.value}`;
            
            updating = false;
        }

        function createPinElement(data){
            var pin_box = document.createElement("div");
            pin_box.classList.add("layout-pin");
            pin_box.setAttribute("name", data.name);

            var pin_label = document.createElement("label");
            pin_label.innerText = data.name;
            pin_box.append(pin_label);

            var pin_side = document.createElement("select");
            pin_side.innerHTML = `<option value="T">Top</option><option value="R">Right</option><option value="L">Left</option><option value="B">Bottom</option>`;
            pin_side.addEventListener("focus", handleEditingStart);
            pin_side.addEventListener("mousedown", handleEditingStart);
            pin_side.addEventListener("keydown", handleEditingStart);
            pin_side.addEventListener("change", handlePinSideChange);
            pin_box.append(pin_side);

            var pin_position = document.createElement("input");
            pin_position.type = "number";
            pin_position.min = 1;
            pin_position.value = 0;
            pin_position.addEventListener("focus", handleEditingStart);
            pin_position.addEventListener("mousedown", handleEditingStart);
            pin_position.addEventListener("keydown", handleEditingStart);
            pin_position.addEventListener("change", handlePinPositionChange);
            pin_box.append(pin_position);

            var box = null;
            if(data.type == "in"){
                pin_side.value = "L";
                box = layoutbox.querySelector(".layout-inputs");
            }else{
                pin_side.value = "R";
                box = layoutbox.querySelector(".layout-outputs");
            }
            box.append(pin_box);
        }

        function recalculateNodes(){
            const PADDING = 1;

            const POSITIONS = {
                T: "top",
                L: "left",
                R: "right",
                B: "bottom",
            };

            var data = {
                rows: 5,
                cols: 7,
                pins: {
                    top: {},
                    left: {},
                    right: {},
                    bottom: {},
                },
            };

            // Parse Nodes to Data
            data.rows = layout.rows ?? 5;
            data.cols = layout.cols ?? 7;

            for(var [name, position] of Object.entries(layout.nodes)){
                var p = position.charAt(0);

                data.pins[POSITIONS[p]][name] = parseInt(position.substring(1));
            }

            // Fix Colisions
            function fixcolisions(pins){
                var tmp_in = Object.entries(pins)
                    .sort(([,a],[,b]) => a-b)
                    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});
                
                var tmp_out = {};
                var unassigned = [];

                // capture unassigned
                for(var pin of Object.keys(tmp_in)){
                    if(pins[pin] == 0){
                        unassigned.push(pin);
                        delete tmp_in[pin];
                    }
                }

                // Skew forward
                var keys = Object.keys(tmp_in);
                for(var i=0; i<keys.length; i++){
                    tmp_out[keys[i]] = tmp_in[keys[i]];

                    if(
                        i+1<keys.length &&
                        tmp_in[keys[i]]+PADDING == tmp_in[keys[i+1]]
                    ){
                        for(var j=i+1; j<keys.length; j++){
                            tmp_in[keys[j]]+=1;
                        }
                    }
                }

                // add unassigned
                var start = (tmp_out[keys[keys.length-1]] ?? 0)+PADDING;
                for(var pin of unassigned){
                    tmp_out[pin] = start;
                    start += PADDING+1;
                }

                return tmp_out;
            }

            data.pins.top = fixcolisions(data.pins.top);
            data.pins.left = fixcolisions(data.pins.left);
            data.pins.right = fixcolisions(data.pins.right);
            data.pins.bottom = fixcolisions(data.pins.bottom);

            function getLast(obj){
                var keys = Object.keys(obj);

                return obj[keys[keys.length-1]];
            }

            data.rows = Math.max(getLast(data.pins.left) ?? 0, getLast(data.pins.right) ?? 0, data.rows);
            data.cols = Math.max(getLast(data.pins.top) ?? 0, getLast(data.pins.bottom) ?? 0, data.cols);

            // Store Data
            layout.rows = data.rows;
            layout.cols = data.cols;

            for(var key of Object.keys(layout.nodes)){
                var value = "";

                if(Object.keys(data.pins.top).includes(key)){
                    value = `T${data.pins.top[key]}`;
                }
                if(Object.keys(data.pins.left).includes(key)){
                    value = `L${data.pins.left[key]}`;
                }
                if(Object.keys(data.pins.right).includes(key)){
                    value = `R${data.pins.right[key]}`;
                }
                if(Object.keys(data.pins.bottom).includes(key)){
                    value = `B${data.pins.bottom[key]}`;
                }

                layout.nodes[key] = value;
            }

            // Update Elements
            for(var pin_box of layoutbox.querySelectorAll(".layout-pin[name]")){
                var name = pin_box.getAttribute("name");

                var position = layout.nodes[name];

                pin_box.querySelector("select").value = position.charAt(0);
                pin_box.querySelector("input").value = parseInt(position.substring(1));
            }

            layoutbox.querySelector(".layout-rows").value = layout.rows;
            layoutbox.querySelector(".layout-cols").value = layout.cols;
        }

        function update(){
            if(updating){ return; }
            updating = true;

            sync();

            var data = project.getRenderData(getOpenTabName());

            // Get In Editor Device Pins
            var pins = [];
            for(var device of data.devices){
                if(device.type == "In"){
                    pins.push({name: device.label, type: "in"});
                }else if(device.type == "Out"){
                    pins.push({name: device.label, type: "out"});
                }
            }
            pins.sort((a, b)=>{
                return (a.name == b.name)? 0 : ((a.name > b.name)? 1: -1); 
            });

            // Delete Nodes
            for(var key of Object.keys(layout.nodes)){
                var notfound = true;
                var tmp = null
                for(var pin of pins){
                    if(pin.name == key){
                        notfound = false;
                        tmp = pin;
                    }
                }

                if(notfound){
                    // Remove from nodes
                    delete layout.nodes[key];

                    // Delete element
                    layoutbox.querySelector(`.layout-pin[name="${key}"]`)?.remove();
                }else{
                    if(layoutbox.querySelector(`.layout-pin[name="${tmp.name}"]`) == null){
                        createPinElement(tmp);
                    }
                }
            }

            // Add Nodes
            for(var pin of pins){
                var notfound = true;
                for(var key of Object.keys(layout.nodes)){
                    if(pin.name == key){
                        notfound = false;
                    }
                }

                if(notfound){
                    // Create Node
                    var value = "";
                    if(pin.type == "in"){
                        value += "L";
                    }else{
                        value += "R";
                    }
                    value += "0";

                    layout.nodes[pin.name] = value;

                    // Create Element
                    createPinElement(pin);
                }
            }

            recalculateNodes();

            updating = false;
        }
        function draw(box){
            box.classList.add("layout")

            var headerbox = document.createElement("div");
            var enableInput_box = document.createElement("div");
            var enableInput = document.createElement("input");
            var enableInput_label = document.createElement("label");
            layoutbox = document.createElement("div");
            enableInput_label.innerText = "Enable";
            enableInput_box.append(enableInput);
            enableInput_box.append(enableInput_label);
            enableInput.type = "checkbox";
            enableInput.checked = enabled;
            enableInput.addEventListener("change", handleToggleChange);
            if(!enabled){
                layoutbox.classList.add("disabled");
            }
            headerbox.append(enableInput_box);

            var input_rows = document.createElement("input");
            input_rows.type = "number";
            input_rows.min = 4;
            input_rows.value = layout.rows;
            input_rows.classList.add("layout-rows");
            input_rows.addEventListener("focus", handleEditingStart);
            input_rows.addEventListener("mousedown", handleEditingStart);
            input_rows.addEventListener("keydown", handleEditingStart);
            input_rows.addEventListener("change", handleRowsChange);
            var label_rows = document.createElement("label");
            label_rows.innerText = "Rows";
            var box_rows = document.createElement("div");
            box_rows.append(label_rows);
            box_rows.append(input_rows);
            layoutbox.append(box_rows);

            var input_cols = document.createElement("input");
            input_cols.type = "number";
            input_cols.min = 6;
            input_cols.value = layout.cols;
            input_cols.classList.add("layout-cols");
            input_cols.addEventListener("focus", handleEditingStart);
            input_cols.addEventListener("mousedown", handleEditingStart);
            input_cols.addEventListener("keydown", handleEditingStart);
            input_cols.addEventListener("change", handleColsChange);
            var label_cols = document.createElement("label");
            label_cols.innerText = "Columns";
            var box_cols = document.createElement("div");
            box_cols.append(label_cols);
            box_cols.append(input_cols);
            layoutbox.append(box_cols);

            var box_inputs = document.createElement("div");
            box_inputs.classList.add("layout-inputs");
            var header_inputs = document.createElement("span");
            header_inputs.innerText = "Inputs";
            box_inputs.append(header_inputs);
            layoutbox.append(box_inputs);

            var box_outputs = document.createElement("div");
            box_outputs.classList.add("layout-outputs");
            var header_outputs = document.createElement("span");
            header_outputs.innerText = "Outputs";
            box_outputs.append(header_outputs);
            layoutbox.append(box_outputs);

            box.append(headerbox);
            box.append(layoutbox);

            update();
            interval = setInterval(update, 50);
        }
        function onclose(){
            layouteditor = null;

            if(interval != null){
                clearInterval(interval);
            }

            apply();
        }

        layouteditor = createPanel("Layout", draw, onclose);
    }

    // Misc
    function createPanel(panel_title, draw=null, close=null){
        document.getElementById("panel")?.querySelector(".btn-close")?.dispatchEvent(new Event("click"));

        var panel = document.createElement("div");
        panel.id = "panel";
        
        var titlebox = document.createElement("nav");
        var title = document.createElement("span");
        title.innerText = panel_title;
        titlebox.append(title);

        var btn_close = createCloseButton();
        btn_close.addEventListener("click", (event)=>{
            if(close != null){
                close();
            }
            event.currentTarget.parentElement.parentElement.remove();
            sync();
            render();
        });
        titlebox.append(btn_close);
        panel.append(titlebox);

        var contentbox = document.createElement("div");
        if(draw != null){
            draw(contentbox);
        }
        panel.append(contentbox);

        document.getElementById("box").append(panel);
        sync();
        render();

        return {
            box: contentbox,
            close: function(){
                document.getElementById("panel")?.querySelector(".btn-close")?.dispatchEvent(new Event("click"));
            }
        };
    }

    function help(){
        createPanel("Help", (box)=>{});
    }

    return {
        restore,
        newProject,
        save,
        open,
        importDevices,
        newDevice,
        editLayout,
        help,
    };
})();
