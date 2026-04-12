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
    {type: "7seg"},
    {type: "16seg"},
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

        window.addEventListener("resize", refresh);

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
                circuit.devices = JSON.parse(JSON.stringify(project.circuit.devices));
                circuit.connectors = JSON.parse(JSON.stringify(project.circuit.connectors));
            }else{
                for(var device of project.devices){
                    if(device.name == name){
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
                    circuit.extra.push(JSON.parse(JSON.stringify(device)));

                    circuit.toolbox.push({type: device.name});
                }
            }

            return circuit;
        }

        function importProject(data){
            for(var device of data.devices){
                project.devices.push(device);
            }

            project.devices.push({
                name: data.name,
                circuit: data.circuit,
            });
        }

        function data(value){
            if(value != null){
                project = JSON.parse(JSON.stringify(value));
            }
            return JSON.parse(JSON.stringify(project));
        }

        function saveCircuit(name, data){
            if(project.name == name){
                project.circuit = {
                    devices: data.devices,
                    connectors: data.connectors,
                };
            }else{
                for(var i=0; i<project.devices.length; i++){
                    if(project.devices[i].name == name){
                        project.devices[i].circuit = {
                            devices: data.devices,
                            connectors: data.connectors,
                        };
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
                        var name = node.querySelector(".simcir-dialog-title").innerText;
                        //node.querySelector(".simcir-dialog-close-button").dispatchEvent(new Event('mousedown'));

                        openTab(name);
                    }
                }catch(err){
                    console.error(err);
                }
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
        div.innerHTML = '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="simcir-dialog-close-button" style="float: right;"><rect x="0" y="0" width="16" height="16"></rect><path d=" M 4 4 L 12 12" class="simcir-dialog-close-button-symbol"></path><path d=" M 12 4 L 4 12" class="simcir-dialog-close-button-symbol"></path></svg>';
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


    // Project
    function newProject(){
        closeAllTabs();
        project.flush();
        openTab(project.data().name);
    }
    async function save(){
        sync();
        ask2save(`${project.name}.json`, JSON.stringify(project.data(), null, 4));
    }
    async function open(){
        try{
            var file = await ask4file();
            var tmp = JSON.parse(await file.text());

            if(tmp.engine.name != "simcir"){
                throw "Invalid Engine";
            }

            closeAllTabs();
            project.data(tmp);
            openTab(project.data().name);
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

                if(tmp.engine.name != "simcir"){
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

    // Misc
    function createPanel(panel_title, draw=null, close=null){
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
        render();
    }

    function help(){
        createPanel("Help", (box)=>{
            
        });
    }

    return {
        newProject,
        save,
        open,
        importDevices,
        newDevice,
        help,
    };
})();
