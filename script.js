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
            }

            simcir.setupSimcir(placeholder, data);
        }

        function close(){
            simcir.clearSimcir(placeholder);
        }

        function data(){
            var ws = simcir.$(element.querySelector(".simcir-workspace"));

            return simcir.controller(ws).data();
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

    async function ask4file(){
        return new Promise((resolve)=>{
            var input = document.createElement("input");
            input.type = "file";
            input.multiple = false;
            input.accept = "application/json";

            input.addEventListener("change", async (event)=>{
                resolve({
                    name: input.files[0].name,
                    data: JSON.parse(await input.files[0].text()),
                });
            });

            input.click();
            input.remove();
        });
    }

    function flush(){
        editbox.open({});
    }
    async function save(){
        var blob = new Blob([JSON.stringify(editbox.data(), null, 4)], {
            type: "application/json",
        });

        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "untitled.json";
        a.click();
        a.remove();
    }
    async function open(){
        var result = await ask4file();

        editbox.open(result.data);
    }
    async function importDevice(){
        var result = await ask4file();

        editbox.register(result.name.replace(/\..*?$/, ""), result.data);
        editbox.refresh();
    }

    return {
        flush,
        save,
        open,
        importDevice,
    };
})();

editor.flush();
